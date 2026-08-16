import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateSaleMutation } from '../../features/sales/salesApi';
import { useGetCustomersQuery, useQuickAddCustomerMutation } from '../../features/customers/customersApi';
import useProductCache from '../../hooks/useProductCache';

const fmt     = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const todayStr = () => new Date().toISOString().slice(0, 10);

function recalc(item) {
  const price = parseFloat(item.unit_price) || 0;
  const qty   = parseFloat(item.qty) || 0;
  const disc  = parseFloat(item.discount) || 0;
  return { ...item, total: Math.max(0, price * qty - disc) };
}

export default function InvoiceCreate() {
  const navigate    = useNavigate();
  const [createSale, { isLoading: saving }] = useCreateSaleMutation();
  const { products } = useProductCache();

  // ── Header ────────────────────────────────────────────────────────────────
  const [customer, setCustomer]     = useState(null);
  const [custQuery, setCustQuery]   = useState('');
  const [showCust, setShowCust]     = useState(false);
  const [date, setDate]             = useState(todayStr());
  const [note, setNote]             = useState('');

  const { data: custData } = useGetCustomersQuery({ search: custQuery }, { skip: custQuery.length < 2 });
  const customers = custData?.data || [];

  const [quickAdd, { isLoading: addingCust }] = useQuickAddCustomerMutation();
  const [qcOpen, setQcOpen]   = useState(false);
  const [qcName, setQcName]   = useState('');
  const [qcPhone, setQcPhone] = useState('');
  const [qcErr, setQcErr]     = useState('');

  async function handleQuickAdd(e) {
    e.preventDefault();
    setQcErr('');
    if (!qcName.trim()) { setQcErr('Name required'); return; }
    try {
      const res = await quickAdd({ name: qcName.trim(), phone: qcPhone || null }).unwrap();
      const c = res.customer;
      setCustomer(c);
      setCustQuery(c.name);
      setQcOpen(false); setQcName(''); setQcPhone('');
    } catch (e) { setQcErr(e?.data?.error || 'Failed'); }
  }

  // ── Line item entry ───────────────────────────────────────────────────────
  const [prodQuery, setProdQuery]   = useState('');
  const [showProd, setShowProd]     = useState(false);
  const [activeIdx, setActive]      = useState(-1);
  const [entry, setEntry]           = useState({ name: '', unit_price: '', qty: '1', discount: '0' });
  const [selProduct, setSelProduct] = useState(null);
  const qtyRef  = useRef(null);
  const priceRef = useRef(null);

  const dropItems = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q))
    ).slice(0, 12);
  }, [prodQuery, products]);

  function selectProduct(p) {
    setEntry(e => ({ ...e, name: p.name, unit_price: String(parseFloat(p.selling_price) || '') }));
    setProdQuery(p.name);
    setSelProduct(p);
    setShowProd(false);
    setActive(-1);
    setTimeout(() => qtyRef.current?.select(), 20);
  }

  // ── Line items list ───────────────────────────────────────────────────────
  const [lines, setLines]   = useState([]);
  const [err, setErr]       = useState('');

  function addLine() {
    setErr('');
    if (!entry.name.trim()) { setErr('Item name required'); return; }
    const price = parseFloat(entry.unit_price);
    if (!price || price <= 0) { setErr('Price required'); return; }
    const qty  = parseFloat(entry.qty) || 1;
    const disc = parseFloat(entry.discount) || 0;
    if (selProduct !== null) {
      const avail = parseFloat(selProduct.stock_qty) || 0;
      if (qty > avail) { setErr(`Only ${avail} in stock`); return; }
    }
    setLines(l => [...l, recalc({
      name: entry.name.trim(), unit_price: price, qty, discount: disc, total: 0,
      product_id: selProduct?.id || null,
      avail: selProduct ? parseFloat(selProduct.stock_qty) : null,
    })]);
    setEntry({ name: '', unit_price: '', qty: '1', discount: '0' });
    setProdQuery('');
    setSelProduct(null);
  }

  function removeLine(i) {
    setLines(l => l.filter((_, idx) => idx !== i));
  }

  function updateLine(i, field, val) {
    setLines(l => l.map((item, idx) => idx === i ? recalc({ ...item, [field]: val }) : item));
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal   = lines.reduce((s, l) => s + parseFloat(l.unit_price) * parseFloat(l.qty), 0);
  const totalDisc  = lines.reduce((s, l) => s + parseFloat(l.discount || 0), 0);
  const total      = lines.reduce((s, l) => s + l.total, 0);

  // ── Payment ───────────────────────────────────────────────────────────────
  const [method, setMethod]   = useState('cash');

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setErr('');
    if (!lines.length) { setErr('Add at least one item'); return; }
    for (const l of lines) {
      if (l.avail !== null && parseFloat(l.qty) > l.avail) {
        setErr(`"${l.name}" — only ${l.avail} in stock`); return;
      }
    }

    const isCredit = method === 'credit';
    const payments = [{ method, amount: total }];

    const payload = {
      customer_id: customer?.id || null,
      subtotal, discount: totalDisc, tax: 0, extra_charges: 0,
      total,
      paid: isCredit ? 0 : total,
      balance: isCredit ? total : 0,
      note,
      items: lines.map(l => ({
        product_id: l.product_id || null, variant_id: null,
        product_name: l.name,
        unit_price: l.unit_price, original_price: l.unit_price,
        cost_price: 0, qty: l.qty, discount: l.discount || 0, total: l.total,
      })),
      payments,
    };

    try {
      const result = await createSale(payload).unwrap();
      navigate(`/invoices/${result.id}`);
    } catch (e) {
      setErr(e?.data?.error || 'Failed to save invoice');
    }
  }

  const METHODS = [
    { id: 'cash',   label: 'Cash' },
    { id: 'card',   label: 'Card' },
    { id: 'credit', label: 'Credit' },
  ];

  return (
    <>
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">New Invoice</h1>
      </div>

      {/* Invoice header fields */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Customer */}
        <div className="relative sm:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500">Customer</label>
            <button type="button" onClick={() => { setQcOpen(true); setQcName(''); setQcPhone(''); setQcErr(''); }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Quick Add
            </button>
          </div>
          <div className="relative">
            <input value={custQuery}
              onChange={e => { setCustQuery(e.target.value); setShowCust(true); setCustomer(null); }}
              onFocus={() => setShowCust(true)}
              onBlur={() => setTimeout(() => setShowCust(false), 150)}
              placeholder="Search by name or phone…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            {customer && (
              <button onClick={() => { setCustomer(null); setCustQuery(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg">&times;</button>
            )}
            {showCust && customers.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-44 overflow-y-auto">
                {customers.map(c => (
                  <button key={c.id} onMouseDown={() => { setCustomer(c); setCustQuery(c.name); setShowCust(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-slate-50 last:border-0">
                    <p className="font-semibold">{c.name}</p>
                    {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {customer && (
            <p className="text-xs text-green-600 font-medium mt-1">✓ {customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Note */}
        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Note</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Add line item */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">Add Item</h2>

        <div className="grid grid-cols-12 gap-2 items-end">
          {/* Product search */}
          <div className="col-span-12 sm:col-span-5 relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Item / Product
              {selProduct && (
                <span className={`ml-2 ${parseFloat(selProduct.stock_qty) <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                  · Available: {parseFloat(selProduct.stock_qty)}
                </span>
              )}
            </label>
            <input value={prodQuery}
              onChange={e => { setProdQuery(e.target.value); setEntry(v => ({ ...v, name: e.target.value })); setSelProduct(null); setShowProd(true); setActive(-1); }}
              onFocus={() => setShowProd(true)}
              onBlur={() => setTimeout(() => setShowProd(false), 150)}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, dropItems.length - 1)); }
                if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
                if (e.key === 'Enter' && activeIdx >= 0 && dropItems[activeIdx]) { selectProduct(dropItems[activeIdx]); }
                if (e.key === 'Tab') { setShowProd(false); }
              }}
              placeholder="Type to search or enter custom name"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            {showProd && dropItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto">
                {dropItems.map((p, i) => (
                  <button key={p.id} onMouseDown={() => selectProduct(p)}
                    className={`w-full text-left px-4 py-2 text-sm border-b border-slate-50 last:border-0 ${i === activeIdx ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-slate-400 text-xs">Rs. {fmt(p.selling_price)}</span>
                    <span className={`ml-2 text-xs font-semibold ${parseFloat(p.stock_qty) <= 0 ? 'text-red-400' : 'text-green-600'}`}>
                      ({parseFloat(p.stock_qty)} in stock)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Qty */}
          <div className="col-span-4 sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Qty</label>
            <input ref={qtyRef} type="number" min="0.001" step="any" value={entry.qty}
              max={selProduct ? parseFloat(selProduct.stock_qty) : undefined}
              onChange={e => {
                let v = e.target.value;
                if (selProduct) {
                  const avail = parseFloat(selProduct.stock_qty) || 0;
                  if (parseFloat(v) > avail) v = String(avail);
                }
                setEntry(prev => ({ ...prev, qty: v }));
              }}
              onFocus={e => e.target.select()}
              onKeyDown={e => { if (e.key === 'Enter') priceRef.current?.select(); }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-right" />
          </div>

          {/* Price */}
          <div className="col-span-4 sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Unit Price</label>
            <input ref={priceRef} type="number" min="0" step="any" value={entry.unit_price}
              onChange={e => setEntry(v => ({ ...v, unit_price: e.target.value }))}
              onFocus={e => e.target.select()}
              onKeyDown={e => { if (e.key === 'Enter') addLine(); }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-right" />
          </div>

          {/* Discount */}
          <div className="col-span-4 sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Discount</label>
            <input type="number" min="0" step="any" value={entry.discount}
              onChange={e => setEntry(v => ({ ...v, discount: e.target.value }))}
              onFocus={e => e.target.select()}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-right" />
          </div>

          {/* Add button */}
          <div className="col-span-12 sm:col-span-1">
            <button onClick={addLine}
              className="w-full h-[38px] bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>

        {err && <p className="text-xs text-red-500 font-medium">{err}</p>}
      </div>

      {/* Line items list */}
      {lines.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Line Items ({lines.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Item</th>
                  <th className="px-4 py-3 text-right font-semibold">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold">Price</th>
                  <th className="px-4 py-3 text-right font-semibold">Disc</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lines.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{l.name}</td>
                    <td className="px-4 py-2.5 text-right">
                      <input type="number" value={l.qty} min="0.001" step="any"
                        max={l.avail !== null ? l.avail : undefined}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 1;
                          updateLine(i, 'qty', l.avail !== null ? Math.min(v, l.avail) : v);
                        }}
                        className={`w-16 text-right rounded-lg border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 ${l.avail !== null && parseFloat(l.qty) > l.avail ? 'border-red-400' : 'border-slate-200'}`} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input type="number" value={l.unit_price} min="0" step="any"
                        onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-24 text-right rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input type="number" value={l.discount} min="0" step="any"
                        onChange={e => updateLine(i, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-20 text-right rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">Rs. {fmt(l.total)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => removeLine(i)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
            <div className="space-y-1.5 text-sm min-w-48">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>Rs. {fmt(subtotal)}</span>
              </div>
              {totalDisc > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Discount</span>
                  <span className="text-red-500">- Rs. {fmt(totalDisc)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-slate-800 pt-1.5 border-t border-slate-200">
                <span>Total</span>
                <span>Rs. {fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment & Save */}
      {lines.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700">Payment</h2>

          <div className="flex flex-wrap gap-2">
            {METHODS.map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  method === m.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}>
                {m.label}
              </button>
            ))}
          </div>


          <div className="flex gap-3 pt-1">
            <button onClick={() => navigate('/invoices')}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60 hover:bg-blue-700 transition-colors">
              {saving ? 'Saving…' : 'Save Invoice'}
            </button>
          </div>
        </div>
      )}
    </div>

      {/* Quick Add Customer Modal */}
      {qcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Quick Add Customer</h2>
              <button onClick={() => setQcOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-lg">&times;</button>
            </div>
            <form onSubmit={handleQuickAdd} className="px-6 py-4 space-y-3">
              {qcErr && <p className="text-xs text-red-500 font-medium bg-red-50 rounded-lg px-3 py-2">{qcErr}</p>}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Name *</label>
                <input value={qcName} onChange={e => setQcName(e.target.value)} autoFocus required
                  placeholder="Customer name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                <input value={qcPhone} onChange={e => setQcPhone(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setQcOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={addingCust}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60 hover:bg-blue-700">
                  {addingCust ? 'Adding…' : 'Add & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
