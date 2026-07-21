import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetPurchasesQuery, useDeletePurchaseMutation } from '../../features/purchases/purchasesApi';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';

export default function PurchasesIndex() {
  const role = useSelector(selectRole);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetPurchasesQuery({ page });
  const [del] = useDeletePurchaseMutation();

  const fmt = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const fmtDate = s => new Date(s).toLocaleDateString('en-LK');

  async function handleDelete(p) {
    if (!window.confirm(`Delete GRN ${p.grn_no}?`)) return;
    await del(p.id);
  }

  const statusBadge = s => {
    const cls = { received: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', partial: 'bg-blue-100 text-blue-700' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${cls[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Purchases</h1>
        <Link to="/purchases/create" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          + New Purchase
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">GRN No.</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                <th className="px-4 py-3 text-left font-semibold">By</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Paid</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                {role === 'admin' && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.data || []).map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{p.grn_no}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(p.purchase_date)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.supplier?.name || 'Direct'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.user?.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(p.total)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(p.paid)}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(p.status)}</td>
                  {role === 'admin' && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(p)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {!(data?.data?.length) && (
                <tr><td colSpan={role === 'admin' ? 8 : 7} className="px-4 py-8 text-center text-slate-400">No purchases yet</td></tr>
              )}
            </tbody>
          </table>
        )}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{data.total} purchases</span>
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
