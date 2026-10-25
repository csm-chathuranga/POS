import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useGetPurchaseQuery, useReturnPurchaseMutation } from '../../features/purchases/purchasesApi';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';
import { useLocale } from '../../contexts/LocaleContext';

const fmt     = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => { const d = new Date(s); return isNaN(d) ? '—' : d.toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }); };
const fmtNum  = n => { const v = Number(n || 0); return v % 1 === 0 ? v.toLocaleString('en-LK') : v.toLocaleString('en-LK', { minimumFractionDigits: 2 }); };
const fmtRaw  = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

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
  const [params] = useSearchParams();
  const { t }    = useLocale();
  const role     = useSelector(selectRole);
  const { data: purchase, isLoading } = useGetPurchaseQuery(id);
  const [returnPurchase, { isLoading: returning }] = useReturnPurchaseMutation();

  const [printing,      setPrinting]      = useState(false);
  const [returnModal,   setReturnModal]   = useState(false);
  const [returnItems,   setReturnItems]   = useState([]);
  const [returnReason,  setReturnReason]  = useState('');
  const [returnErr,     setReturnErr]     = useState('');
  const autoPrintFiredRef = useRef(false);

  useEffect(() => {
    if (!purchase) return;
    if (params.get('print') !== '1') return;
    if (autoPrintFiredRef.current) return;
    autoPrintFiredRef.current = true;
    handlePrint();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase, params]);

  function openReturn() {
    setReturnItems((purchase.items || []).map(i => ({ ...i, return_qty: '' })));
    setReturnReason('');
    setReturnErr('');
    setReturnModal(true);
  }

  async function handleReturn(e) {
    e.preventDefault();
    setReturnErr('');
    const itemsToReturn = returnItems
      .filter(i => parseFloat(i.return_qty) > 0)
      .map(i => ({
        product_id:   i.product_id,
        product_name: i.product_name,
        qty:          parseFloat(i.return_qty),
        cost_price:   parseFloat(i.cost_price),
      }));
    if (!itemsToReturn.length) { setReturnErr('Enter a return quantity for at least one item.'); return; }
    const total = itemsToReturn.reduce((s, i) => s + i.qty * i.cost_price, 0);
    try {
      await returnPurchase({ id, items: itemsToReturn, reason: returnReason, total }).unwrap();
      setReturnModal(false);
    } catch (err) {
      setReturnErr(err?.data?.error || 'Return failed');
    }
  }

  async function handlePrint() {
    if (!purchase || printing) return;
    setPrinting(true);

    const currency = 'Rs.';
    const items    = purchase.items || [];
    const balance  = parseFloat(purchase.total || 0) - parseFloat(purchase.paid || 0);

    const itemsHtml = items.map((item, idx) => `
      <div class="item-row">
        <div class="item-name">${idx + 1}) ${item.product_name}</div>
      </div>
      <div class="item-data">
        <span class="qty-col">${fmtNum(item.qty)}</span>
        <span class="our-col">${fmtRaw(item.cost_price)}</span>
        <span class="line-col">${fmtRaw(item.total)}</span>
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${purchase.grn_no}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { font-family:'Courier New',Courier,monospace; font-size:13px; font-weight:900; width:72mm; max-width:72mm; color:#000; word-break:break-word; overflow-wrap:break-word; }
    body { padding:5mm 4mm; }
    .title { font-size:14px; font-weight:900; text-align:center; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }
    .divider { border:none; border-top:2px solid #000; margin:8px 0; }
    .row { display:flex; justify-content:space-between; gap:6px; padding:2px 0; font-size:12px; }
    .row .label { font-weight:900; flex-shrink:0; }
    .row .value { font-weight:900; text-align:right; min-width:0; word-break:break-word; }
    .col-header { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; font-weight:900; padding:4px 0 3px; border-top:2px solid #000; border-bottom:2px solid #000; margin:6px 0; font-size:11px; text-align:right; }
    .col-header span:first-child { text-align:left; }
    .item-row { display:flex; font-weight:900; padding-top:5px; font-size:13px; }
    .item-name { flex:1; min-width:0; word-break:break-word; }
    .item-data { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; padding:2px 0 5px; font-size:11px; font-weight:900; }
    .qty-col { text-align:left; white-space:nowrap; }
    .our-col, .line-col { text-align:right; white-space:nowrap; }
    .total-row { display:flex; justify-content:space-between; gap:6px; font-weight:900; font-size:15px; padding:6px 0 4px; border-top:2px solid #000; margin-top:4px; }
    .paid-row { display:flex; justify-content:space-between; gap:6px; padding:2px 0; font-weight:900; font-size:12px; }
    .balance-row { display:flex; justify-content:space-between; gap:6px; font-weight:900; font-size:13px; padding:2px 0; }
    .status-row { display:flex; justify-content:space-between; gap:6px; padding:4px 0 0; font-size:12px; font-weight:900; border-top:1px dashed #000; margin-top:4px; }
    @media print { html,body{overflow:visible!important;height:auto!important;} @page{margin:0;size:72mm auto;} body{padding:3mm 4mm;width:72mm!important;} }
  </style>
</head>
<body>
  <div class="title">Purchase Receipt</div>
  <hr class="divider">
  <div class="row"><span class="label">GRN</span><span class="value">${purchase.grn_no}</span></div>
  <div class="row"><span class="label">Date</span><span class="value">${fmtDate(purchase.purchase_date)}</span></div>
  <div class="row"><span class="label">Supplier</span><span class="value">${purchase.supplier?.name || '—'}</span></div>
  <div class="row"><span class="label">Cashier</span><span class="value">${purchase.user?.name || '—'}</span></div>
  <div class="col-header"><span>QTY</span><span>UNIT PRICE</span><span>TOTAL</span></div>
  ${itemsHtml}
  <hr class="divider">
  ${parseFloat(purchase.discount || 0) > 0 ? `<div class="paid-row"><span>Subtotal</span><span>${fmtRaw(purchase.subtotal ?? purchase.total)}</span></div><div class="paid-row"><span>Discount</span><span>- ${fmtRaw(purchase.discount)}</span></div>` : ''}
  <div class="total-row"><span>Grand Total</span><span>${currency} ${fmtRaw(purchase.total)}</span></div>
  <div class="paid-row"><span>Paid</span><span>${fmtRaw(purchase.paid)}</span></div>
  ${balance > 0.005 ? `<div class="balance-row"><span>Balance</span><span>${fmtRaw(balance)}</span></div>` : ''}
  <div class="status-row"><span>Status</span><span style="text-transform:uppercase;">${purchase.status}</span></div>
</body>
</html>`;

    try {
      if (window.electronAPI?.printReceiptHtml) {
        await window.electronAPI.printReceiptHtml(html, { paperSize: '72mm' });
      } else {
        const win = window.open('', '_blank', 'width=400,height=700,scrollbars=yes');
        if (win) { win.document.write(html); win.document.close(); win.onload = () => win.print(); }
      }
    } catch (err) {
      alert('Print error: ' + err.message);
    } finally {
      setPrinting(false);
    }
  }

  function handlePrintA4() {
    if (!purchase) return;
    const items = purchase.items || [];
    const ROWS  = 14;
    const split = n => {
      const v = Math.round((Number(n) || 0) * 100);
      return [Math.floor(v / 100).toLocaleString('en-LK'), String(v % 100).padStart(2, '0')];
    };
    const money = n => { const [r, c] = split(n); return `<td class="r">${r}</td><td class="r c">${c}</td>`; };

    let sumCost = 0, sumRetail = 0;
    const rows = items.map(it => {
      const qty    = Number(it.qty) || 0;
      const retail = Number(it.product?.selling_price) || 0;
      sumCost   += Number(it.total) || 0;
      sumRetail += qty * retail;
      return `<tr>
        <td></td><td class="l">${it.product_name}</td><td></td>
        <td class="m">${fmtNum(qty)}</td>
        ${money(it.cost_price)}${money(it.total)}
        ${money(retail)}${money(qty * retail)}
        <td></td></tr>`;
    }).join('');
    const blank = Array.from({ length: Math.max(ROWS - items.length, 0) })
      .map(() => `<tr>${'<td>&nbsp;</td>'.repeat(13)}</tr>`).join('');
    const sum = (a, b) => `${money(a)}${money(b)}`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${purchase.grn_no}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Iskoola Pota','Noto Sans Sinhala','Segoe UI',Arial,sans-serif; font-size: 12px; color: #000; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; }
  .title { text-align:center; flex:1; font-size:18px; font-weight:700; text-decoration:underline; }
  .no { font-size:14px; font-weight:700; min-width:140px; text-align:right; }
  .meta { display:flex; justify-content:space-between; margin:10px 0 8px; font-size:13px; }
  table { width:100%; border-collapse:collapse; table-layout:fixed; }
  th, td { border:1px solid #000; padding:3px 5px; height:23px; }
  th { background:#d9d9d9; text-align:center; font-weight:600; font-size:11px; height:auto; }
  td.l { text-align:left; } td.r { text-align:right; } td.c { width:34px; } td.m { text-align:center; }
  tr { page-break-inside: avoid; }
  .tot td { font-weight:700; }
  .foot { display:flex; gap:28px; margin-top:16px; font-size:12px; }
  .foot > div { flex:1; }
  .line { margin-top:20px; }
</style></head>
<body>
  <div class="top">
    <div style="min-width:140px"></div>
    <div class="title">බඩු භාර ගැනීමේ සටහන<div style="font-size:11px;font-weight:400;text-decoration:none">Goods Received Note</div></div>
    <div class="no">No. ${purchase.grn_no}</div>
  </div>
  <div class="meta">
    <div>සැපයුම්කරු / Supplier: <b>${purchase.supplier?.name || '—'}</b></div>
    <div>සිල්ලර ගබඩාව / Retail Store: ......................................</div>
    <div>දිනය / Date: <b>${fmtDate(purchase.purchase_date)}</b></div>
  </div>
  <table>
    <colgroup>
      <col style="width:8%"><col style="width:25%"><col style="width:12%"><col style="width:7%">
      <col style="width:7%"><col style="width:3%"><col style="width:8%"><col style="width:3%">
      <col style="width:7%"><col style="width:3%"><col style="width:8%"><col style="width:3%"><col style="width:9%">
    </colgroup>
    <thead>
      <tr>
        <th rowspan="3">හැඳින්වූ අංකය<br>Ref. No</th>
        <th rowspan="3">විස්තරය<br>Description</th>
        <th rowspan="3">ආපසු එවිය යුතු නිස් භාජනවල විස්තරය<br>Empty containers to return</th>
        <th rowspan="3">ප්‍රමාණය<br>Qty</th>
        <th colspan="4">තොග ගබඩාවේ විකුණන මිල<br>Wholesale Selling Price</th>
        <th colspan="4">සිල්ලර ගබඩාවේ විකුණන මිල<br>Retail Selling Price</th>
        <th rowspan="3">වෙනත් කරුණු<br>Remarks</th>
      </tr>
      <tr>
        <th colspan="2">එකක මිල<br>Unit</th><th colspan="2">එකතුව<br>Total</th>
        <th colspan="2">එකක මිල<br>Unit</th><th colspan="2">එකතුව<br>Total</th>
      </tr>
      <tr>${'<th>රු.</th><th>ශත</th>'.repeat(4)}</tr>
    </thead>
    <tbody>
      ${rows}${blank}
      <tr class="tot"><td colspan="3" class="r">මෙම සටහනේ එකතුව / Total of this note</td><td></td><td colspan="2"></td>${money(sumCost)}<td colspan="2"></td>${money(sumRetail)}<td></td></tr>
      <tr class="tot"><td colspan="3" class="r">පෙර සටහනේ එකතුව / Previous total</td><td></td><td colspan="2"></td><td colspan="2"></td><td colspan="2"></td><td colspan="2"></td><td></td></tr>
      <tr class="tot"><td colspan="3" class="r">මුළු එකතුව / Grand total</td><td></td><td colspan="2"></td>${money(sumCost)}<td colspan="2"></td>${money(sumRetail)}<td></td></tr>
    </tbody>
  </table>
  <div class="foot">
    <div>
      <div>පිළියෙල කළේ / Prepared by: <b>${purchase.user?.name || ''}</b></div>
      <div class="line">අත්සන / Signature: ............................</div>
      <div class="line">දිනය / Date: ${fmtDate(purchase.purchase_date)}</div>
    </div>
    <div>
      <div>බඩු භාරගත් බව සහතික කරමි. / I certify the goods were received.</div>
      <div class="line">අත්සන / Signature: ............................</div>
      <div class="line">දිනය / Date: ............................</div>
    </div>
    <div>
      <div>ගබඩාකරුගේ නම / Storekeeper: ............................</div>
      <div class="line">අත්සන / Signature: ............................</div>
      <div class="line">දිනය / Date: ............................</div>
    </div>
  </div>
</body></html>`;

    const win = window.open('', '_blank', 'width=1100,height=800,scrollbars=yes');
    if (!win) { alert('Please allow pop-ups to print'); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }

  if (isLoading) return <div className="p-8 text-center text-slate-400">{t('lbl.loading')}</div>;
  if (!purchase) return <div className="p-8 text-center text-slate-400">{t('pur.grn')} not found</div>;

  const items   = purchase.items || [];
  const balance = parseFloat(purchase.total || 0) - parseFloat(purchase.paid || 0);
  const canReturn = (role === 'admin' || role === 'manager') && items.length > 0;

  return (
    <div className="p-3 sm:p-6 space-y-5">

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
        <div className="ml-auto flex items-center gap-2">
          {statusBadge(purchase.status)}
          {canReturn && (
            <button onClick={openReturn}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              Return
            </button>
          )}
          <button onClick={handlePrint} disabled={printing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors">
            {printing
              ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            }
            {printing ? 'Printing…' : 'Print'}
          </button>
          <button onClick={handlePrintA4}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            A4 Print
          </button>
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('pur.supplier'),  value: purchase.supplier?.name || t('lbl.all') },
          { label: t('lbl.cashier'),   value: purchase.user?.name || '—' },
          { label: t('th.date'),       value: fmtDate(purchase.purchase_date) },
          { label: t('pur.due_date'),  value: purchase.due_date ? fmtDate(purchase.due_date) : '—' },
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
          <thead className="bg-slate-800 text-xs text-white uppercase tracking-wider">
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
                <td className="px-5 py-3 text-right text-slate-600">{fmt(item.cost_price)}</td>
                <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmt(item.total)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">{t('lbl.no_data')}</td></tr>
            )}
            {items.length > 0 && (() => {
              const totalQty  = items.reduce((s, i) => s + parseFloat(i.qty || 0), 0);
              const totalCost = items.reduce((s, i) => s + parseFloat(i.total || 0), 0);
              return (
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
                  <td colSpan={2} className="px-5 py-3 text-right text-xs uppercase tracking-wide text-slate-500">Totals</td>
                  <td className="px-5 py-3 text-right">{fmtNum(totalQty)}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-right">{fmt(totalCost)}</td>
                </tr>
              );
            })()}
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
        {purchase.due_date && balance > 0.005 && (() => {
          const overdue = new Date(purchase.due_date) < new Date();
          return (
            <div className={`flex justify-between text-xs font-semibold pt-1 border-t border-slate-100 ${overdue ? 'text-red-500' : 'text-slate-500'}`}>
              <span>{t('pur.due_date')}{overdue ? ' ⚠ Overdue' : ''}</span>
              <span>{fmtDate(purchase.due_date)}</span>
            </div>
          );
        })()}
        {purchase.notes && (
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">{purchase.notes}</p>
        )}
      </div>

      {/* Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800">Return Items</h2>
                <p className="text-xs text-slate-400 mt-0.5">{purchase.grn_no}</p>
              </div>
              <button onClick={() => setReturnModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={handleReturn} className="flex flex-col overflow-hidden">
              <div className="px-6 py-4 overflow-y-auto space-y-3">
                {returnErr && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{returnErr}</p>}
                <p className="text-xs text-slate-500">Enter the quantity to return for each item (leave blank or 0 to skip).</p>
                {returnItems.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.product_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Original: {fmtNum(item.qty)} × {fmt(item.cost_price)}
                      </p>
                    </div>
                    <div className="shrink-0 w-28">
                      <label className="block text-xs text-slate-500 mb-1 text-right">Return Qty</label>
                      <input
                        type="number"
                        min="0"
                        max={item.qty}
                        step="0.001"
                        value={item.return_qty}
                        onChange={e => setReturnItems(prev =>
                          prev.map((it, idx) => idx === i ? { ...it, return_qty: e.target.value } : it)
                        )}
                        onFocus={e => e.target.select()}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-right font-semibold outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                      />
                    </div>
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason</label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                  />
                </div>
              </div>
              <div className="flex gap-2 px-6 pb-5 pt-3 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setReturnModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={returning}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-60 hover:bg-red-600 transition-colors">
                  {returning ? 'Processing…' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

