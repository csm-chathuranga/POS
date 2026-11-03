import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getApiUrl } from '../../config/runtimeConfig';

const API = getApiUrl();
const f = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = s => new Date(s).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });

export default function PublicInvoice() {
  const { invoice_no } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    fetch(`${API}/api/public/invoice/${encodeURIComponent(invoice_no)}`)
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error || 'Not found')))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [invoice_no]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm animate-pulse">Loading invoice…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">❌</div>
        <p className="text-slate-700 font-semibold">{error}</p>
        <p className="text-slate-400 text-sm mt-1">Invoice not found or unavailable.</p>
      </div>
    </div>
  );

  const { shop, items = [], payments = [] } = data;
  const paidCash   = payments.filter(p => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidCard   = payments.filter(p => p.method === 'card').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidCredit = payments.filter(p => p.method === 'credit').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const change     = Math.max(0, parseFloat(data.paid || 0) - parseFloat(data.total || 0));

  return (
    <div className="min-h-screen bg-slate-100 flex items-start justify-center py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-8 py-7" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {/* Shop header */}
          <div className="text-center mb-5">
            {shop.logo ? (
              <img src={shop.logo} alt="logo" className="w-20 h-20 object-contain mx-auto mb-3 rounded-full" />
            ) : (
              <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center text-slate-400 text-3xl font-black">
                {(shop.name || 'S')[0]}
              </div>
            )}
            <p className="font-black text-slate-800 text-xl tracking-wide uppercase">{shop.name || 'LMUC POS'}</p>
            {shop.address && <p className="text-slate-500 text-sm mt-0.5">{shop.address}</p>}
            {shop.phone   && <p className="text-slate-500 text-sm">{shop.phone}</p>}
          </div>

          <hr className="border-slate-200 mb-4" />

          {/* Invoice meta */}
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm"><span className="text-slate-500 font-semibold">Invoice</span><span className="font-bold text-slate-800 font-mono">{data.invoice_no}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500 font-semibold">Date</span><span className="font-bold text-slate-800">{fmtDate(data.created_at)} {fmtTime(data.created_at)}</span></div>
            {data.customer_name && <div className="flex justify-between text-sm"><span className="text-slate-500 font-semibold">Customer</span><span className="font-bold text-slate-800">{data.customer_name}</span></div>}
          </div>

          <hr className="border-slate-200 mb-4" />

          {/* Items */}
          <div className="mb-4 space-y-2">
            {items.map((item, i) => {
              const qty  = Number(item.qty || 0);
              const unit = parseFloat(item.unit_price || 0);
              const disc = parseFloat(item.discount || 0);
              const line = Math.max(0, qty * unit - disc);
              return (
                <div key={i}>
                  <p className="text-sm font-bold text-slate-800">{i + 1}. {item.product_name}</p>
                  <div className="flex justify-between text-xs text-slate-500 pl-3 mt-0.5">
                    <span>{qty} × Rs.{f(unit)}{disc > 0 ? ` − Rs.${f(disc)}` : ''}</span>
                    <span className="font-bold text-slate-700">Rs.{f(line)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <hr className="border-slate-200 mb-4" />

          {/* Totals */}
          <div className="space-y-1.5">
            {parseFloat(data.discount) > 0 && (
              <div className="flex justify-between text-sm"><span className="text-slate-500 font-semibold">Discount</span><span className="font-bold text-red-500">− Rs.{f(data.discount)}</span></div>
            )}
            <div className="flex justify-between items-baseline">
              <span className="font-black text-slate-800">Total</span>
              <span className="text-xl font-black text-slate-800">Rs. {f(data.total)}</span>
            </div>
            {paidCash > 0   && <div className="flex justify-between text-sm"><span className="text-slate-500">Cash paid</span><span className="font-semibold">Rs.{f(paidCash)}</span></div>}
            {paidCard > 0   && <div className="flex justify-between text-sm"><span className="text-slate-500">Card paid</span><span className="font-semibold">Rs.{f(paidCard)}</span></div>}
            {paidCredit > 0 && <div className="flex justify-between text-sm text-orange-600"><span className="font-semibold">Credit</span><span className="font-bold">Rs.{f(paidCredit)}</span></div>}
            {change > 0     && <div className="flex justify-between text-sm text-blue-600"><span className="font-semibold">Change</span><span className="font-bold">Rs.{f(change)}</span></div>}
            {parseFloat(data.balance) > 0 && (
              <div className="flex justify-between text-sm text-red-600 font-bold"><span>Balance due</span><span>Rs.{f(data.balance)}</span></div>
            )}
          </div>

          <hr className="border-slate-200 my-5" />

          <div className="text-center">
            <p className="text-sm text-slate-500 font-medium">{shop.footer}</p>
            <p className="text-xs text-slate-300 mt-2">Powered by lumac.lk</p>
          </div>
        </div>

        <div className="px-8 pb-6">
          <button onClick={() => window.print()}
            className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors">
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
