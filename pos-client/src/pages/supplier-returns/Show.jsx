import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';
import { useGetSupplierReturnQuery, useDeleteSupplierReturnMutation } from '../../features/supplierReturns/supplierReturnsApi';

const fmt     = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtNum  = n => { const v = Number(n || 0); return v % 1 === 0 ? v.toLocaleString('en-LK') : v.toLocaleString('en-LK', { minimumFractionDigits: 3 }); };
const fmtDate = s => { const d = new Date(s); return isNaN(d) ? '—' : d.toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }); };

const TYPE_BADGE = {
  damaged: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
  other:   'bg-slate-100 text-slate-600',
};

export default function SupplierReturnShow() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const role     = useSelector(selectRole);
  const canDelete = role === 'admin' || role === 'manager';

  const { data: ret, isLoading } = useGetSupplierReturnQuery(id);
  const [deleteSRN, { isLoading: deleting }] = useDeleteSupplierReturnMutation();

  async function handleDelete() {
    if (!window.confirm(`Delete ${ret.srn_no}? Stock will be restored.`)) return;
    try {
      await deleteSRN(id).unwrap();
      navigate('/supplier-returns');
    } catch (err) {
      alert(err?.data?.error || 'Delete failed');
    }
  }

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (!ret)      return <div className="p-8 text-center text-slate-400">Supplier return not found.</div>;

  const items = ret.items || [];

  return (
    <div className="p-3 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/supplier-returns')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{ret.srn_no}</h1>
          <p className="text-sm text-slate-400">{fmtDate(ret.created_at)}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${TYPE_BADGE[ret.return_type] || TYPE_BADGE.other}`}>
            {ret.return_type}
          </span>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Supplier',    value: ret.supplier?.name || '—' },
          { label: 'Created By',  value: ret.user?.name || '—' },
          { label: 'Return Type', value: <span className="capitalize">{ret.return_type}</span> },
          { label: 'Notes',       value: ret.notes || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-semibold text-slate-700">{value}</p>
          </div>
        ))}
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-700 text-sm">Returned Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-xs text-white uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">#</th>
                <th className="px-5 py-3 text-left font-semibold">Product</th>
                <th className="px-5 py-3 text-right font-semibold">Qty</th>
                <th className="px-5 py-3 text-right font-semibold">Cost Price</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item, i) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{item.product_name}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{fmtNum(item.qty)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{fmt(item.cost_price)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmt(item.total)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No items.</td></tr>
              )}
              {items.length > 0 && (
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
                  <td colSpan={2} className="px-5 py-3 text-right text-xs uppercase tracking-wide text-slate-500">Totals</td>
                  <td className="px-5 py-3 text-right">{fmtNum(items.reduce((s, i) => s + parseFloat(i.qty || 0), 0))}</td>
                  <td className="px-5 py-3"/>
                  <td className="px-5 py-3 text-right">{fmt(items.reduce((s, i) => s + parseFloat(i.total || 0), 0))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 ml-auto max-w-xs w-full">
        <div className="flex justify-between font-bold text-slate-800 text-base">
          <span>Grand Total</span>
          <span>{fmt(ret.total)}</span>
        </div>
      </div>
    </div>
  );
}
