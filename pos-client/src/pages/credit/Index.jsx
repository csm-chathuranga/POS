import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCustomersQuery } from '../../features/customers/customersApi';

const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

export default function CreditIndex() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetCustomersQuery({ search: applied, page });

  const rows = (data?.data || []).filter(c => parseFloat(c.credit_balance) > 0);
  const totalOutstanding = rows.reduce((s, c) => s + parseFloat(c.credit_balance || 0), 0);

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Credit</h1>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <p className="text-xs text-slate-500 mb-1">Total Outstanding</p>
        <p className="text-3xl font-bold text-red-600">Rs. {fmt(totalOutstanding)}</p>
        <p className="text-xs text-slate-400 mt-1">{rows.length} customer{rows.length !== 1 ? 's' : ''} with unpaid credit</p>
      </div>

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); setApplied(search); setPage(1); }}
        className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name / phone…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-200 border-b border-slate-300 text-xs text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-right font-semibold">Credit Limit</th>
                  <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                  <th className="px-4 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No outstanding credit balances.</td></tr>
                )}
                {rows.map(c => (
                  <tr key={c.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-slate-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmt(c.credit_limit)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">Rs. {fmt(c.credit_balance)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`/customers/${c.id}/credit`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{data.total} total</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">‹</button>
              <span className="px-2 py-1">{page} / {data.last_page}</span>
              <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
