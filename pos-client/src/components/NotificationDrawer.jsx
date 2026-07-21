import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectToken } from '../features/auth/authSlice';

const API = import.meta.env.VITE_API_URL;

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)       return 'just now';
  if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmt(n) {
  return parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function NotificationDrawer({ open, onClose }) {
  const token    = useSelector(selectToken);
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const lowStock   = data?.lowStock   ?? [];
  const recentSales = data?.recentSales ?? [];
  const totalBadge = lowStock.length;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 text-base">Notifications</h2>
            {totalBadge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {totalBadge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} title="Refresh"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            <button onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && !data ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
          ) : (
            <>
              {/* ── Low Stock Alerts ─────────────────────────────────────── */}
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Low Stock Alerts
                  {lowStock.length > 0 && (
                    <span className="ml-auto text-red-500 font-bold">{lowStock.length}</span>
                  )}
                </p>
              </div>

              {lowStock.length === 0 ? (
                <div className="px-5 py-3 text-sm text-slate-400 italic">All items well stocked</div>
              ) : (
                <div className="px-3 space-y-1 pb-2">
                  {lowStock.map(p => (
                    <button key={p.id} onClick={() => { navigate('/products'); onClose(); }}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left group">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-red-700">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Stock: <span className="font-bold text-red-500">{parseFloat(p.stock_qty)}</span>
                          <span className="mx-1">·</span>
                          Alert: {parseFloat(p.alert_qty)} {p.unit}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Recent Sales ─────────────────────────────────────────── */}
              <div className="px-5 pt-3 pb-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Recent Sales
                </p>
              </div>

              {recentSales.length === 0 ? (
                <div className="px-5 py-3 text-sm text-slate-400 italic">No recent sales</div>
              ) : (
                <div className="px-3 space-y-1 pb-4">
                  {recentSales.map(s => (
                    <button key={s.id} onClick={() => { navigate(`/sales/${s.id}`); onClose(); }}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 truncate">
                            {s.invoice_no}
                          </p>
                          <p className="text-xs font-bold text-green-600 shrink-0">Rs. {fmt(s.total)}</p>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.user_name} · {timeAgo(s.created_at)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 shrink-0">
          <button onClick={() => { navigate('/sales'); onClose(); }}
            className="w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors py-1">
            View all sales →
          </button>
        </div>
      </div>
    </>
  );
}

export function useNotifBadge(token) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setCount(d?.lowStock?.length ?? 0))
      .catch(() => {});
  }, [token]);

  return count;
}
