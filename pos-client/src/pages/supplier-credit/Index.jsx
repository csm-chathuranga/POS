import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetSuppliersQuery, useGetAllSupplierPaymentsQuery } from '../../features/suppliers/suppliersApi';

const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => s ? new Date(s).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function PastPaymentsModal({ onClose }) {
  const [search, setSearch] = useState('');
  const { data: payments = [], isLoading } = useGetAllSupplierPaymentsQuery();

  const filtered = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.supplier_name.toLowerCase().includes(q) ||
      (p.ref_no && p.ref_no.toLowerCase().includes(q)) ||
      (p.note && p.note.toLowerCase().includes(q)) ||
      (p.recorded_by && p.recorded_by.toLowerCase().includes(q))
    );
  });

  const total = filtered.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Past Supplier Payments</h2>
            <p className="text-xs text-slate-400 mt-0.5">All recorded payments to suppliers</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search + summary */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search supplier, ref, note…"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="text-sm text-slate-600 shrink-0">
            <span className="text-xs text-slate-400 mr-1">{filtered.length} records · Total paid:</span>
            <span className="font-bold text-orange-600">Rs. {fmt(total)}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No payment records found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800 text-white text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Ref No</th>
                  <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Note</th>
                  <th className="px-4 py-3 text-left font-semibold">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="odd:bg-white even:bg-slate-50 border-b border-slate-100 hover:bg-orange-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.ref_no || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {p.supplier_name}
                      {p.supplier_phone && <span className="block text-xs text-slate-400">{p.supplier_phone}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">Rs. {fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{p.note || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.recorded_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SupplierCreditIndex() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [showPastPayments, setShowPastPayments] = useState(false);

  const { data: suppliers = [], isLoading } = useGetSuppliersQuery();

  const rows = suppliers.filter(s => {
    const hasBalance = parseFloat(s.payable_balance) > 0;
    if (!applied) return hasBalance;
    const q = applied.toLowerCase();
    return hasBalance && (s.name.toLowerCase().includes(q) || (s.phone || '').includes(q));
  });

  const totalOutstanding = rows.reduce((s, c) => s + parseFloat(c.payable_balance || 0), 0);

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Supplier Payables</h1>
        <button
          onClick={() => setShowPastPayments(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
          </svg>
          Past Payments
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <p className="text-xs text-slate-500 mb-1">Total Outstanding Payable</p>
        <p className="text-3xl font-bold text-orange-600">Rs. {fmt(totalOutstanding)}</p>
        <p className="text-xs text-slate-400 mt-1">{rows.length} supplier{rows.length !== 1 ? 's' : ''} with unpaid balance</p>
      </div>

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); setApplied(search); }}
        className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Supplier name / phone…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#1e3a5f' }} className="text-white text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                  <th className="px-4 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No outstanding supplier payables.</td></tr>
                )}
                {rows.map(s => (
                  <tr key={s.id} className="odd:bg-white even:bg-slate-50 hover:bg-orange-50 border-b border-slate-100 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-500">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600">Rs. {fmt(s.payable_balance)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`/suppliers/${s.id}/credit`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPastPayments && <PastPaymentsModal onClose={() => setShowPastPayments(false)} />}
    </div>
  );
}
