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

export function buildVanTripReceiptHtml(trip, settlement, shopInfo) {
  const paperSize = shopInfo?.paper_size || '80mm';
  const is80      = paperSize !== 'A4';
  const currency  = shopInfo?.currency || 'Rs.';
  const fmtD      = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const dailyRecords = trip.daily_records || [];
  const totalCash    = dailyRecords.reduce((s, r) => s + Number(r.cash_handover), 0);
  const balanceOwed  = (settlement.balance ?? 0) >= 0;

  const variantRows = (settlement.variants || []).map(v => `
    <tr class="item-main-row">
      <td class="item-name">${v.name}</td>
      <td class="num">${fmt(v.unit_price)}</td>
      <td class="num bold">${fmt(v.sales_value)}</td>
    </tr>
    <tr class="item-sub-row">
      <td class="item-sub" colspan="3">Ld:${v.loaded} &nbsp; Ret:${v.returned} &nbsp; Sold:${v.sold}</td>
    </tr>
  `).join('');

  const dailyRows = dailyRecords.map(r => `
    <tr>
      <td>${fmtD(r.date)}</td>
      <td class="num">${currency} ${fmt(r.cash_handover)}</td>
      <td class="note">${r.notes || ''}</td>
    </tr>
  `).join('');

  const w = is80 ? '72mm' : '210mm';
  const fs = is80 ? '12px' : '14px';
  const fsLg = is80 ? '14px' : '18px';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Van Trip Summary</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fs};
      font-weight: 900;
      width: ${w};
      max-width: ${w};
      color: #000;
      word-break: break-word;
    }
    body { padding: ${is80 ? '5mm 4mm' : '15mm 20mm'}; }
    .center { text-align: center; }
    .logo { width: ${is80 ? '70px' : '90px'}; height: ${is80 ? '70px' : '90px'}; object-fit: contain; margin: 0 auto 6px; display: block; border-radius: 50%; }
    .shop-name { font-size: ${is80 ? '15px' : '20px'}; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
    .shop-meta { font-size: ${is80 ? '11px' : '13px'}; font-weight: 900; text-align: center; line-height: 1.6; }
    hr { border: none; border-top: 2px solid #000; margin: 7px 0; }
    hr.dashed { border-top: 1px dashed #000; }
    .title { font-size: ${fsLg}; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 0.08em; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 4px; padding: 2px 0; font-size: ${fs}; }
    .row .lbl { font-weight: 900; flex-shrink: 0; }
    .row .val { font-weight: 900; text-align: right; }
    .section-title { font-size: ${fs}; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; margin: 6px 0 3px; }
    table { width: 100%; border-collapse: collapse; font-size: ${is80 ? '10px' : '12px'}; font-weight: 900; }
    thead tr { border-top: 2px solid #000; border-bottom: 2px solid #000; }
    thead th { padding: 3px 2px; text-align: right; font-weight: 900; white-space: nowrap; }
    thead th.desc { text-align: left; }
    td.item-name { font-size: ${is80 ? '12px' : '14px'}; font-weight: 900; padding-top: 5px; word-break: break-word; }
    tr.item-main-row td { padding-top: 5px; }
    td.item-sub { font-size: ${is80 ? '9px' : '11px'}; font-weight: 900; color: #333; padding: 1px 0 5px; border-bottom: 1px dotted #999; }
    tfoot tr { border-top: 2px solid #000; }
    tfoot td { padding: 4px 2px; font-weight: 900; }
    td.name { text-align: left; word-break: break-word; }
    td.num { text-align: right; white-space: nowrap; }
    td.note { text-align: right; font-weight: 600; font-size: ${is80 ? '9px' : '11px'}; }
    td.bold { font-weight: 900; }
    .total-box { display: flex; justify-content: space-between; font-size: ${fsLg}; font-weight: 900; padding: 5px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; margin: 5px 0; }
    .balance-box { display: flex; justify-content: space-between; font-size: ${fsLg}; font-weight: 900; padding: 5px 0; border: 2px solid #000; border-radius: 4px; padding: 4px 6px; margin: 5px 0; }
    .footer { text-align: center; margin-top: 10px; font-size: ${is80 ? '11px' : '13px'}; font-weight: 900; line-height: 1.8; }
    @media print {
      html, body { overflow: visible !important; height: auto !important; }
      @page { margin: 0; size: ${is80 ? '72mm auto' : 'A4'}; }
      body { padding: ${is80 ? '3mm 4mm' : '10mm'}; width: ${w} !important; }
    }
  </style>
</head>
<body>
  ${shopInfo?.shop_logo ? `<img class="logo" src="${shopInfo.shop_logo}" alt="logo">` : ''}
  <div class="shop-name">${shopInfo?.shop_name || 'Van Sales'}</div>
  <div class="shop-meta">
    ${shopInfo?.address ? shopInfo.address + '<br>' : ''}
    ${shopInfo?.phone ? 'Tel: ' + shopInfo.phone : ''}
  </div>
  <hr>
  <div class="title">Van Trip Summary</div>
  <hr>

  <div class="row"><span class="lbl">Driver</span><span class="val">${trip.driver_name || '—'}</span></div>
  ${trip.vehicle_no ? `<div class="row"><span class="lbl">Vehicle</span><span class="val">${trip.vehicle_no}</span></div>` : ''}
  ${trip.route      ? `<div class="row"><span class="lbl">Route</span><span class="val">${trip.route}</span></div>` : ''}
  <div class="row"><span class="lbl">Start</span><span class="val">${fmtD(trip.start_date)}</span></div>
  ${trip.end_date   ? `<div class="row"><span class="lbl">End</span><span class="val">${fmtD(trip.end_date)}</span></div>` : ''}
  <div class="row"><span class="lbl">Printed</span><span class="val">${new Date().toLocaleString('en-LK')}</span></div>

  <hr class="dashed">
  <div class="section-title">Stock Summary</div>
  <table>
    <thead>
      <tr>
        <th class="desc">Description</th>
        <th>Unit Price</th><th>Total</th>
      </tr>
    </thead>
    <tbody>${variantRows}</tbody>
    <tfoot>
      <tr>
        <td class="bold">TOTAL</td>
        <td></td>
        <td class="num bold">${currency} ${fmt(settlement.gross_sales)}</td>
      </tr>
    </tfoot>
  </table>

  ${dailyRecords.length > 0 ? `
  <hr class="dashed">
  <div class="section-title">Daily Cash Collections</div>
  <table>
    <thead><tr><th class="name">Date</th><th>Cash In</th><th>Notes</th></tr></thead>
    <tbody>${dailyRows}</tbody>
    <tfoot>
      <tr>
        <td class="bold">Total</td>
        <td class="num bold">${currency} ${fmt(totalCash)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>` : ''}

  <hr class="dashed">
  <div class="section-title">Financial Summary</div>
  <div class="row"><span class="lbl">Gross Sales</span><span class="val">${currency} ${fmt(settlement.gross_sales)}</span></div>
  <div class="row"><span class="lbl">Cash Collected</span><span class="val">${currency} ${fmt(settlement.total_cash)}</span></div>
  <div class="balance-box">
    <span>${balanceOwed ? 'Variance' : 'Owed to Driver'}</span>
    <span>${currency} ${fmt(Math.abs(settlement.balance))}</span>
  </div>

  <hr>
  <div class="footer">${shopInfo?.receipt_footer || 'Thank you!'}<br>Powered by lumac.lk</div>
</body>
</html>`;
}

export async function printVanTripSummary(trip, settlement, shopInfo) {
  const html = buildVanTripReceiptHtml(trip, settlement, shopInfo);
  const paperSize = shopInfo?.paper_size || '80mm';
  const minDelay = new Promise(r => setTimeout(r, 1200));
  try {
    if (window.electronAPI?.printReceiptHtml) {
      const [r] = await Promise.all([window.electronAPI.printReceiptHtml(html, { paperSize }), minDelay]);
      if (r && !r.success) alert('Print failed: ' + (r.error || 'unknown error'));
    } else {
      const win = window.open('', '_blank', 'width=420,height=700,scrollbars=yes');
      if (win) { win.document.write(html); win.document.close(); win.onload = () => win.print(); }
      await minDelay;
    }
  } catch (err) {
    alert('Print error: ' + err.message);
  }
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
