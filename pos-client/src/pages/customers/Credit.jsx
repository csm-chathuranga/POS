import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetCreditHistoryQuery, useSettleCreditMutation } from '../../features/customers/customersApi';
import { getApiUrl } from '../../config/runtimeConfig';

const API = getApiUrl();

const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function printPaymentReceipt({ customer, payment, balanceBefore, shopInfo = {} }) {
  const balanceAfter = Math.max(0, balanceBefore - parseFloat(payment.amount || 0));
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { font-family:'Courier New',Courier,monospace; font-size:13px; font-weight:900; width:72mm; max-width:72mm; color:#000; word-break:break-word; }
    body { padding:5mm 4mm; }
    .logo { width:72px; height:72px; object-fit:contain; margin:0 auto 6px; display:block; border-radius:50%; }
    .shop-name { font-size:15px; font-weight:900; text-align:center; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px; }
    .shop-meta { font-size:11px; font-weight:900; text-align:center; line-height:1.6; }
    .title { font-size:13px; font-weight:900; text-align:center; text-transform:uppercase; letter-spacing:0.08em; margin:6px 0 4px; }
    .divider { border:none; border-top:2px solid #000; margin:8px 0; }
    .dashed { border:none; border-top:1px dashed #000; margin:6px 0; }
    .row { display:flex; justify-content:space-between; gap:6px; padding:2px 0; font-size:12px; }
    .row .label { font-weight:900; flex-shrink:0; }
    .row .value { font-weight:900; text-align:right; min-width:0; word-break:break-word; }
    .total-row { display:flex; justify-content:space-between; gap:6px; font-weight:900; font-size:15px; padding:6px 0 4px; border-top:2px solid #000; margin-top:4px; }
    .balance-row { display:flex; justify-content:space-between; gap:6px; padding:2px 0; font-size:12px; font-weight:900; }
    .footer { text-align:center; margin-top:10px; font-size:11px; font-weight:900; line-height:1.8; }
    @media print {
      html, body { overflow:visible !important; height:auto !important; }
      @page { margin:0; size:72mm auto; }
      body { padding:3mm 4mm; width:72mm !important; }
    }
  </style>
</head>
<body>
  ${shopInfo.shop_logo ? `<img class="logo" src="${shopInfo.shop_logo}" alt="logo">` : ''}
  <div class="shop-name">${shopInfo.shop_name || 'LMUC POS'}</div>
  <div class="shop-meta">
    ${shopInfo.address ? shopInfo.address + '<br>' : ''}
    ${shopInfo.phone || ''}
  </div>
  <div class="title">Payment Receipt</div>
  <hr class="divider">
  <div class="row"><span class="label">Customer</span><span class="value">${customer?.name || '—'}</span></div>
  <div class="row"><span class="label">Date</span><span class="value">${fmtDate(payment.created_at || new Date().toISOString())}</span></div>
  ${payment.ref_no ? `<div class="row"><span class="label">Ref No</span><span class="value">${payment.ref_no}</span></div>` : ''}
  ${payment.note ? `<div class="row"><span class="label">Note</span><span class="value">${payment.note}</span></div>` : ''}
  <hr class="dashed">
  <div class="total-row"><span>Amount Paid</span><span>Rs. ${fmt(payment.amount)}</span></div>
  <div class="balance-row"><span>Outstanding</span><span>Rs. ${fmt(balanceAfter)}</span></div>
  <hr class="divider">
  <div class="footer">
    ${shopInfo.receipt_footer || 'Thank you!'}
    <br>lumac.lk
  </div>
</body>
</html>`;

  if (window.electronAPI?.printReceiptHtml) {
    window.electronAPI.printReceiptHtml(html, { paperSize: '72mm' });
  } else {
    const win = window.open('', '_blank', 'width=380,height=500,scrollbars=yes');
    if (win) { win.document.write(html); win.document.close(); win.onload = () => win.print(); }
  }
}

export default function CustomerCredit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetCreditHistoryQuery(id);
  const [settle, { isLoading: settling }] = useSettleCreditMutation();

  const [modal, setModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('payments');
  const [shopInfo, setShopInfo] = useState({});
  const shouldPrintRef = useRef(false);

  useEffect(() => {
    fetch(`${API}/api/settings/public`)
      .then(r => r.json())
      .then(setShopInfo)
      .catch(() => {});
  }, []);

  async function handleSettle(e, withPrint = false) {
    e.preventDefault();
    setErr('');
    shouldPrintRef.current = withPrint;
    const amountVal       = parseFloat(amount);
    const noteVal         = note;
    const balanceSnapshot = balance;
    try {
      const payment = await settle({ id, amount: amountVal, note: noteVal }).unwrap();
      setModal(false);
      setAmount('');
      setNote('');
      refetch();
      if (shouldPrintRef.current) {
        printPaymentReceipt({
          customer,
          payment: { ...payment, amount: amountVal, note: noteVal },
          balanceBefore: balanceSnapshot,
          shopInfo,
        });
      }
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
  }

  if (isLoading) return (
    <div className="p-6 flex items-center justify-center text-slate-400 text-sm h-64">Loading…</div>
  );

  const { customer, payments, sales } = data || {};
  const balance  = parseFloat(customer?.credit_balance || 0);
  const limit    = parseFloat(customer?.credit_limit || 0);
  const usedPct  = limit > 0 ? Math.min(100, (balance / limit) * 100) : 0;

  return (
    <div className="p-3 sm:p-6 space-y-5">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{customer?.name}</h1>
          {customer?.phone && <p className="text-xs text-slate-400 mt-0.5">{customer.phone}</p>}
        </div>
      </div>

      {/* ── Summary banner ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg shadow-red-500/20 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-red-100 text-xs font-medium mb-1">Outstanding Balance</p>
              <p className="text-4xl font-extrabold tracking-tight">Rs. {fmt(balance)}</p>
            </div>
            {balance > 0 && (
              <button onClick={() => { setModal(true); setErr(''); setAmount(''); setNote(''); }}
                className="shrink-0 flex items-center gap-1.5 bg-white text-red-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-red-50 transition-colors shadow">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
                Record Payment
              </button>
            )}
          </div>
          {limit > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-red-100 mb-1.5">
                <span>Credit used {Math.round(usedPct)}%</span>
                <span>Limit: Rs. {fmt(limit)}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${usedPct}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex-1">
            <p className="text-xs text-slate-400 mb-1">Total Repaid</p>
            <p className="text-xl font-bold text-green-600">
              Rs. {fmt(payments?.reduce((s, p) => { const a = parseFloat(p.amount); return s + (a > 0 ? a : 0); }, 0) || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{payments?.length || 0} payment{payments?.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex-1">
            <p className="text-xs text-slate-400 mb-1">Credit Sales</p>
            <p className="text-xl font-bold text-slate-700">
              Rs. {fmt(sales?.reduce((s, sale) => s + parseFloat(sale.credit_amount), 0) || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{sales?.length || 0} sale{sales?.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[['payments', 'Repayments', payments?.length], ['sales', 'Credit Sales', sales?.length]].map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {label}
            {count > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                tab === key ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Repayments ── */}
      {tab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {!payments?.length ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
                </svg>
              </div>
              <p className="text-sm text-slate-400 font-medium">No repayments recorded yet</p>
              {balance > 0 && <p className="text-xs text-slate-300 mt-1">Use "Record Payment" to add one</p>}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Receipt No</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Type</th>
                  <th className="px-5 py-3 text-right font-semibold">Debit</th>
                  <th className="px-5 py-3 text-right font-semibold">Credit</th>
                  <th className="px-5 py-3 text-left font-semibold">Note</th>
                  <th className="px-5 py-3 text-left font-semibold">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.map(p => {
                  const amt     = parseFloat(p.amount);
                  const isDebit = amt < 0;
                  const absAmt  = Math.abs(amt);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{p.invoice_no || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{fmtDate(p.created_at)}</td>
                      <td className="px-5 py-3.5">
                        {isDebit
                          ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">Debit</span>
                          : <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Credit</span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-red-500">
                        {isDebit ? `Rs. ${fmt(absAmt)}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-green-600">
                        {!isDebit ? `Rs. ${fmt(absAmt)}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{p.note || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{p.recorded_by}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Credit Sales ── */}
      {tab === 'sales' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {!sales?.length ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth={2}/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 10h20"/>
                </svg>
              </div>
              <p className="text-sm text-slate-400 font-medium">No credit sales found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Invoice</th>
                  <th className="px-5 py-3 text-right font-semibold">Sale Total</th>
                  <th className="px-5 py-3 text-right font-semibold">Credit Amount</th>
                  <th className="px-5 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{fmtDate(s.created_at)}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-700 text-xs">{s.invoice_no}</td>
                    <td className="px-5 py-3.5 text-right text-slate-500">Rs. {fmt(s.total)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-red-500">Rs. {fmt(s.credit_amount)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => navigate(`/sales/${s.id}`)}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Record Payment</h2>
                <p className="text-xs text-slate-400 mt-0.5">{customer?.name}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-lg leading-none">&times;</button>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3 mb-4">
                <span className="text-xs text-slate-500">Outstanding</span>
                <span className="font-bold text-red-600">Rs. {fmt(balance)}</span>
              </div>
              <form onSubmit={e => handleSettle(e, false)} className="space-y-3">
                {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount *</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    min="0.01" max={balance} step="0.01" required autoFocus
                    onFocus={e => e.target.select()}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 text-right" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Note</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={settling}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-60 hover:bg-red-600 transition-colors">
                    {settling ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" disabled={settling} onClick={e => handleSettle(e, true)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-bold disabled:opacity-60 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                    </svg>
                    {settling ? '…' : 'Save & Print'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
