import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatePurchaseMutation } from '../../features/purchases/purchasesApi';
import { useGetSuppliersQuery } from '../../features/suppliers/suppliersApi';
import { useLocale } from '../../contexts/LocaleContext';
import useProductCache from '../../hooks/useProductCache';

const today = () => new Date().toISOString().slice(0, 10);
const fmt   = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

function emptyItem(p) {
  return {
    product_id:    p.id,
    product_name:  p.name,
    qty:           1,
    free_qty:      0,
    cost_price:    p.cost_price ?? '',
    selling_price: p.selling_price ?? '',
  };
}

// ─── Product Tile ──────────────────────────────────────────────────────────────
function ProductTile({ product, onAdd }) {
  const initial = (product.name || '?')[0].toUpperCase();
  return (
    <button type="button" onClick={() => onAdd(product)}
      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-slate-100 bg-white hover:border-emerald-400 hover:shadow-md active:scale-95 transition-all text-left w-full">
      {product.image ? (
        <img src={product.image} alt={product.name} className="w-14 h-14 object-cover rounded-lg" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-emerald-600 text-xl font-black select-none">
          {initial}
        </div>
      )}
      <div className="w-full">
        <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2 text-center">{product.name}</p>
        <p className="text-xs font-bold text-emerald-700 text-center mt-0.5">Rs.{fmt(product.cost_price)}</p>
        <p className={`text-[10px] text-center ${(product.stock_qty ?? 0) > 0 ? 'text-slate-400' : 'text-red-400 font-semibold'}`}>
          {(product.stock_qty ?? 0) > 0 ? `Stk: ${fmt(product.stock_qty)}` : 'Out of stock'}
        </p>
      </div>
    </button>
  );
}

// ─── Cart Row (middle panel) ───────────────────────────────────────────────────
function CartRow({ item, idx, onChange, onRemove }) {
  const qtyRef  = useRef(null);
  const costRef = useRef(null);
  const freeRef = useRef(null);
  const lineTotal = (parseFloat(item.cost_price) || 0) * (parseFloat(item.qty) || 0);

  return (
    <div className="px-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold text-slate-800 leading-tight flex-1 min-w-0 truncate">{item.product_name}</p>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-sm font-bold text-slate-700">Rs.{fmt(lineTotal)}</span>
          <button onClick={() => onRemove(idx)} className="text-red-300 hover:text-red-500 ml-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => onChange(idx, 'qty', Math.max(0.001, (parseFloat(item.qty) || 1) - 1))}
            className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold flex items-center justify-center transition-colors">−</button>
          <input ref={qtyRef} type="number" min="0.001" step="0.001" value={item.qty}
            onChange={e => onChange(idx, 'qty', e.target.value)}
            onFocus={e => e.target.select()}
            className="w-14 text-center rounded border border-slate-200 px-1 py-1 text-sm font-semibold outline-none focus:ring-1 focus:ring-emerald-500" />
          <button onClick={() => onChange(idx, 'qty', (parseFloat(item.qty) || 1) + 1)}
            className="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm font-bold flex items-center justify-center transition-colors">+</button>
        </div>
        <span className="text-slate-300 text-xs">×</span>
        <input ref={costRef} type="number" min="0" step="0.01" value={item.cost_price}
          onChange={e => onChange(idx, 'cost_price', e.target.value)}
          onFocus={e => e.target.select()}
          placeholder="Cost"
          className="flex-1 text-right rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
        <input ref={freeRef} type="number" min="0" step="1" value={item.free_qty}
          onChange={e => onChange(idx, 'free_qty', e.target.value)}
          onFocus={e => e.target.select()}
          placeholder="Free"
          className="w-14 text-right rounded border border-green-200 bg-green-50 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-green-500" />
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function PurchaseCreate2() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [create, { isLoading }] = useCreatePurchaseMutation();
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const { products: allProducts } = useProductCache();

  const [form, setForm] = useState({
    supplier_id: '', purchase_date: today(), status: 'received',
    paid: '', due_date: '', note: '', discount: '',
  });
  const [items, setItems]   = useState([]);
  const [search, setSearch] = useState('');
  const [err, setErr]       = useState('');

  // ── Inline return state ──────────────────────────────────────────────────────
  const [returnOpen,  setReturnOpen]  = useState(false);
  const [returnType,  setReturnType]  = useState('damaged');
  const [returnItems, setReturnItems] = useState([]);
  const [returnSearch, setReturnSearch] = useState('');
  const searchRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tileProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [search, allProducts]);

  function addProduct(p) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.product_id === p.id);
      if (idx >= 0) return prev.map((item, i) => i === idx ? { ...item, qty: parseFloat(item.qty) + 1 } : item);
      return [...prev, emptyItem(p)];
    });
  }

  const updateItem = useCallback((idx, field, val) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }, []);

  const removeItem = useCallback(idx => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const subtotal   = items.reduce((s, i) => s + (parseFloat(i.cost_price) || 0) * (parseFloat(i.qty) || 0), 0);
  const discount   = Math.min(parseFloat(form.discount || 0), subtotal);
  const grandTotal = Math.max(0, subtotal - discount);
  const paidAmt    = parseFloat(form.paid || 0);
  const balance    = Math.max(0, grandTotal - paidAmt);

  async function handleSubmit() {
    setErr('');
    if (!form.supplier_id) return setErr('Please select a supplier');
    if (!items.length) return setErr(t('pur.add_row'));
    try {
      const payload = { ...form, subtotal, discount, total: grandTotal, items };
      if (returnItems.length > 0) {
        payload.return_items = returnItems.map(i => ({
          product_id: i.product_id, product_name: i.product_name,
          qty: parseFloat(i.qty), cost_price: parseFloat(i.cost_price) || 0,
        }));
        payload.return_type = returnType;
      }
      await create(payload).unwrap();
      navigate('/purchases');
    } catch (e) { setErr(e?.data?.error || t('lbl.error')); }
  }

  return (
    <div className="flex bg-slate-100 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Col 1: Product tiles ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-slate-200">

        {/* Search */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
            </div>
            <input ref={searchRef} value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter products… (F1)"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{tileProducts.length} products</p>
        </div>

        {/* Tiles */}
        <div className="flex-1 overflow-y-auto p-3">
          {tileProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
              {tileProducts.map(p => (
                <ProductTile key={p.id} product={p} onAdd={addProduct} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Col 2: Cart ────────────────────────────────────────────────────── */}
      <div className="w-[500px] flex flex-col bg-white border-r border-slate-200 overflow-hidden">

        {/* Cart header */}
        <div className="px-4 py-3 bg-emerald-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
            <span className="text-sm font-bold">Cart</span>
            {items.length > 0 && (
              <span className="bg-white text-emerald-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{items.length}</span>
            )}
          </div>
          {items.length > 0 && (
            <button onClick={() => setItems([])} className="text-xs text-emerald-200 hover:text-white">Clear</button>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-4">
              <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
              <p className="text-sm text-center">Tap a product tile to add items</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <CartRow key={`${item.product_id}-${idx}`} item={item} idx={idx}
                onChange={updateItem} onRemove={removeItem} />
            ))
          )}
        </div>

        {/* Cart totals summary */}
        {items.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 shrink-0">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
              <span>{items.reduce((s, i) => s + (parseFloat(i.qty) || 0), 0).toFixed(2)} units</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-800">
              <span>Subtotal</span>
              <span>Rs. {fmt(subtotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Col 3: Form + Totals ───────────────────────────────────────────── */}
      <div className="w-72 bg-white flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-sm font-bold text-slate-700">{t('pur.grn')}</span>
          <button onClick={() => navigate('/purchases')} className="text-xs text-slate-400 hover:text-slate-600">← Back</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* Supplier */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t('pur.supplier')} *</label>
            <select value={form.supplier_id} onChange={set('supplier_id')}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${!form.supplier_id ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
              <option value="">{t('pur.select_supplier')}</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t('th.date')}</label>
              <input type="date" value={form.purchase_date} onChange={set('purchase_date')}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t('th.status')}</label>
              <select value={form.status} onChange={set('status')}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="received">Received</option>
                <option value="pending">{t('lbl.pending')}</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t('pur.due_date')}</label>
            <input type="date" value={form.due_date} onChange={set('due_date')}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t('lbl.note')}</label>
            <input value={form.note} onChange={set('note')} placeholder={t('pur.optional_note')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          {/* ── Return Items ──────────────────────────────────────────────── */}
          <div className="rounded-xl border border-orange-100 overflow-hidden">
            <button type="button" onClick={() => setReturnOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 transition-colors">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                </svg>
                Return Items
                {returnItems.length > 0 && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{returnItems.length}</span>}
              </span>
              <svg className={`w-3.5 h-3.5 transition-transform ${returnOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            {returnOpen && (
              <div className="px-3 pb-3 space-y-2 border-t border-orange-100 bg-orange-50/30">
                <div className="flex items-center gap-2 pt-2">
                  <label className="text-xs font-semibold text-slate-600 shrink-0">Type</label>
                  <select value={returnType} onChange={e => setReturnType(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-orange-400">
                    <option value="damaged">Damaged</option>
                    <option value="expired">Expired</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="relative">
                  <input value={returnSearch}
                    onChange={e => setReturnSearch(e.target.value)}
                    placeholder="Filter product…"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-orange-400"
                  />
                  {returnSearch.trim().length >= 1 && (() => {
                    const q = returnSearch.trim().toLowerCase();
                    const matches = allProducts.filter(p =>
                      p.name?.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q))
                    ).slice(0, 8);
                    return matches.length > 0 ? (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-40 overflow-y-auto">
                        {matches.map(p => (
                          <button key={p.id} type="button"
                            onMouseDown={() => {
                              if (!returnItems.find(i => i.product_id === p.id))
                                setReturnItems(prev => [...prev, { product_id: p.id, product_name: p.name, qty: '1', cost_price: String(p.cost_price || '0') }]);
                              setReturnSearch('');
                            }}
                            className="w-full text-left px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-orange-50 text-xs flex justify-between">
                            <span className="font-medium text-slate-800 truncate">{p.name}</span>
                            <span className="text-slate-400 shrink-0 ml-2">Rs.{fmt(p.cost_price)}</span>
                          </button>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
                {returnItems.map((item, i) => (
                  <div key={item.product_id} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                    <span className="flex-1 text-xs font-medium text-slate-800 truncate">{item.product_name}</span>
                    <input type="number" min="0.001" step="0.001" value={item.qty}
                      onChange={e => setReturnItems(p => p.map((it, idx) => idx === i ? { ...it, qty: e.target.value } : it))}
                      onFocus={e => e.target.select()}
                      className="w-14 rounded border border-slate-200 px-1 py-1 text-xs text-right outline-none focus:ring-1 focus:ring-orange-400" />
                    <input type="number" min="0" step="0.01" value={item.cost_price}
                      onChange={e => setReturnItems(p => p.map((it, idx) => idx === i ? { ...it, cost_price: e.target.value } : it))}
                      onFocus={e => e.target.select()}
                      className="w-20 rounded border border-slate-200 px-1 py-1 text-xs text-right outline-none focus:ring-1 focus:ring-orange-400" />
                    <button type="button" onClick={() => setReturnItems(p => p.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('lbl.subtotal')}</span>
              <span className="font-semibold text-slate-700">Rs. {fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Discount</span>
              <input type="number" min="0" step="0.01" value={form.discount}
                onChange={set('discount')} placeholder="0.00" onFocus={e => e.target.select()}
                className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm text-right outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="flex justify-between items-baseline py-2 border-t-2 border-slate-200">
              <span className="text-base font-black text-slate-800">{t('pur.grand_total')}</span>
              <span className="text-xl font-black text-emerald-700">Rs. {fmt(grandTotal)}</span>
            </div>
          </div>

          {/* Paid */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t('th.paid')}</label>
            <input type="number" min="0" step="0.01" value={form.paid} onChange={set('paid')} placeholder="0.00"
              onFocus={e => e.target.select()}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-right font-semibold outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          {paidAmt > 0 && (
            <div className={`flex justify-between text-sm font-semibold rounded-lg px-3 py-2 ${balance > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              <span>{t('lbl.balance')}</span>
              <span>Rs. {fmt(balance)}</span>
            </div>
          )}

          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        </div>

        {/* Save */}
        <div className="px-4 py-4 border-t border-slate-100 shrink-0">
          <button onClick={handleSubmit} disabled={isLoading || !items.length}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors active:bg-emerald-800">
            {isLoading ? t('lbl.loading') : t('pur.save_purchase')}
          </button>
        </div>
      </div>
    </div>
  );
}
