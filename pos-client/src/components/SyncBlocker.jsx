import { useConnectivity } from '../contexts/ConnectivityContext';
import { OFFLINE_LIMIT } from '../services/offlineQueue';

export default function SyncBlocker({ pendingCount, onSync, syncing }) {
  const { isOnline } = useConnectivity();

  if (pendingCount < OFFLINE_LIMIT) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">Sync Required</h2>
        <p className="text-slate-600 mb-1">
          You have{' '}
          <span className="font-bold text-red-600">{pendingCount}</span>{' '}
          unsynced {pendingCount === 1 ? 'invoice' : 'invoices'}.
        </p>
        <p className="text-sm text-slate-500 mb-6">
          {isOnline
            ? 'Please sync with the server to continue creating sales.'
            : 'Please connect to the internet to sync and continue.'}
        </p>

        {isOnline ? (
          <button
            onClick={onSync}
            disabled={syncing}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
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
              'Sync Now'
            )}
          </button>
        ) : (
          <div className="w-full py-3 bg-slate-100 text-slate-500 font-medium rounded-xl text-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Waiting for internet connection…
          </div>
        )}
      </div>
    </div>
  );
}
