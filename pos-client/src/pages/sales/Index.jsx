import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetSalesQuery, useDeleteSaleMutation } from '../../features/sales/salesApi';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';

export default function SalesIndex() {
  const role = useSelector(selectRole);
  const canDelete = role === 'admin';

  const [search, setSearch] = useState('');
  const [date, setDate]     = useState('');
  const [page, setPage]     = useState(1);
  const [applied, setApplied] = useState({});

  const { data, isLoading } = useGetSalesQuery({ ...applied, page });
  const [deleteSale] = useDeleteSaleMutation();

  function handleSearch(e) {
    e.preventDefault();
    setApplied({ search, date });
    setPage(1);
  }

  async function handleDelete(id, inv) {
    if (!window.confirm(`Delete sale ${inv}?`)) return;
    await deleteSale(id);
  }

  const fmt = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const fmtDate = s => new Date(s).toLocaleDateString('en-LK');
  const fmtTime = s => new Date(s).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });

  const statusBadge = status => {
    const cls = { completed: 'bg-green-100 text-green-700', held: 'bg-yellow-100 text-yellow-700', returned: 'bg-red-100 text-red-700' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${cls[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
  };

  const payMethod = payments => {
    if (!payments?.length) return '—';
    const methods = [...new Set(payments.map(p => p.method))].join(', ');
    return <span className="capitalize">{methods}</span>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Sales</h1>
        <Link to="/sales/create" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          + New Bill
        </Link>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice No.</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="INV-0001"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors">
          Filter
        </button>
        {Object.values(applied).some(Boolean) && (
          <button type="button" onClick={() => { setApplied({}); setSearch(''); setDate(''); setPage(1); }}
            className="px-4 py-2 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                <th className="px-4 py-3 text-left font-semibold">Date / Time</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Cashier</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-center font-semibold">Payment</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.data || []).map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-blue-600 font-semibold">{s.invoice_no}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <p>{fmtDate(s.created_at)}</p>
                    <p className="text-xs text-slate-400">{fmtTime(s.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.customer?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.user?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(s.total)}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{payMethod(s.payments)}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(s.status)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                    <Link to={`/sales/${s.id}`} className="text-blue-600 hover:text-blue-800 font-medium">View</Link>
                    {canDelete && (
                      <button onClick={() => handleDelete(s.id, s.invoice_no)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
              {!(data?.data?.length) && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No sales found</td></tr>
              )}
            </tbody>
          </table>
        )}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{data.total} sales</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Prev</button>
              <span className="px-2 py-1">{page} / {data.last_page}</span>
              <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
