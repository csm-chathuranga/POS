import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';
import { useGetSupplierReturnsQuery, useDeleteSupplierReturnMutation } from '../../features/supplierReturns/supplierReturnsApi';

const fmt     = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => { const d = new Date(s); return isNaN(d) ? '—' : d.toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }); };

const TYPE_BADGE = {
  damaged:  'bg-red-100 text-red-700',
  expired:  'bg-orange-100 text-orange-700',
  other:    'bg-slate-100 text-slate-600',
};

export default function SupplierReturnsIndex() {
  const navigate  = useNavigate();
  const role      = useSelector(selectRole);
  const canDelete = role === 'admin' || role === 'manager';

  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [q,      setQ]      = useState('');

  const { data, isLoading } = useGetSupplierReturnsQuery({ page, search: q });
  const [deleteSRN, { isLoading: deleting }] = useDeleteSupplierReturnMutation();

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setQ(search);
  }

  async function handleDelete(id, srn_no) {
    if (!window.confirm(`Delete ${srn_no}? Stock will be restored.`)) return;
    try {
      await deleteSRN(id).unwrap();
    } catch (err) {
      alert(err?.data?.error || 'Delete failed');
    }
  }

  const rows      = data?.data || [];
  const lastPage  = data?.last_page || 1;

  return (
    <div className="p-3 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Supplier Returns</h1>
          <p className="text-sm text-slate-400">Damaged &amp; expired stock returned to suppliers</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search SRN or supplier…"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 w-52"
            />
            <button type="submit" className="px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800">
              Search
            </button>
          </form>
          <button
            onClick={() => navigate('/supplier-returns/create')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            New Return
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-xs text-white uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">SRN No</th>
                <th className="px-5 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-left font-semibold">Supplier</th>
                <th className="px-5 py-3 text-left font-semibold">Type</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
                <th className="px-5 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No supplier returns found.</td></tr>
              )}
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-blue-600">{row.srn_no}</td>
                  <td className="px-5 py-3 text-slate-500">{fmtDate(row.created_at)}</td>
                  <td className="px-5 py-3 text-slate-700">{row.supplier?.name || <span className="text-slate-400">—</span>}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${TYPE_BADGE[row.return_type] || TYPE_BADGE.other}`}>
                      {row.return_type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmt(row.total)}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate(`/supplier-returns/${row.id}`)}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        View
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(row.id, row.srn_no)}
                          disabled={deleting}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">Page {page} of {lastPage}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
