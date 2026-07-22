import { useParams, useNavigate } from 'react-router-dom';
import { useGetPurchaseQuery } from '../../features/purchases/purchasesApi';
import { useLocale } from '../../contexts/LocaleContext';

const fmt     = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtNum  = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

const statusBadge = s => {
  const cls = {
    received: 'bg-green-100 text-green-700',
    pending:  'bg-yellow-100 text-yellow-700',
    partial:  'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${cls[s] || 'bg-slate-100 text-slate-600'}`}>
      {s}
    </span>
  );
};

export default function PurchaseShow() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { t }    = useLocale();
  const { data: purchase, isLoading } = useGetPurchaseQuery(id);

  if (isLoading) return <div className="p-8 text-center text-slate-400">{t('lbl.loading')}</div>;
  if (!purchase) return <div className="p-8 text-center text-slate-400">{t('pur.grn')} not found</div>;

  const items    = purchase.items || [];
  const balance  = parseFloat(purchase.total || 0) - parseFloat(purchase.paid || 0);

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/purchases')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{purchase.grn_no}</h1>
          <p className="text-sm text-slate-400">{fmtDate(purchase.purchase_date)}</p>
        </div>
        <div className="ml-auto">{statusBadge(purchase.status)}</div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('pur.supplier'),  value: purchase.supplier?.name || t('lbl.all') },
          { label: t('lbl.cashier'),   value: purchase.user?.name || '—' },
          { label: t('th.invoice'),    value: purchase.invoice_no || '—' },
          { label: t('th.date'),       value: fmtDate(purchase.purchase_date) },
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
          <h2 className="font-bold text-slate-700 text-sm">{t('pur.items_title')}</h2>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3 text-left font-semibold">#</th>
              <th className="px-5 py-3 text-left font-semibold">{t('th.product')}</th>
              <th className="px-5 py-3 text-right font-semibold">{t('th.qty')}</th>
              <th className="px-5 py-3 text-right font-semibold">{t('pur.unit_price')}</th>
              <th className="px-5 py-3 text-right font-semibold">{t('th.total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, i) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{item.product_name}</td>
                <td className="px-5 py-3 text-right text-slate-600">{fmtNum(item.qty)}</td>
                <td className="px-5 py-3 text-right text-slate-600">{fmt(item.unit_cost)}</td>
                <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmt(item.total)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">{t('lbl.no_data')}</td></tr>
            )}
          </tbody>
        </table></div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 ml-auto max-w-xs w-full space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>{t('lbl.subtotal')}</span>
          <span>{fmt(purchase.subtotal ?? purchase.total)}</span>
        </div>
        {parseFloat(purchase.discount || 0) > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>{t('lbl.discount')}</span>
            <span>- {fmt(purchase.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-slate-800 text-base border-t border-slate-100 pt-2">
          <span>{t('lbl.grand_total')}</span>
          <span>{fmt(purchase.total)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>{t('th.paid')}</span>
          <span>{fmt(purchase.paid)}</span>
        </div>
        {balance > 0.005 && (
          <div className="flex justify-between text-sm font-semibold text-red-500">
            <span>{t('lbl.balance')}</span>
            <span>{fmt(balance)}</span>
          </div>
        )}
        {purchase.notes && (
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">{purchase.notes}</p>
        )}
      </div>
    </div>
  );
}
