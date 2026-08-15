/**
 * DailyConnectionGate — blocks the app if more than 24 h have passed since
 * the last successful syncAll(). Uses IndexedDB (Dexie) via lastSyncAge()
 * so it works identically in both Electron and the browser.
 *
 * Polls every 5 s while blocked so AppLayout's auto-sync can unblock it
 * without the user pressing anything.
 */
import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectToken, logout } from '../features/auth/authSlice';
import { lastSyncAge, syncAll, syncOfflineQueue } from '../services/cacheSync';
import { useConnectivity } from '../contexts/ConnectivityContext';

const GATE_MS   = 24 * 60 * 60 * 1_000; // 24 h
const POLL_MS   = 5_000;

export default function DailyConnectionGate({ children }) {
  const token                   = useSelector(selectToken);
  const dispatch                = useDispatch();
  const [blocked, setBlocked]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [error, setError]       = useState('');
  const { isOnline }            = useConnectivity();
  const pollRef                 = useRef(null);

  async function checkGate() {
    try {
      const age = await lastSyncAge();          // ms since last syncAll, or null
      setBlocked(age === null || age > GATE_MS);
    } catch {
      setBlocked(false);                        // if Dexie fails, don't block
    }
    setChecking(false);
  }

  useEffect(() => { checkGate(); }, []);

  // Poll while blocked so the auto-sync in AppLayout can unblock us
  useEffect(() => {
    if (!blocked) { clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(checkGate, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [blocked]);

  async function handleConnect() {
    if (!isOnline) {
      setError('No internet connection. Please connect and try again.');
      return;
    }
    setError('');
    setSyncing(true);
    try {
      await syncOfflineQueue();
      const result = await syncAll();
      if (result.ok) {
        setBlocked(false);
      } else {
        // 401 = expired/invalid token → log out so the login page handles re-auth
        if (result.error?.includes('401')) {
          dispatch(logout());
          return;
        }
        setError('Sync failed: ' + result.error);
      }
    } catch (e) {
      if (e.message?.includes('401')) { dispatch(logout()); return; }
      setError('Connection failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }

  if (!token) return children;   // not logged in — let login page handle it
  if (checking) return null;
  if (!blocked) return children;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/95 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

        <div className="bg-gradient-to-br from-red-500 to-orange-500 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Daily Connection Required</h2>
          <p className="text-red-100 text-sm mt-2 leading-relaxed">
            Connect to the internet once a day to keep your data in sync.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <span className={isOnline ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
              {isOnline ? 'Connected to internet' : 'No internet connection'}
            </span>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleConnect}
            disabled={syncing || !isOnline}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm
              hover:bg-blue-700 active:bg-blue-800
              disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
              transition-colors flex items-center justify-center gap-2"
          >
            {syncing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Syncing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Connect Now
              </>
            )}
          </button>

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Your offline sales are safely stored and will sync automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
