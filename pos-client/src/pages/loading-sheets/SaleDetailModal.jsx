import { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { useGetSaleQuery } from '../../features/sales/salesApi';
import { useLocale } from '../../contexts/LocaleContext';
import { translations } from '../../i18n/translations';
import { getApiUrl } from '../../config/runtimeConfig';

const API = getApiUrl();
const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = s => new Date(s).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });

const IcoPrint   = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4h10z"/></svg>;
const IcoSpinner = <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>;

function MetaRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm leading-snug min-w-0">
      <span className="text-black font-semibold pr-2 shrink-0">{label}</span>
      <span className={`ml-auto text-right font-semibold text-black min-w-0 break-words ${mono ? 'font-mono' : ''}`}
        style={{ overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  );
}

export default function SaleDetailModal({ saleId, onClose }) {
  const { data: sale, isLoading } = useGetSaleQuery(saleId);
  const { t } = useLocale();
  const [shopInfo, setShopInfo] = useState({});
  const [paperSize, setPaperSize] = useState('72mm');
  const [printing, setPrinting] = useState(false);
  const barcodeRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/settings/public`)
      .then(r => r.json()).then(setShopInfo).catch(() => {});
  }, []);

  useEffect(() => {
    if (barcodeRef.current && sale?.invoice_no) {
      JsBarcode(barcodeRef.current, sale.invoice_no, {
        format: 'CODE128', displayValue: true, fontSize: 12, height: 50, margin: 4,
      });
    }
  }, [sale?.invoice_no]);

  async function handlePrint() {
    if (!sale || printing) return;
    setPrinting(true);
    const is80 = paperSize === '72mm';
    const currency = shopInfo.currency || 'Rs.';
    const receiptLang = shopInfo.receipt_language || 'en';
    const isSinhala = receiptLang === 'si';
    const rl = key => (translations[receiptLang] || translations.en)[key] ?? translations.en[key];
    const minDelay = new Promise(r => setTimeout(r, 2200));

    let totalSaved = 0;
    const itemsHtml = (sale.items || []).map((item, idx) => {
      const qty = Number(item.qty || 0);
      const unit = parseFloat(item.unit_price || 0);
      const origPrice = parseFloat(item.original_price || 0) || unit;
      const lineDiscount = parseFloat(item.discount || 0);
      const originalLineTotal = qty * unit;
      const reducedLineTotal = Math.max(0, originalLineTotal - lineDiscount);
      const ourUnit = qty > 0 ? Math.max(0, reducedLineTotal / qty) : unit;
      if (origPrice > unit) totalSaved += (origPrice - unit) * qty;
      return `
      <div class="item-row">
        <div class="item-name">${idx + 1}) ${item.product_name}</div>
      </div>
      <div class="item-data">
        <span class="orig-col orig-light">${fmt(origPrice)}</span>
        <span class="our-col">${fmt(ourUnit)}</span>
        <span class="disc-col">${lineDiscount > 0 ? fmt(lineDiscount) : '-'}</span>
        <span class="qty-col">${qty}</span>
        <span class="line-col">${fmt(reducedLineTotal)}</span>
      </div>
    `;
    }).join('');

    const payments   = sale.payments || [];
    const paidCash   = payments.filter(p => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const paidCard   = payments.filter(p => p.method === 'card').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const paidCredit = payments.filter(p => p.method === 'credit').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const change     = Math.max(0, parseFloat(sale.paid || 0) - parseFloat(sale.total || 0));
    const cashGiven  = paidCash + change;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${sale.invoice_no}</title>
  ${isSinhala ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@700;800;900&display=swap" rel="stylesheet">' : ''}
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { font-family: ${isSinhala ? "'Noto Sans Sinhala', sans-serif" : "'Courier New', Courier, monospace"}; font-size: ${is80 ? '13px' : '15px'}; font-weight: 900; width: ${is80 ? '72mm' : '210mm'}; max-width: ${is80 ? '72mm' : '210mm'}; color: #000; word-break: break-word; overflow-wrap: break-word; }
    body { padding: ${is80 ? '5mm 4mm' : '15mm 20mm'}; }
    .center { text-align:center; }
    .logo { width:${is80 ? '80px' : '100px'}; height:${is80 ? '80px' : '100px'}; object-fit:contain; margin:0 auto 8px; display:block; border-radius:50%; }
    .shop-name { font-size:${is80 ? '16px' : '22px'}; font-weight:900; text-align:center; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px; color:#000; word-break:break-word; }
    .shop-meta { font-size:${is80 ? '12px' : '14px'}; font-weight:900; text-align:center; color:#000; line-height:1.6; word-break:break-word; }
    .divider { border:none; border-top:2px solid #000; margin:8px 0; }
    .row { display:flex; justify-content:space-between; gap:6px; padding:3px 0; font-size:${is80 ? '12px' : '14px'}; color:#000; }
    .row .label { color:#000; font-weight:900; flex-shrink:0; }
    .row .value { font-weight:900; color:#000; text-align:right; min-width:0; word-break:break-word; }
    .col-header { display:grid; grid-template-columns: repeat(5, 1fr); gap:4px; font-weight:900; padding:4px 0 3px; border-top:2px solid #000; border-bottom:2px solid #000; margin:6px 0; font-size:${is80 ? '12px' : '14px'}; color:#000; text-align:center; line-height:1.3; }
    .item-row { display:flex; justify-content:space-between; align-items:flex-start; gap:6px; font-weight:900; padding-top:5px; font-size:${is80 ? '13px' : '15px'}; color:#000; }
    .item-name { flex:1; min-width:0; word-break:break-word; overflow-wrap:break-word; }
    .item-data { display:grid; grid-template-columns: repeat(5, 1fr); gap:4px; text-align:right; padding:2px 0 5px; font-size:${is80 ? '11px' : '12px'}; font-weight:900; color:#000; }
    .qty-col, .orig-col, .our-col, .disc-col, .line-col { text-align:right; white-space:nowrap; }
    .orig-light { font-weight: 600; }
    .total-row { display:flex; justify-content:space-between; align-items:baseline; gap:6px; font-weight:900; font-size:${is80 ? '15px' : '20px'}; padding:6px 0 4px; border-top:2px solid #000; margin-top:4px; color:#000; }
    .paid-row { display:flex; justify-content:space-between; gap:6px; padding:3px 0; font-weight:900; font-size:${is80 ? '12px' : '14px'}; color:#000; }
    .footer { text-align:center; margin-top:10px; font-size:${is80 ? '12px' : '14px'}; color:#000; font-weight:900; line-height:1.8; word-break:break-word; }
    @media print { html, body { overflow: visible !important; height: auto !important; } @page { margin: 0; size: ${is80 ? '72mm auto' : 'A4'}; } }
  </style>
</head>
<body>
  ${shopInfo.shop_logo ? `<img class="logo" src="${shopInfo.shop_logo}" alt="logo">` : ''}
  <div class="shop-name">${shopInfo.shop_name || 'LMUC POS'}</div>
  <div class="shop-meta">${shopInfo.address ? shopInfo.address + '<br>' : ''}${shopInfo.phone || ''}</div>
  <hr class="divider">
  <div class="row"><span class="label">${rl('th.invoice')}</span><span class="value">${sale.invoice_no}</span></div>
  <div class="row"><span class="label">${rl('th.date')}</span><span class="value">${fmtDate(sale.created_at)} ${fmtTime(sale.created_at)}</span></div>
  <div class="row"><span class="label">${rl('lbl.cashier')}</span><span class="value">${sale.user?.name || '—'}</span></div>
  ${sale.customer?.name ? `<div class="row"><span class="label">${rl('lbl.customer')}</span><span class="value">${sale.customer.name}</span></div>` : ''}
  <div class="col-header"><span>RETAIL<br>PRICE</span><span>OUR<br>PRICE</span><span>DISC</span><span>QTY</span><span>TOTAL</span></div>
  ${itemsHtml}
  <hr class="divider">
  ${parseFloat(sale.discount) > 0 ? `<div style="border:2px solid #000;border-radius:4px;padding:3px 8px;display:flex;justify-content:space-between;gap:6px;margin:5px 0"><span style="font-weight:900">${rl('lbl.earned_profit')}</span><span style="font-weight:900">- ${fmt(sale.discount)}</span></div>` : ''}
  <div class="total-row"><span>${rl('lbl.grand_total')}</span><span>${currency} ${fmt(sale.total)}</span></div>
  ${paidCash   > 0 ? `<div class="paid-row"><span>${rl('lbl.cash_paid')} (${rl('lbl.cash')})</span><span>${fmt(cashGiven)}</span></div>` : ''}
  ${paidCard   > 0 ? `<div class="paid-row"><span>${rl('lbl.cash_paid')} (${rl('lbl.card')})</span><span>${fmt(paidCard)}</span></div>` : ''}
  ${paidCredit > 0 ? `<div class="paid-row"><span>${rl('lbl.credit')}</span><span>${fmt(paidCredit)}</span></div>` : ''}
  ${change     > 0 ? `<div class="paid-row"><span>${rl('lbl.change')}</span><span>${fmt(change)}</span></div>` : ''}
  ${totalSaved > 0 ? `<div style="border:2px solid #000;border-radius:4px;padding:3px 8px;display:flex;justify-content:space-between;gap:6px;margin-top:6px"><span style="font-weight:900">${rl('lbl.you_saved')}</span><span style="font-weight:900">${fmt(totalSaved)}</span></div>` : ''}
  <div style="text-align:center;margin:8px 0 4px;"><svg id="barcode" style="max-width:100%;"></svg></div>
  <hr class="divider">
  <div class="footer">${shopInfo.receipt_footer || 'Thank you for shopping with us!'}<br>lumac.lk</div>
  <script>
    if (typeof JsBarcode !== 'undefined') {
      JsBarcode('#barcode', '${sale.invoice_no}', { format:'CODE128', displayValue:true, fontSize:10, height:35, margin:2, width:1 });
    }
  </script>
</body>
</html>`;

    try {
      if (window.electronAPI?.printReceiptHtml) {
        const [r] = await Promise.all([window.electronAPI.printReceiptHtml(html, { paperSize }), minDelay]);
        if (r && !r.success) alert('Print failed: ' + (r.error || 'unknown error'));
      } else {
        const win = window.open('', '_blank', 'width=400,height=700,scrollbars=yes');
        if (win) { win.document.write(html); win.document.close(); win.onload = () => win.print(); }
        await minDelay;
      }
    } catch (err) {
      alert('Print error: ' + err.message);
    } finally {
      setPrinting(false);
    }
  }

  const payments   = sale?.payments || [];
  const paidCash   = payments.filter(p => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidCard   = payments.filter(p => p.method === 'card').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidCredit = payments.filter(p => p.method === 'credit').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const change     = Math.max(0, parseFloat(sale?.paid || 0) - parseFloat(sale?.total || 0));
  const cashGiven  = paidCash + change;
  const currency   = shopInfo.currency || 'Rs.';
  const receiptLang = shopInfo.receipt_language || 'en';
  const rl = key => (translations[receiptLang] || translations.en)[key] ?? translations.en[key];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-t-2xl border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-slate-800">{sale?.invoice_no || '…'}</span>
            {/* Paper size toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              <button onClick={() => setPaperSize('72mm')}
                className={`px-2 py-1 transition-colors ${paperSize === '72mm' ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                72mm
              </button>
              <button onClick={() => setPaperSize('A4')}
                className={`px-2 py-1 border-l border-slate-200 transition-colors ${paperSize === 'A4' ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                A4
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} disabled={printing || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {printing ? IcoSpinner : IcoPrint}
              {printing ? 'Printing…' : t('btn.print')}
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Receipt body */}
        <div className="flex-1 overflow-y-auto py-5 px-4">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
          ) : !sale ? (
            <div className="py-16 text-center text-slate-400 text-sm">Sale not found.</div>
          ) : (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 px-8 py-7"
              style={{ fontFamily: "'Outfit', 'Noto Sans Sinhala', sans-serif" }}>

              {/* Shop header */}
              <div className="text-center mb-5">
                {shopInfo.shop_logo ? (
                  <img src={shopInfo.shop_logo} alt="logo" className="w-24 h-24 object-contain mx-auto mb-3 rounded-full" />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center text-slate-400 text-4xl font-semibold">
                    {(shopInfo.shop_name || 'L')[0]}
                  </div>
                )}
                <p className="font-semibold text-black text-lg tracking-wide uppercase">{shopInfo.shop_name || 'LMUC POS'}</p>
                {shopInfo.address && <p className="text-black text-xs font-medium mt-0.5">{shopInfo.address}</p>}
                {shopInfo.phone   && <p className="text-black text-xs font-medium">{shopInfo.phone}</p>}
              </div>

              <hr className="border-slate-200 mb-4" />

              {/* Invoice meta */}
              <div className="space-y-1.5">
                <MetaRow label={t('th.invoice')}  value={sale.invoice_no} mono />
                <MetaRow label={t('th.date')}     value={`${fmtDate(sale.created_at)} ${fmtTime(sale.created_at)}`} />
                <MetaRow label={t('lbl.cashier')} value={sale.user?.name || '—'} />
                {sale.customer?.name && <MetaRow label={t('lbl.customer')} value={sale.customer.name} />}
              </div>

              <hr className="border-slate-200 my-4" />

              {/* Items */}
              <div className="mb-3 min-w-0">
                <div className="grid grid-cols-5 gap-1 text-xs font-semibold text-black border-b-2 border-slate-200 pb-2 mb-3 text-center leading-tight">
                  <span>RETAIL<br/>PRICE</span>
                  <span>OUR<br/>PRICE</span>
                  <span>DISC</span>
                  <span>QTY</span>
                  <span>TOTAL</span>
                </div>
                {(sale.items || []).map((item, idx) => {
                  const qty = Number(item.qty || 0);
                  const unit = parseFloat(item.unit_price || 0);
                  const origPrice = parseFloat(item.original_price || 0) || unit;
                  const lineDiscount = parseFloat(item.discount || 0);
                  const reducedLineTotal = Math.max(0, qty * unit - lineDiscount);
                  const ourUnit = qty > 0 ? Math.max(0, reducedLineTotal / qty) : unit;
                  return (
                    <div key={item.id} className="mb-3 min-w-0">
                      <div className="text-sm font-semibold text-black break-words" style={{ overflowWrap: 'anywhere' }}>{idx + 1}) {item.product_name}</div>
                      <div className="grid grid-cols-5 gap-1 text-xs text-black font-semibold mt-0.5 min-w-0">
                        <span className="text-right">{fmt(origPrice)}</span>
                        <span className="text-right">{fmt(ourUnit)}</span>
                        <span className="text-right">{lineDiscount > 0 ? fmt(lineDiscount) : '-'}</span>
                        <span className="text-right">{qty}</span>
                        <span className="text-right">{fmt(reducedLineTotal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <hr className="border-slate-200 mb-4" />

              {/* Totals */}
              <div className="space-y-2">
                {parseFloat(sale.discount) > 0 && (
                  <div className="flex justify-between items-center border-2 border-slate-300 rounded-xl px-4 py-2 bg-slate-50">
                    <span className="text-black font-semibold">{t('lbl.earned_profit')}</span>
                    <span className="text-black font-semibold">- {fmt(sale.discount)}</span>
                  </div>
                )}
                {parseFloat(sale.tax) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-black font-semibold">{t('lbl.tax')}</span>
                    <span className="font-semibold text-black">{fmt(sale.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                  <span className="text-base font-semibold text-black">{t('lbl.grand_total')}</span>
                  <span className="text-xl font-semibold text-black">{currency} {fmt(sale.total)}</span>
                </div>
                {paidCash   > 0 && <div className="flex justify-between text-sm"><span className="text-black font-semibold">{t('lbl.cash_paid')} ({t('lbl.cash')})</span><span className="font-semibold text-black">{fmt(cashGiven)}</span></div>}
                {paidCard   > 0 && <div className="flex justify-between text-sm"><span className="text-black font-semibold">{t('lbl.cash_paid')} ({t('lbl.card')})</span><span className="font-semibold text-black">{fmt(paidCard)}</span></div>}
                {paidCredit > 0 && <div className="flex justify-between text-sm"><span className="text-black font-semibold">{t('lbl.credit')}</span><span className="font-semibold text-black">{fmt(paidCredit)}</span></div>}
                {change     > 0 && <div className="flex justify-between text-sm font-semibold text-black"><span>{t('lbl.change')}</span><span>{fmt(change)}</span></div>}
              </div>

              {/* Barcode */}
              <div className="flex flex-col items-center mt-4 mb-2">
                <svg ref={barcodeRef} className="w-full max-w-[200px]" />
              </div>

              <hr className="border-slate-200 my-4" />

              <div className="text-center text-xs font-semibold text-black leading-relaxed">
                <p>{shopInfo.receipt_footer || 'Thank you for shopping with us!'}</p>
                <p className="mt-1">lumac.lk</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
