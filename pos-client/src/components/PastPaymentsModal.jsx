import { useState } from 'react';

const fmt     = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => s ? new Date(s).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const PAGE_SIZE = 25;

/**
 * Generic past-payments modal.
 * Props:
 *   title        — modal heading
 *   subtitle     — modal subtitle
 *   nameLabel    — column header for the entity name ("Supplier" / "Customer")
 *   amountColor  — Tailwind class for amount cell ("text-green-600" / "text-blue-600")
 *   useQuery     — RTK Query hook: (params) => { data, isLoading, isFetching }
 *   onClose
 */
export default function PastPaymentsModal({ title, subtitle, nameLabel, amountColor = 'text-green-600', useQuery, onClose }) {
  const [search, setSearch]   = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage]       = useState(1);

  const { data, isLoading, isFetching } = useQuery({ search: applied, page, limit: PAGE_SIZE });

  const rows     = data?.data || [];
  const total    = data?.total || 0;
  const lastPage = data?.last_page || 1;

  function handleSearch(e) {
    e.preventDefault();
    setApplied(search);
    setPage(1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full h-full max-w-5xl max-h-[95vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose}
            className="ml-4 text-slate-400 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-100 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch}
          className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center shrink-0 bg-slate-50">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${nameLabel.toLowerCase()} name or phone…`}
            className="flex-1 min-w-[200px] rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            Search
          </button>
          {applied && (
            <button type="button"
              onClick={() => { setSearch(''); setApplied(''); setPage(1); }}
              className="px-4 py-2.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-white transition-colors">
              Clear
            </button>
          )}
          <span className="ml-auto text-sm text-slate-500 shrink-0">
            {total} record{total !== 1 ? 's' : ''}
          </span>
        </form>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No payment records found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10" style={{ background: '#1e3a5f' }}>
                <tr className="text-white text-xs uppercase tracking-wider">
                  <th className="px-5 py-4 text-left font-semibold w-44">Date</th>
                  <th className="px-5 py-4 text-left font-semibold w-44">Ref No</th>
                  <th className="px-5 py-4 text-left font-semibold">{nameLabel}</th>
                  <th className="px-5 py-4 text-right font-semibold w-36">Amount</th>
                  <th className="px-5 py-4 text-left font-semibold">Note</th>
                  <th className="px-5 py-4 text-left font-semibold w-32">Recorded By</th>
                </tr>
              </thead>
              <tbody className={isFetching ? 'opacity-50 pointer-events-none' : ''}>
                {rows.map((p, i) => {
                  const name  = p.supplier_name  ?? p.customer_name  ?? '—';
                  const phone = p.supplier_phone ?? p.customer_phone ?? '';
                  return (
                    <tr key={p.id}
                      className={`border-b border-slate-100 transition-colors hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                      <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(p.created_at)}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{p.ref_no || p.invoice_no || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-800">{name}</span>
                        {phone && <span className="block text-xs text-slate-400">{phone}</span>}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-bold ${amountColor}`}>Rs. {fmt(p.amount)}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{p.note || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{p.recorded_by}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <span className="text-sm text-slate-500">
            {total > 0 ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : ''}
          </span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">
              ‹ Prev
            </button>
            <span className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg min-w-[90px] text-center">
              {lastPage > 0 ? `${page} / ${lastPage}` : '—'}
            </span>
            <button disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">
              Next ›
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
