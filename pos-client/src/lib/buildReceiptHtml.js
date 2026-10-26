import { translations } from '../i18n/translations';

const fmt     = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = s => new Date(s).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });

/**
 * Build the receipt HTML string used for printing.
 * @param {object} sale      - sale object (items, payments, invoice_no, created_at, etc.)
 * @param {object} shopInfo  - shop settings (shop_name, shop_logo, address, phone, currency,
 *                             receipt_language, receipt_footer, paper_size)
 * @param {string} userName  - cashier display name
 */
export function buildReceiptHtml(sale, shopInfo, userName) {
  const paperSize  = shopInfo?.paper_size || '80mm';
  const is80       = paperSize !== 'A4';
  const currency   = shopInfo?.currency || 'Rs.';
  const receiptLang = shopInfo?.receipt_language || 'en';
  const isSinhala  = receiptLang === 'si';
  const rl = key => (translations[receiptLang] || translations.en)[key] ?? translations.en[key];

  const payments   = sale.payments || [];
  const paidCash   = payments.filter(p => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidCard   = payments.filter(p => p.method === 'card').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidCredit = payments.filter(p => p.method === 'credit').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const change     = Math.max(0, parseFloat(sale.paid || 0) - parseFloat(sale.total || 0));
  const cashGiven  = paidCash + change;
  const customerName = sale.customer?.name || sale.customer_name || '';

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
      <div class="item-name">${idx + 1}) ${isSinhala && item.name_si ? item.name_si : (item.product_name || item.name || '')}</div>
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${sale.invoice_no || 'Receipt'}</title>
  ${isSinhala ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@700;800;900&display=swap" rel="stylesheet">' : ''}
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      font-family: ${isSinhala ? "'Noto Sans Sinhala', sans-serif" : "'Courier New', Courier, monospace"};
      font-size: ${is80 ? '13px' : '15px'};
      font-weight: 900;
      width: ${is80 ? '72mm' : '210mm'};
      max-width: ${is80 ? '72mm' : '210mm'};
      color: #000;
      word-break: break-word;
      overflow-wrap: break-word;
    }
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
    .col-header span { word-break:break-word; }
    .item-row { display:flex; justify-content:space-between; align-items:flex-start; gap:6px; font-weight:900; padding-top:5px; font-size:${is80 ? '13px' : '15px'}; color:#000; }
    .item-name { flex:1; min-width:0; word-break:break-word; overflow-wrap:break-word; }
    .item-data { display:grid; grid-template-columns: repeat(5, 1fr); gap:4px; text-align:right; padding:2px 0 5px; font-size:${is80 ? '11px' : '12px'}; font-weight:900; color:#000; }
    .qty-col, .orig-col, .our-col, .disc-col, .line-col { text-align:right; white-space:nowrap; }
    .orig-light { font-weight: 600; }
    .disc-box { border:2px solid #000; border-radius:4px; padding:3px 8px; display:flex; justify-content:space-between; gap:6px; margin:5px 0; }
    .disc-label { color:#000; font-weight:900; flex-shrink:0; }
    .disc-val { color:#000; font-weight:900; }
    .total-row { display:flex; justify-content:space-between; align-items:baseline; gap:6px; font-weight:900; font-size:${is80 ? '15px' : '20px'}; padding:6px 0 4px; border-top:2px solid #000; margin-top:4px; color:#000; }
    .total-val { color:#000; flex-shrink:0; }
    .paid-row { display:flex; justify-content:space-between; gap:6px; padding:3px 0; font-weight:900; font-size:${is80 ? '12px' : '14px'}; color:#000; }
    .change-row { display:flex; justify-content:space-between; gap:6px; font-weight:900; color:#000; padding:3px 0; font-size:${is80 ? '13px' : '15px'}; }
    .footer { text-align:center; margin-top:10px; font-size:${is80 ? '12px' : '14px'}; color:#000; font-weight:900; line-height:1.8; word-break:break-word; }
    @media print {
      html, body { overflow: visible !important; height: auto !important; }
      @page { margin: 0; size: ${is80 ? '72mm auto' : 'A4'}; }
      body { padding: ${is80 ? '3mm 4mm' : '10mm'}; width: ${is80 ? '72mm' : '210mm'} !important; }
    }
  </style>
</head>
<body>
  ${shopInfo?.shop_logo ? `<img class="logo" src="${shopInfo.shop_logo}" alt="logo">` : ''}
  <div class="shop-name">${shopInfo?.shop_name || 'LMUC POS'}</div>
  <div class="shop-meta">
    ${shopInfo?.address ? shopInfo.address + '<br>' : ''}
    ${shopInfo?.phone || ''}
  </div>
  <hr class="divider">
  <div class="row"><span class="label">${rl('th.invoice')}</span><span class="value">${sale.invoice_no || ''}</span></div>
  <div class="row"><span class="label">${rl('th.date')}</span><span class="value">${sale.created_at ? fmtDate(sale.created_at) + ' ' + fmtTime(sale.created_at) : ''}</span></div>
  <div class="row"><span class="label">${rl('lbl.cashier')}</span><span class="value">${userName || '—'}</span></div>
  ${customerName ? `<div class="row"><span class="label">${rl('lbl.customer')}</span><span class="value">${customerName}</span></div>` : ''}
  <div class="col-header"><span>RETAIL<br>PRICE</span><span>OUR<br>PRICE</span><span>DISC</span><span>QTY</span><span>TOTAL</span></div>
  ${itemsHtml}
  <hr class="divider">
  ${parseFloat(sale.discount) > 0 ? `<div class="disc-box"><span class="disc-label">${rl('lbl.earned_profit')}</span><span class="disc-val">- ${fmt(sale.discount)}</span></div>` : ''}
  ${parseFloat(sale.tax) > 0 ? `<div class="row"><span class="label">${rl('lbl.tax')}</span><span>${fmt(sale.tax)}</span></div>` : ''}
  <div class="total-row"><span class="total-label">${rl('lbl.grand_total')}</span><span class="total-val">${currency} ${fmt(sale.total)}</span></div>
  ${paidCash > 0  ? `<div class="paid-row"><span>${rl('lbl.cash_paid')} (${rl('lbl.cash')})</span><span>${fmt(cashGiven)}</span></div>` : ''}
  ${paidCard > 0  ? `<div class="paid-row"><span>${rl('lbl.cash_paid')} (${rl('lbl.card')})</span><span>${fmt(paidCard)}</span></div>` : ''}
  ${paidCredit > 0 ? `<div class="paid-row"><span>${rl('lbl.credit')}</span><span>${fmt(paidCredit)}</span></div>` : ''}
  ${change > 0    ? `<div class="change-row"><span>${rl('lbl.change')}</span><span>${fmt(change)}</span></div>` : ''}
  ${totalSaved > 0 ? `<div class="disc-box" style="margin-top:6px;font-size:${is80 ? '15px' : '18px'}"><span class="disc-label">${rl('lbl.you_saved')}</span><span class="disc-val">${fmt(totalSaved)}</span></div>` : ''}
  <div style="text-align:center;margin:8px 0 4px;">
    <svg id="barcode" style="max-width:100%;"></svg>
  </div>
  <hr class="divider">
  <div class="footer">
    ${shopInfo?.receipt_footer || 'Thank you for shopping with us!'}
    <br>Powered by lumac.lk
  </div>
  <script>
    if (typeof JsBarcode !== 'undefined' && '${sale.invoice_no || ''}') {
      JsBarcode('#barcode', '${sale.invoice_no || ''}', { format:'CODE128', displayValue:true, fontSize:10, height:35, margin:2, width:1 });
    }
  </script>
</body>
</html>`;
}

export async function printReceipt(sale, shopInfo, userName) {
  const html = buildReceiptHtml(sale, shopInfo, userName);
  const paperSize = shopInfo?.paper_size || '80mm';
  const minDelay = new Promise(r => setTimeout(r, 1200));
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
  }
}
