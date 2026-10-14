import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useGetLoadingSheetQuery,
  useAddSaleToSheetMutation,
  useRemoveSaleFromSheetMutation,
  useDeliverSheetMutation,
} from '../../features/loading-sheets/loadingSheetsApi';

const API_BASE = typeof window !== 'undefined' ? (window.__RUNTIME_CONFIG__?.API_URL || 'http://localhost:8000') : 'http://localhost:8000';

function PrintLetterhead({ sheet, items, total }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    fetch(`${API_BASE}/api/settings/public`)
      .then(r => r.json()).then(setInfo).catch(() => {});
  }, []);

  return (
    <div className="print-only hidden">
      {/* Letterhead */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #1e3a5f', paddingBottom: 12, marginBottom: 14 }}>
        {info?.shop_logo ? (
          <img src={info.shop_logo} alt="logo" style={{ width: 64, height: 64, objectFit: 'contain', marginRight: 16, borderRadius: 6 }} />
        ) : (
          <div style={{ width: 64, height: 64, background: '#1e3a5f', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16, color: '#fff', fontWeight: 800, fontSize: 28 }}>
            {(info?.shop_name || 'A')[0].toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', letterSpacing: '-0.3px' }}>{info?.shop_name || 'Business Name'}</div>
          {info?.address && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{info.address}</div>}
          {info?.phone   && <div style={{ fontSize: 11, color: '#475569' }}>Tel: {info.phone}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>Loading Sheet</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f', marginTop: 2 }}>{sheet?.sheet_no}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{fmtDate(sheet?.date)}</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Printed: {new Date().toLocaleString('en-LK')}</div>
        </div>
      </div>

      {/* Sheet meta */}
      {sheet?.note && (
        <div style={{ display: 'flex', gap: 32, marginBottom: 12, fontSize: 12 }}>
          {sheet.note.split(' | ').map((part, i) => {
            const labels = ['Driver', 'Vehicle', 'Route'];
            return (
              <div key={i}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{labels[i] || 'Info'}: </span>
                <span style={{ fontWeight: 700 }}>{part}</span>
              </div>
            );
          })}
          <div>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Status: </span>
            <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{sheet?.status}</span>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, background: '#f1f5f9', padding: '8px 12px', borderRadius: 4, fontSize: 12 }}>
        <div><span style={{ color: '#64748b' }}>Total Items: </span><strong>{items}</strong></div>
        <div><span style={{ color: '#64748b' }}>Total Value: </span><strong>Rs. {fmt(total)}</strong></div>
        {sheet?.delivered_at && <div><span style={{ color: '#64748b' }}>Delivered: </span><strong>{fmtDateTime(sheet.delivered_at)}</strong></div>}
      </div>
    </div>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LoadingSheetShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: sheet, isLoading, isFetching } = useGetLoadingSheetQuery(id, { refetchOnMountOrArgChange: true });
  const [addSale, { isLoading: adding }] = useAddSaleToSheetMutation();
  const [removeSale] = useRemoveSaleFromSheetMutation();
  const [deliverSheet, { isLoading: delivering }] = useDeliverSheetMutation();
  const [invoice, setInvoice] = useState('');
  const [addErr, setAddErr] = useState('');
  const [confirmDeliver, setConfirmDeliver] = useState(false);
  const [expanded, setExpanded] = useState({});
  const invoiceRef = useRef(null);

  function toggleExpand(sheetItemId) {
    setExpanded(s => ({ ...s, [sheetItemId]: !s[sheetItemId] }));
  }

  async function handleAddSale(e) {
    e.preventDefault();
    setAddErr('');
    try {
      await addSale({ id, invoice_no: invoice.trim() }).unwrap();
      setInvoice('');
      invoiceRef.current?.focus();
    } catch (ex) {
      setAddErr(ex?.data?.error || 'Failed to add sale');
    }
  }

  async function handleDeliver() {
    try {
      await deliverSheet(id).unwrap();
      setConfirmDeliver(false);
    } catch (ex) {
      alert(ex?.data?.error || 'Failed to mark as delivered');
    }
  }

  if (isLoading) return <div className="p-10 text-center text-slate-400">Loading…</div>;
  if (!sheet) return <div className="p-10 text-center text-slate-400">Sheet not found.</div>;

  const items = sheet.items || [];
  const total = items.reduce((s, it) => s + parseFloat(it.sale?.total || 0), 0);
  const isDelivered = sheet.status === 'delivered';

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/loading-sheets')}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{sheet.sheet_no}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                isDelivered ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>{sheet.status}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-500 text-amber-900 text-sm font-semibold rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4H7v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4h10z"/>
            </svg>
            Print
          </button>
          {!isDelivered && (
            <button onClick={() => setConfirmDeliver(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors">
              ✓ Mark as Delivered
            </button>
          )}
        </div>
      </div>

      {/* Print letterhead */}
      <PrintLetterhead sheet={sheet} items={items.length} total={total} />

      {/* Add sale form */}
      {!isDelivered && (
        <form onSubmit={handleAddSale} className="no-print bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Add Sale to Sheet</p>
          <div className="flex gap-2">
            <input ref={invoiceRef} value={invoice} onChange={e => setInvoice(e.target.value)}
              placeholder="Invoice number e.g. INV-20261014-0001"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
            <button type="submit" disabled={adding || !invoice.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
          {addErr && <p className="text-xs text-red-600">{addErr}</p>}
        </form>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 no-print">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Total Items</p>
          <p className="text-2xl font-bold text-blue-700">{items.length}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Total Value</p>
          <p className="text-lg font-bold text-slate-800">Rs. {fmt(total)}</p>
        </div>
        <div className={`border rounded-xl px-4 py-3 ${isDelivered ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDelivered ? 'text-green-600' : 'text-amber-600'}`}>Status</p>
          <p className={`text-lg font-bold ${isDelivered ? 'text-green-700' : 'text-amber-700'}`}>{isDelivered ? 'Delivered' : 'Open'}</p>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white border overflow-hidden rounded-xl">
        {isFetching && <div className="px-4 py-1 text-xs text-blue-500 bg-blue-50">Refreshing…</div>}
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider" style={{ background: '#1e3a5f' }}>
            <tr>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>#</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>Invoice</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>Customer</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>Phone</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>Address</th>
              <th className="px-4 py-3 text-right font-semibold" style={{ color: '#fff' }}>Total</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>Sale Status</th>
              <th className="px-4 py-3 no-print w-16"></th>
            </tr>
          </thead>
          <tbody>
            {!items.length && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No sales on this sheet yet. Add by invoice number above.</td></tr>
            )}
            {items.map((it, i) => {
              const sale = it.sale || {};
              const customer = sale.customer || {};
              const saleItems = sale.items || [];
              const isOpen = expanded[it.id];
              return (
                <React.Fragment key={it.id}>
                  <tr className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                      <div className="flex items-center gap-1.5">
                        {saleItems.length > 0 && (
                          <button onClick={() => toggleExpand(it.id)}
                            className="shrink-0 text-slate-400 hover:text-blue-600 transition-colors no-print" title="Show items">
                            <svg className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                        <Link to={`/sales/${sale.id}`} className="hover:underline" target="_blank">{sale.invoice_no}</Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{customer.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{customer.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate">{customer.address || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">Rs. {fmt(sale.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        sale.status === 'paid' ? 'bg-green-100 text-green-700' :
                        sale.status === 'credit' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{sale.status}</span>
                    </td>
                    <td className="px-3 py-3 no-print">
                      {!isDelivered && (
                        <button onClick={() => removeSale({ id, saleId: sale.id })}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remove from sheet">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                  {saleItems.length > 0 && (
                    <tr className={`sale-items-row border-b border-slate-100 ${isOpen ? 'bg-blue-50/60' : 'hidden'}`}>
                      <td colSpan={8} className="px-6 pb-3 pt-1">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-200">
                              <th className="text-left py-1.5 font-semibold">Product</th>
                              <th className="text-right py-1.5 font-semibold w-16">Qty</th>
                              <th className="text-right py-1.5 font-semibold w-24">Unit Price</th>
                              <th className="text-right py-1.5 font-semibold w-24">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {saleItems.map(si => (
                              <tr key={si.id} className="border-b border-slate-100 last:border-0">
                                <td className="py-1.5 text-slate-700 font-medium">{si.product_name}</td>
                                <td className="py-1.5 text-right text-slate-600">{parseFloat(si.qty)}</td>
                                <td className="py-1.5 text-right text-slate-600">Rs. {fmt(si.unit_price)}</td>
                                <td className="py-1.5 text-right font-semibold text-slate-800">Rs. {fmt(si.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 border-t border-slate-200">
                <td colSpan={5} className="px-4 py-3 font-bold text-slate-700 text-xs uppercase">{items.length} sale{items.length !== 1 ? 's' : ''}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">Rs. {fmt(total)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Deliver confirmation modal */}
      {confirmDeliver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Mark as Delivered?</h3>
              <p className="text-sm text-slate-500 mt-1">
                All <strong>{items.length}</strong> sale{items.length !== 1 ? 's' : ''} on sheet <strong>{sheet.sheet_no}</strong> will be marked as delivered. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeliver(false)}
                className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50">Cancel</button>
              <button onClick={handleDeliver} disabled={delivering}
                className="flex-1 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60">
                {delivering ? 'Saving…' : 'Confirm Delivered'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
