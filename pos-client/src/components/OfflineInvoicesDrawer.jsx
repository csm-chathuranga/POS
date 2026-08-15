import { useEffect, useState, useCallback } from 'react';
import { getAllOfflineItems, clearOfflineQueue } from '../services/offlineQueue';

function fmt(n) {
  return parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateTime(s) {
  const d = new Date(s);
  return d.toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  synced:  'bg-green-100 text-green-700',
  failed:  'bg-red-100 text-red-700',
};

function invoiceNo(item) {
  return 'OFFLINE-' + item.client_id.slice(8).toUpperCase();
}

function buildPrintHtml(item, settings, user) {
  const p = item.payload || {};
  const items = p.items || [];
  const currency = settings?.currency || 'Rs.';
  const rows = items.map((it, idx) => `
    <div class="item-row">
      <span class="item-name">${idx + 1} ${it.product_name || it.name}</span>
      <span class="item-total">${fmt(it.total)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding-left:10px;font-weight:900;padding-bottom:4px;font-size:12px;">
      <span>${Number(it.qty)} × ${fmt(it.unit_price)}</span>
      ${parseFloat(it.discount) > 0 ? `<span>- ${fmt(it.discount)}</span>` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${invoiceNo(item)}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { overflow-x:hidden; }
    html, body { font-family:'Courier New', Courier, monospace; font-size:13px; font-weight:900; width:80mm; max-width:80mm; color:#000; word-break:break-word; overflow-wrap:break-word; }
    body { padding:5mm 4mm; }
    .logo { width:56px; height:56px; object-fit:contain; margin:0 auto 6px; display:block; border-radius:50%; }
    .shop-name { font-size:16px; font-weight:900; text-align:center; text-transform:uppercase; margin-bottom:3px; word-break:break-word; }
    .shop-meta { font-size:12px; font-weight:900; text-align:center; line-height:1.6; word-break:break-word; }
    .divider { border:none; border-top:2px solid #000; margin:8px 0; }
    .row { display:flex; justify-content:space-between; gap:6px; padding:3px 0; font-size:12px; }
    .row span:first-child { flex-shrink:0; }
    .row span:last-child { text-align:right; min-width:0; word-break:break-word; }
    .item-row { display:flex; justify-content:space-between; align-items:flex-start; gap:6px; font-weight:900; padding-top:5px; font-size:13px; }
    .item-name { flex:1; min-width:0; word-break:break-word; overflow-wrap:break-word; }
    .item-total { flex-shrink:0; text-align:right; }
    .total-row { display:flex; justify-content:space-between; gap:6px; font-weight:900; font-size:15px; padding:6px 0 4px; border-top:2px solid #000; margin-top:4px; }
    @media print {
      html, body { overflow: visible !important; height: auto !important; }
      @page { margin: 0; size: 80mm auto; }
      body { padding: 3mm; width: 80mm !important; }
    }
  </style></head>
  <body>
    ${settings?.shop_logo ? `<img class="logo" src="${settings.shop_logo}" alt="logo">` : ''}
    <div class="shop-name">${settings?.shop_name || 'LMUC POS'}</div>
    ${(settings?.address || settings?.phone) ? `<div class="shop-meta">${settings.address ? settings.address + '<br>' : ''}${settings.phone || ''}</div>` : ''}
    <hr class="divider">
    <div class="row"><span>Invoice</span><span>${invoiceNo(item)}</span></div>
    <div class="row"><span>Date</span><span>${fmtDateTime(item.created_at)}</span></div>
    <div class="row"><span>Cashier</span><span>${user?.name || '—'}</span></div>
    <hr class="divider">
    ${rows}
    <hr class="divider">
    <div class="row"><span>Subtotal</span><span>${fmt(p.subtotal)}</span></div>
    ${parseFloat(p.discount) > 0 ? `<div class="row"><span>Discount</span><span>- ${fmt(p.discount)}</span></div>` : ''}
    <div class="total-row"><span>Grand Total</span><span>${currency} ${fmt(p.total)}</span></div>
    <hr class="divider">
    <div style="text-align:center;margin-top:10px;font-size:11px;">Offline invoice — pending sync</div>
  </body></html>`;
}

export default function OfflineInvoicesDrawer({ open, onClose, onSync, syncing, settings, user }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [printingId, setPrintingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getAllOfflineItems()
      .then(all => setItems(all))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);
  // Refresh the list once a background sync finishes
  useEffect(() => { if (open && !syncing) load(); }, [syncing, open, load]);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  async function handlePrint(item) {
    setPrintingId(item.id);
    try {
      const html = buildPrintHtml(item, settings, user);
      if (window.electronAPI?.printReceiptHtml) {
        const r = await window.electronAPI.printReceiptHtml(html, { paperSize: '80mm' });
        if (r && !r.success) alert('Print failed: ' + (r.error || 'unknown error'));
      } else {
        const win = window.open('', '_blank', 'width=400,height=700,scrollbars=yes');
        if (win) { win.document.write(html); win.document.close(); win.onload = () => win.print(); }
      }
    } catch (err) {
      alert('Print error: ' + err.message);
    } finally {
      setPrintingId(null);
    }
  }

  const pendingCount = items.filter(i => i.status === 'pending').length;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      <div className={`fixed top-0 right-0 h-full w-[480px] max-w-full bg-white shadow-2xl z-50 flex flex-col
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 text-base">Offline Queue</h2>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button onClick={onSync} disabled={syncing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/>
                </svg>
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            )}
            <button
              onClick={async () => {
                if (!window.confirm('Clear all offline queue items? This cannot be undone.')) return;
                await clearOfflineQueue();
                load();
              }}
              title="Clear all queue"
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold px-2">
              Clear
            </button>
            <button onClick={load} title="Refresh"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            <button onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && !items.length ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No pending items</div>
          ) : (
            <div className="px-3 py-3 space-y-1.5">
              {items.map(item => {
                const p = item.payload || {};
                const isOpen = expanded === item.id;
                const isSale = item.type === 'sale';

                const TYPE_LABELS = {
                  sale: 'Sale', category_create: 'Category', category_edit: 'Category',
                  product_create: 'Product', product_edit: 'Product',
                  customer_create: 'Customer', customer_edit: 'Customer',
                  supplier_create: 'Supplier', supplier_edit: 'Supplier',
                };
                const isEdit = item.type?.endsWith('_edit');
                const typeLabel = TYPE_LABELS[item.type] || item.type;

                return (
                  <div key={item.id} className="rounded-xl border border-slate-100 overflow-hidden">
                    <button onClick={() => setExpanded(isOpen ? null : item.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors text-left">
                      <div className="min-w-0">
                        {isSale ? (
                          <p className="font-mono text-sm font-bold text-slate-800 truncate">{invoiceNo(item)}</p>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide shrink-0">
                              {typeLabel} {isEdit ? 'Edit' : 'New'}
                            </span>
                            <p className="text-sm font-semibold text-slate-800 truncate">{p.name || '—'}</p>
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(item.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        {isSale && <p className="font-bold text-sm text-slate-800">Rs. {fmt(p.total)}</p>}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-600'}`}>
                          {item.status}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/60">
                        {isSale ? (
                          <>
                            {(p.items || []).map((it, idx) => (
                              <div key={idx} className="flex justify-between text-xs py-1">
                                <span className="text-slate-600 truncate pr-2">{it.qty} × {it.product_name || it.name}</span>
                                <span className="font-semibold text-slate-700 shrink-0">{fmt(it.total)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs pt-2 mt-1 border-t border-slate-200">
                              <span className="text-slate-500 font-semibold">Subtotal</span>
                              <span className="font-bold text-slate-700">{fmt(p.subtotal)}</span>
                            </div>
                            {parseFloat(p.discount) > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500 font-semibold">Discount</span>
                                <span className="font-bold text-red-500">- {fmt(p.discount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs font-black text-slate-900 pt-1">
                              <span>Grand Total</span><span>{fmt(p.total)}</span>
                            </div>
                            {item.status === 'failed' && item.error && (
                              <p className="text-[11px] text-red-500 mt-2 break-words">{item.error}</p>
                            )}
                            <button onClick={() => handlePrint(item)} disabled={printingId === item.id}
                              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 disabled:opacity-60 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2m-12 0h12v6H6z"/>
                              </svg>
                              {printingId === item.id ? 'Printing…' : 'Print'}
                            </button>
                          </>
                        ) : (
                          <>
                            {Object.entries(p).filter(([k]) => k !== 'client_id').map(([k, v]) => (
                              <div key={k} className="flex justify-between text-xs py-0.5">
                                <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                                <span className="text-slate-700 font-medium truncate max-w-[60%] text-right">{String(v ?? '—')}</span>
                              </div>
                            ))}
                            {item.status === 'failed' && item.error && (
                              <p className="text-[11px] text-red-500 mt-2 break-words">{item.error}</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
