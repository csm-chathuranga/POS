import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { getApiUrl } from '../../config/runtimeConfig';

const API = getApiUrl();
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const f  = n  => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const ft = s  => new Date(s).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
const fd = s  => new Date(s).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });

export default function DailyReport() {
  const user = useSelector(selectCurrentUser);
  const [date, setDate]       = useState(today());
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [err, setErr]         = useState('');

  async function fetchReport(d) {
    setLoading(true);
    setErr('');
    try {
      const token = JSON.parse(localStorage.getItem('pos_auth') || 'null')?.token || '';
      const r = await fetch(`${API}/api/sales/daily-print?date=${d}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Failed to load');
      setData(await r.json());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Load today on first render
  useState(() => { fetchReport(today()); }, []);

  async function handlePrint() {
    if (!data) return;
    setPrinting(true);
    try {
      const shopResp = await fetch(`${API}/api/settings/public`).catch(() => null);
      const shop = shopResp ? await shopResp.json().catch(() => ({})) : {};

      const { sales = [], summary = {}, itemSummary = [] } = data;
      const printMethods = summary.methods || {};

      const rowsHtml = sales.map(s => {
        const saleMethods = [...new Set((s.payments || []).map(p => p.method))].join('/');
        return `
  <div class="sale-row">
    <div class="inv">${s.invoice_no}</div>
    <div class="time">${ft(s.created_at)}</div>
    <div class="amt">${f(s.total)}</div>
    <div class="mth">[${saleMethods}]</div>
  </div>`;
      }).join('');

      const itemRowsHtml = itemSummary.map(item => `
  <div class="item-row">
    <div class="item-name">${item.product_name}</div>
    <div class="item-qty">x${Number(item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2))}</div>
    <div class="item-amt">${f(item.total)}</div>
  </div>`).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Daily Sales — ${data.date}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    width: 72mm;
    max-width: 72mm;
    padding: 4mm 2mm;
    color: #000;
  }
  .center { text-align: center; }
  .shop-name { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; }
  .sub { font-size: 10px; text-align: center; margin-bottom: 2px; }
  .divider { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .header-row {
    display: flex; justify-content: space-between;
    font-size: 9px; font-weight: bold;
    text-transform: uppercase;
    border-bottom: 1px solid #000;
    padding-bottom: 3px; margin-bottom: 2px;
  }
  .sale-row {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 0 4px;
    padding: 2px 0;
    border-bottom: 1px dotted #ccc;
    font-size: 10px;
  }
  .inv  { font-weight: bold; grid-column: 1; grid-row: 1; }
  .time { color: #555; grid-column: 1; grid-row: 2; font-size: 9px; }
  .amt  { font-weight: bold; text-align: right; grid-column: 2; grid-row: 1; }
  .mth  { text-align: right; color: #666; font-size: 9px; grid-column: 2; grid-row: 2; }
  .item-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0 4px;
    padding: 2px 0;
    border-bottom: 1px dotted #ddd;
    font-size: 10px;
  }
  .item-name { grid-column: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 38mm; }
  .item-qty  { grid-column: 2; color: #444; text-align: right; }
  .item-amt  { grid-column: 3; font-weight: bold; text-align: right; }
  .summary { margin-top: 6px; }
  .sum-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
  .sum-row.grand { font-weight: bold; font-size: 13px; border-top: 2px solid #000; margin-top: 4px; padding-top: 4px; }
  .footer { text-align: center; margin-top: 8px; font-size: 9px; color: #555; }
  @media print {
    html, body { overflow: visible !important; height: auto !important; }
    body { padding: 3mm 2mm; width: 72mm !important; max-width: 72mm !important; }
  }
</style>
</head>
<body>
  <div class="shop-name">${shop.shop_name || 'LMUC POS'}</div>
  <div class="sub">Daily Sales Report</div>
  <div class="sub">${fd(data.date + 'T00:00:00')}</div>
  <div class="sub">Cashier: ${user?.name || '—'}</div>
  <hr class="divider">

  <div class="section-title">Sales (${summary.count})</div>
  <div class="header-row"><span>Invoice</span><span>Total</span></div>
  ${rowsHtml || '<div style="text-align:center;padding:6px;font-size:10px">No sales today</div>'}
  <hr class="divider">

  <div class="section-title">Payment Methods</div>
  <div class="summary">
    ${Object.entries(printMethods).map(([m, amt]) => `<div class="sum-row"><span style="text-transform:capitalize">${m}</span><span>${f(amt)}</span></div>`).join('')}
    <div class="sum-row grand">
      <span>Grand Total</span>
      <span>${f(summary.total)}</span>
    </div>
  </div>
  <hr class="divider">

  ${itemSummary.length > 0 ? `
  <div class="section-title">Items Sold</div>
  <div class="header-row"><span>Item</span><span>Qty&nbsp;&nbsp;Total</span></div>
  ${itemRowsHtml}
  <hr class="divider">
  ` : ''}

  <div class="footer">Printed: ${new Date().toLocaleString('en-LK')}</div>
</body>
</html>`;

      if (window.electronAPI?.printReceiptHtml) {
        const r = await window.electronAPI.printReceiptHtml(html, { paperSize: '80mm' });
        if (r && !r.success) alert('Print failed: ' + (r.error || 'unknown'));
      } else {
        const win = window.open('', '_blank', 'width=350,height=800,scrollbars=yes');
        if (win) { win.document.write(html); win.document.close(); win.onload = () => win.print(); }
      }
    } catch (e) {
      alert('Print error: ' + e.message);
    } finally {
      setPrinting(false);
    }
  }

  const { sales = [], summary = {}, itemSummary = [] } = data || {};
  const methods = summary.methods || {};
  const methodColors = {
    cash:   'bg-green-100 text-green-700',
    card:   'bg-blue-100 text-blue-700',
    qr:     'bg-purple-100 text-purple-700',
    credit: 'bg-red-100 text-red-600',
    stamp:  'bg-yellow-100 text-yellow-700',
  };
  const methodBadgeColors = {
    cash:   'bg-green-100 text-green-700',
    card:   'bg-blue-100 text-blue-700',
    qr:     'bg-purple-100 text-purple-700',
    credit: 'bg-red-100 text-red-600',
    stamp:  'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="p-3 sm:p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Daily Sales Report</h1>
        <button onClick={handlePrint} disabled={printing || !data || loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 disabled:opacity-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8z"/>
          </svg>
          {printing ? 'Printing…' : 'Print'}
        </button>
      </div>

      {/* Date picker */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => fetchReport(date)} disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{err}</p>}

      {/* Summary cards — count + all payment methods */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 mb-1">Total Sales</p>
            <p className="text-lg font-bold text-slate-800">{summary.count || 0}</p>
          </div>
          {Object.entries(methods).map(([method, amount]) => {
            const colorCls = methodColors[method] || 'bg-slate-100 text-slate-700';
            const textCls  = colorCls.split(' ').find(c => c.startsWith('text-')) || 'text-slate-700';
            return (
              <div key={method} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs text-slate-400 mb-1 capitalize">{method}</p>
                <p className={`text-lg font-bold ${textCls}`}>{f(amount)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Grand total */}
      {data && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 flex items-center justify-between text-white">
          <span className="text-sm font-semibold opacity-80">Grand Total</span>
          <span className="text-2xl font-extrabold">{f(summary.total)}</span>
        </div>
      )}

      {/* Two-column layout: Sales list + Items Sold */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Sales list */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {sales.length} sale{sales.length !== 1 ? 's' : ''} — {fd(date + 'T00:00:00')}
              </p>
            </div>
            {!sales.length ? (
              <div className="py-12 text-center text-slate-400 text-sm">No sales recorded for this date</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold">Invoice</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Time</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Customer</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Method</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sales.map(s => {
                    const saleMethods = [...new Set((s.payments || []).map(p => p.method))];
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-600">{s.invoice_no}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{ft(s.created_at)}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{s.customer?.name || '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="flex flex-wrap gap-1 justify-center">
                            {saleMethods.map(m => (
                              <span key={m} className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${methodBadgeColors[m] || 'bg-slate-100 text-slate-600'}`}>{m}</span>
                            ))}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-800">{f(s.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Items sold */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Items Sold — {itemSummary.length} product{itemSummary.length !== 1 ? 's' : ''}
              </p>
            </div>
            {!itemSummary.length ? (
              <div className="py-12 text-center text-slate-400 text-sm">No items data</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold">Product</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {itemSummary.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-sm text-slate-800 font-medium">{item.product_name}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-slate-600">
                        {item.qty % 1 === 0 ? item.qty : Number(item.qty).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">{f(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Total</td>
                    <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-600">
                      {itemSummary.reduce((s, i) => s + i.qty, 0) % 1 === 0
                        ? itemSummary.reduce((s, i) => s + i.qty, 0)
                        : Number(itemSummary.reduce((s, i) => s + i.qty, 0)).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                      {f(itemSummary.reduce((s, i) => s + i.total, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
