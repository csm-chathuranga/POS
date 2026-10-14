import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetJournalQuery } from '../../features/accounting/accountingApi';

const fmt     = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Journal() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetJournalQuery({ page, limit: 20 });
  const { total = 0, data: entries = [] } = data || {};
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Journal</h1>
        <Link to="/accounting/journal/create"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New Entry
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Ref No</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-right font-semibold">Total Dr</th>
                <th className="px-4 py-3 text-left font-semibold">By</th>
                <th className="px-4 py-3 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No journal entries yet.</td></tr>
              )}
              {entries.map(e => {
                const totalDr = e.lines?.reduce((s, l) => s + parseFloat(l.debit || 0), 0) ?? 0;
                return (
                  <tr key={e.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.ref_no}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{e.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{fmt(totalDr)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{e.user?.name || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/accounting/journal/${e.id}`}
                        className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{total} entries</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium disabled:opacity-40 hover:bg-slate-50">
              Prev
            </button>
            <span className="text-xs">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium disabled:opacity-40 hover:bg-slate-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
