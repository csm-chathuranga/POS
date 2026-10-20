import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGetSaleQuery, useMarkSalePaidMutation } from '../../features/sales/salesApi';
import { api } from '../../app/baseApi';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';

const settingsApi = api.injectEndpoints({
  endpoints: b => ({
    getInvoiceSettings: b.query({ query: () => '/settings', providesTags: ['Settings'] }),
  }),
  overrideExisting: false,
});

const fmt     = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

export default function InvoiceShow() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { data: sale, isLoading } = useGetSaleQuery(id);
  const [markPaid, { isLoading: marking }] = useMarkSalePaidMutation();
  const [markErr, setMarkErr] = useState('');
  const token = useSelector(selectToken);

  async function handleMarkPaid() {
    setMarkErr('');
    try { await markPaid(id).unwrap(); }
    catch (e) { setMarkErr(e?.data?.error || 'Failed'); }
  }
  const { data: rawSettings } = settingsApi.useGetInvoiceSettingsQuery(undefined, { skip: !token });

  const shop = {
    name:    rawSettings?.shop_name    || '',
    address: rawSettings?.address      || '',
    phone:   rawSettings?.phone        || '',
    email:   rawSettings?.email        || '',
  };


  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>
  );
  if (!sale) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Invoice not found</div>
  );

  const items    = sale.items || [];
  const payments = sale.payments || [];
  const subtotal = items.reduce((s, i) => s + parseFloat(i.unit_price) * parseFloat(i.qty), 0);
  const totalDisc= items.reduce((s, i) => s + parseFloat(i.discount || 0), 0);

  return (
    <>
      {/* Screen toolbar — hidden when printing */}
      <div className="print:hidden flex items-center gap-3 p-4 bg-white border-b border-slate-200 sticky top-0 z-10">
        <button onClick={() => navigate('/invoices')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="font-bold text-slate-800 flex-1">Invoice {sale.invoice_no}</h1>
        {parseFloat(sale.balance) > 0 && (
          <div className="flex items-center gap-2">
            {markErr && <span className="text-xs text-red-500">{markErr}</span>}
            <button onClick={handleMarkPaid} disabled={marking}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              {marking ? 'Saving…' : 'Mark as Paid'}
            </button>
          </div>
        )}
        {parseFloat(sale.balance) <= 0 && payments.some(p => p.method === 'credit') && (
          <span className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold">Paid</span>
        )}
        <Link to={`/invoices/create`}
          className="px-4 py-2 border border-slate-200 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
          New Invoice
        </Link>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Print
        </button>
      </div>

      {/* A4 invoice — centered on screen, full width when printing */}
      <div className="print:m-0 print:p-0 bg-slate-100 print:bg-white min-h-screen py-8 print:py-0">
        <div
          id="invoice-a4"
          className="bg-white mx-auto print:mx-0 print:shadow-none shadow-xl"
          style={{ width: '210mm', minHeight: '297mm', padding: '15mm 18mm', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>

          {/* Company header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10mm', borderBottom: '2px solid #1e293b', paddingBottom: '6mm' }}>
            <div>
              <div style={{ fontSize: '22pt', fontWeight: 'bold', color: '#1e293b', lineHeight: 1.2 }}>{shop.name}</div>
              {shop.address && <div style={{ fontSize: '9pt', color: '#64748b', marginTop: '2mm' }}>{shop.address}</div>}
              {shop.phone   && <div style={{ fontSize: '9pt', color: '#64748b' }}>Tel: {shop.phone}</div>}
              {shop.email   && <div style={{ fontSize: '9pt', color: '#64748b' }}>{shop.email}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20pt', fontWeight: 'bold', color: '#2563eb', letterSpacing: '1px' }}>INVOICE</div>
              <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#1e293b', marginTop: '2mm' }}>{sale.invoice_no}</div>
              <div style={{ fontSize: '9pt', color: '#64748b', marginTop: '1mm' }}>Date: {fmtDate(sale.created_at)}</div>
            </div>
          </div>

          {/* Bill to */}
          {sale.customer && (
            <div style={{ marginBottom: '8mm' }}>
              <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2mm' }}>Bill To</div>
              <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#1e293b' }}>{sale.customer.name}</div>
              {sale.customer.phone && <div style={{ fontSize: '9pt', color: '#64748b' }}>{sale.customer.phone}</div>}
            </div>
          )}

          {/* Line items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm', fontSize: '9.5pt' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
                <th style={{ padding: '2.5mm 3mm', textAlign: 'left', fontWeight: 'bold', width: '8mm' }}>#</th>
                <th style={{ padding: '2.5mm 3mm', textAlign: 'left', fontWeight: 'bold' }}>Description</th>
                <th style={{ padding: '2.5mm 3mm', textAlign: 'right', fontWeight: 'bold', width: '20mm' }}>Qty</th>
                <th style={{ padding: '2.5mm 3mm', textAlign: 'right', fontWeight: 'bold', width: '28mm' }}>Unit Price</th>
                <th style={{ padding: '2.5mm 3mm', textAlign: 'right', fontWeight: 'bold', width: '22mm' }}>Disc</th>
                <th style={{ padding: '2.5mm 3mm', textAlign: 'right', fontWeight: 'bold', width: '28mm' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '2.5mm 3mm', color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ padding: '2.5mm 3mm', fontWeight: '500', color: '#1e293b' }}>{item.product_name}</td>
                  <td style={{ padding: '2.5mm 3mm', textAlign: 'right', color: '#475569' }}>{parseFloat(item.qty)}</td>
                  <td style={{ padding: '2.5mm 3mm', textAlign: 'right', color: '#475569' }}>{fmt(item.unit_price)}</td>
                  <td style={{ padding: '2.5mm 3mm', textAlign: 'right', color: '#ef4444' }}>
                    {parseFloat(item.discount) > 0 ? fmt(item.discount) : '—'}
                  </td>
                  <td style={{ padding: '2.5mm 3mm', textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10mm' }}>
            <div style={{ minWidth: '80mm', fontSize: '9.5pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5mm 0', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <span>Subtotal</span>
                <span>Rs. {fmt(subtotal)}</span>
              </div>
              {totalDisc > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5mm 0', borderBottom: '1px solid #e2e8f0', color: '#ef4444' }}>
                  <span>Discount</span>
                  <span>- Rs. {fmt(totalDisc)}</span>
                </div>
              )}
              {parseFloat(sale.tax) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5mm 0', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <span>Tax</span>
                  <span>Rs. {fmt(sale.tax)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5mm 3mm', backgroundColor: '#1e293b', color: 'white', fontWeight: 'bold', fontSize: '11pt', marginTop: '2mm', borderRadius: '2mm' }}>
                <span>TOTAL</span>
                <span>Rs. {fmt(sale.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment method */}
          {payments.length > 0 && (
            <div style={{ marginBottom: '8mm', padding: '3mm 4mm', backgroundColor: '#f1f5f9', borderRadius: '2mm', fontSize: '9pt' }}>
              <span style={{ color: '#64748b', fontWeight: 'bold' }}>Payment: </span>
              {payments.map(p => (
                <span key={p.id} style={{ marginRight: '8mm', textTransform: 'capitalize', color: '#1e293b' }}>
                  {p.method} — Rs. {fmt(p.amount)}
                </span>
              ))}
            </div>
          )}

          {/* Note */}
          {sale.note && (
            <div style={{ marginBottom: '8mm', fontSize: '9pt', color: '#64748b' }}>
              <strong>Note:</strong> {sale.note}
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '5mm', textAlign: 'center', fontSize: '8.5pt', color: '#94a3b8' }}>
            {rawSettings?.receipt_footer || 'Thank you for your business!'}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body > *:not(#root) { display: none; }
          .print\\:hidden { display: none !important; }
          html, body { background: white !important; overflow: visible !important; height: auto !important; }
          #root, #root > *, #root > * > * { overflow: visible !important; height: auto !important; max-height: none !important; }
        }
      `}</style>
    </>
  );
}
