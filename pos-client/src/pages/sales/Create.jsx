import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser, selectRole } from '../../features/auth/authSlice';
import { useCreateSaleMutation } from '../../features/sales/salesApi';
import useProductCache from '../../hooks/useProductCache';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import { enqueueOfflineSale } from '../../services/offlineQueue';
import { api } from '../../app/baseApi';

const posApi = api.injectEndpoints({
  endpoints: b => ({
    quickAddCustomer: b.mutation({ query: body => ({ url: '/customers/quick-add', method: 'POST', body }) }),
    getPOSCustomers:  b.query({ query: () => ({ url: '/customers', params: { page: 1, limit: 500 } }) }),
    getPOSSettings:   b.query({ query: () => '/settings' }),
  }),
  overrideExisting: false,
});

const fmt    = n => Number(n || 0).toFixed(2);
const fmtAmt = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

function itemKey(i) { return `${i.product_id ?? 'c'}-${i.variant_id ?? 'none'}-${i._custom_id ?? ''}`; }
function recalc(item) {
  return { ...item, total: Math.max(0, item.qty * item.unit_price - (item.discount || 0)) };
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  search: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>,
  barcode: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2M8 7h8M8 17h8M8 12h8"/></svg>,
  bag: <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>,
  cash: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 12h.01M18 12h.01"/></svg>,
  card: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 10h22"/></svg>,
  credit: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/></svg>,
  split: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12m0 0l-4-4m4 4l-4 4"/></svg>,
  print: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8z"/></svg>,
  pause: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6"/></svg>,
  save: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>,
  user: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"/></svg>,
  lightning: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  retail: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z"/></svg>,
  tag: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A2 2 0 0 1 3 12V7a4 4 0 0 1 4-4z"/></svg>,
  sun: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" strokeWidth={2}/><path strokeLinecap="round" strokeWidth={2} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  fullscreen: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5"/></svg>,
  refresh: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/></svg>,
  logout: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1"/></svg>,
  back: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>,
};

// ─── Product Dropdown ─────────────────────────────────────────────────────────
function ProductDropdown({ items, activeIdx, onSelect }) {
  const listRef = useRef(null);
  useEffect(() => { listRef.current?.children[activeIdx]?.scrollIntoView({ block: 'nearest' }); }, [activeIdx]);
  if (!items.length) return null;
  return (
    <div ref={listRef} className="absolute top-full left-0 right-0 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-72 overflow-y-auto mt-1">
      {items.map((p, i) => (
        <button key={p.id} onMouseDown={() => onSelect(p)}
          className={`w-full text-left px-4 py-2.5 border-b border-slate-50 last:border-0 transition-colors ${i === activeIdx ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
              {p.name_si && <p className="text-xs text-slate-400">{p.name_si}</p>}
            </div>
            <div className="text-right ml-4 shrink-0">
              <p className="text-sm font-bold text-blue-700">Rs.{fmt(p.promo_price ?? p.selling_price)}</p>
              <p className={`text-xs ${p.stock_qty <= 0 ? 'text-red-500' : 'text-slate-400'}`}>Stock: {fmt(p.stock_qty)}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Size Picker Modal ────────────────────────────────────────────────────────
function SizePickerModal({ product, onSelect, onClose }) {
  const [qty, setQty] = useState('');
  const [active, setActive] = useState(0);
  const qtyRef = useRef(null);
  useEffect(() => { qtyRef.current?.focus(); }, []);
  function handleKey(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(product.sizes.length - 1, a + 1)); }
    if (e.key === 'Enter') { e.preventDefault(); onSelect(product.sizes[active], parseFloat(qty) || 1); }
    if (e.key === 'Escape') onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onKeyDown={handleKey}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md">
        <h3 className="text-base font-bold text-slate-800 mb-3">{product.name} — Select Size</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {product.sizes.map((s, i) => (
            <button key={s.id} onClick={() => setActive(i)} onDoubleClick={() => onSelect(s, parseFloat(qty) || 1)}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${i === active ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700 hover:border-blue-400'}`}>
              {s.label} — Rs.{fmt(s.price)}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Qty</label>
            <input ref={qtyRef} type="number" min="0.001" step="0.001" value={qty} onChange={e => setQty(e.target.value)} placeholder="1"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => onSelect(product.sizes[active], parseFloat(qty) || 1)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Add</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Cart Row ─────────────────────────────────────────────────────────────────
function CartRow({ item, onChange, onRemove, highlight }) {
  return (
    <div className={`grid items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${highlight ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
      style={{ gridTemplateColumns: '1fr 60px 72px 60px 72px 24px' }}>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 truncate leading-tight">{item.name}</p>
        {item.barcode && <p className="text-xs text-slate-400 font-mono leading-tight">{item.barcode}</p>}
      </div>
      <input type="number" min="0.001" step="0.001" value={item.qty}
        onChange={e => onChange({ qty: parseFloat(e.target.value) || item.qty })}
        className="cart-qty-input text-right rounded-lg border border-slate-200 px-1.5 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-full" />
      <input type="number" min="0" step="0.01" value={item.unit_price}
        onChange={e => onChange({ unit_price: parseFloat(e.target.value) || 0 })}
        className="text-right rounded-lg border border-slate-200 px-1.5 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-full" />
      <input type="number" min="0" step="0.01" value={item.discount} onChange={e => onChange({ discount: parseFloat(e.target.value) || 0 })}
        placeholder="0"
        className="text-right rounded-lg border border-slate-200 px-1.5 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-full" />
      <p className="text-right font-bold text-slate-800">{fmt(item.total)}</p>
      <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-xl leading-none flex items-center justify-center">&times;</button>
    </div>
  );
}

// ─── Receipt ──────────────────────────────────────────────────────────────────
function Receipt({ sale, settings, onClose }) {
  useEffect(() => { window.print(); }, []);
  const f = n => Number(n || 0).toFixed(2);
  return (
    <div className="fixed inset-0 z-[70] bg-white p-6 print:p-2 overflow-y-auto">
      <div className="max-w-xs mx-auto text-xs font-mono">
        <div className="text-center mb-3">
          <p className="text-base font-bold">{settings?.shop_name || 'LMUC POS'}</p>
          {settings?.address && <p>{settings.address}</p>}
          {settings?.phone   && <p>Tel: {settings.phone}</p>}
        </div>
        <div className="border-t border-b border-dashed border-slate-400 py-1 my-2">
          <p>Invoice: {sale.invoice_no}</p>
          <p>Date: {new Date(sale.created_at || Date.now()).toLocaleString('en-LK')}</p>
          {sale.customer_name && <p>Customer: {sale.customer_name}</p>}
        </div>
        <table className="w-full my-2">
          <tbody>
            {(sale.items || []).map((item, i) => (
              <tr key={i}>
                <td className="pb-0.5 pr-1">{item.name}</td>
                <td className="text-right pb-0.5 whitespace-nowrap">{f(item.qty)} × {f(item.unit_price)}</td>
                <td className="text-right pb-0.5 whitespace-nowrap pl-2">{f(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-dashed border-slate-400 pt-1 space-y-0.5">
          <div className="flex justify-between"><span>Subtotal</span><span>{f(sale.subtotal)}</span></div>
          {parseFloat(sale.discount) > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{f(sale.discount)}</span></div>}
          <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>Rs.{f(sale.total)}</span></div>
          <div className="flex justify-between"><span>Paid</span><span>{f(sale.paid)}</span></div>
          {parseFloat(sale.paid) > parseFloat(sale.total) && (
            <div className="flex justify-between"><span>Change</span><span>{f(sale.paid - sale.total)}</span></div>
          )}
        </div>
        {settings?.receipt_note && <p className="text-center mt-2">{settings.receipt_note}</p>}
        <p className="text-center mt-2 text-slate-400">Thank you!</p>
      </div>
      <div className="text-center mt-6 print:hidden">
        <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700">
          Close &amp; New Sale
        </button>
      </div>
    </div>
  );
}

// ─── Step Badge ───────────────────────────────────────────────────────────────
function Step({ n, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{n}</div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── Main POS ─────────────────────────────────────────────────────────────────
export default function SalesCreate() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user     = useSelector(selectCurrentUser);
  const role     = useSelector(selectRole);

  const { products, ready, deductStock, invalidate } = useProductCache();
  const [createSale, { isLoading: submitting }] = useCreateSaleMutation();
  const [quickAdd] = posApi.useQuickAddCustomerMutation();
  const { data: custData } = posApi.useGetPOSCustomersQuery();
  const { data: settings } = posApi.useGetPOSSettingsQuery();
  const { isOnline } = useConnectivity();

  // Search
  const searchRef   = useRef(null);
  const [query, setQuery]     = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [activeIdx, setActive]  = useState(-1);

  // Barcode scan detection
  const keyIntervals = useRef([]);
  const lastKeyTime  = useRef(0);
  const isScan       = useRef(false);

  // Cart
  const [cart, setCart]         = useState([]);
  const [highlights, setHl]     = useState({});
  const [sizePicker, setSizePicker] = useState(null);
  const [priceMode, setPriceMode]   = useState('retail');
  const [billDiscount, setBillDisc] = useState('');
  const [discType, setDiscType]     = useState('amount');
  const [customItem, setCustom]     = useState(null);
  const [err, setErr]           = useState('');

  // Payment (inline)
  const [payMethod, setPayMethod] = useState('cash');
  const [cashPaid, setCashPaid]   = useState('');
  const [shakeInput, setShakeInput] = useState(false);
  const [cardRef, setCardRef]     = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [splitCardRef, setSplitCardRef] = useState('');
  const cashInputRef = useRef(null);

  // Customer
  const [customer, setCustomer]   = useState(null);
  const [custQuery, setCustQuery] = useState('');
  const [showCustDrop, setShowCust] = useState(false);
  const [qcForm, setQcForm]       = useState(null);
  const [extraCustomers, setExtraCustomers] = useState([]);

  // Hold
  const [heldBills, setHeld]       = useState(() => JSON.parse(localStorage.getItem('pos_held') || '[]'));
  const [showHeld, setShowHeld]     = useState(false);
  const [holdNote, setHoldNote]     = useState('');
  const [showHoldModal, setHoldModal] = useState(false);

  // Receipt
  const [receipt, setReceipt] = useState(null);

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const dropdownItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 20);
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.name_si && p.name_si.includes(q)) ||
      (p.barcode && p.barcode.includes(q))
    ).slice(0, 20);
  }, [query, products]);

  const fastProducts = useMemo(() => {
    const fast = products.filter(p => p.is_fast_moving);
    return (fast.length > 0 ? fast : products).slice(0, 10);
  }, [products]);

  const subtotal    = cart.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const lineDisc    = cart.reduce((s, i) => s + (i.discount || 0), 0);
  const billDiscAmt = useMemo(() => {
    const v = parseFloat(billDiscount) || 0;
    if (discType === 'percent') return Math.min((subtotal - lineDisc) * Math.min(v, 70) / 100, subtotal - lineDisc);
    return Math.min(v, subtotal - lineDisc);
  }, [billDiscount, discType, subtotal, lineDisc]);
  const totalDisc = lineDisc + billDiscAmt;
  const total     = Math.max(0, subtotal - totalDisc);

  const cashNum   = parseFloat(cashPaid) || 0;
  const change    = cashNum - total;

  const customers = useMemo(() => {
    const base = custData?.data || [];
    return [...base, ...extraCustomers.filter(e => !base.find(b => b.id === e.id))];
  }, [custData, extraCustomers]);

  const filteredCusts = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 15);
    return customers.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(custQuery.trim())).slice(0, 15);
  }, [custQuery, customers]);

  // ─── Focus helper ──────────────────────────────────────────────────────────
  const refocus = useCallback(() => setTimeout(() => searchRef.current?.focus(), 50), []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (document.activeElement?.tagName === 'INPUT' && e.key !== 'F10' && e.key !== 'F11') return;
      if (e.key === 'F1')  { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F2')  { e.preventDefault(); setPayMethod('cash');   setTimeout(() => cashInputRef.current?.focus(), 50); }
      if (e.key === 'F3')  { e.preventDefault(); setPayMethod('card'); }
      if (e.key === 'F4')  { e.preventDefault(); setPayMethod('credit'); }
      if (e.key === 'F5')  { e.preventDefault(); setPayMethod('split'); }
      if (e.key === 'F10') { e.preventDefault(); if (cart.length > 0) handleCompleteSale(false); }
      if (e.key === 'F11') { e.preventDefault(); if (cart.length > 0) handleCompleteSale(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart, total, payMethod, cashPaid, cardRef, splitCash, splitCardRef, customer]);

  // ─── Cart helpers ─────────────────────────────────────────────────────────
  function flash(key) {
    setHl(h => ({ ...h, [key]: true }));
    setTimeout(() => setHl(h => { const n = { ...h }; delete n[key]; return n; }), 1500);
  }

  function addToCart(product, qty = null, focusQty = true) {
    setErr('');
    if (product.sizes?.length > 0) { setSizePicker({ product }); setQuery(''); return; }
    if ((product.stock_qty ?? 0) <= 0) { setErr(`"${product.name}" is out of stock`); refocus(); return; }
    const variantId = product.variant_id || null;
    const key       = itemKey({ product_id: product.id, variant_id: variantId });
    setCart(prev => {
      const idx = prev.findIndex(i => i.product_id === product.id && i.variant_id === variantId);
      if (idx >= 0) {
        const item = prev[idx];
        const newQ = Math.min(item.qty + 1, item.stock_qty > 0 ? item.stock_qty : Infinity);
        flash(key);
        return prev.map((i, j) => j === idx ? recalc({ ...i, qty: newQ }) : i);
      }
      const ws    = parseFloat(product.wholesale_price) || 0;
      const promo = product.promo_price ? parseFloat(product.promo_price) : null;
      const base  = promo ?? (parseFloat(product.selling_price) || 0);
      const price = priceMode === 'wholesale' && ws > 0 ? ws : base;
      flash(key);
      return [...prev, recalc({
        product_id: product.id, variant_id: variantId,
        name: product.name_si ? `${product.name} / ${product.name_si}` : product.name,
        barcode: product.barcode || '', qty: qty ?? 1, unit_price: price,
        selling_price: parseFloat(product.selling_price) || 0, promo_price: promo,
        wholesale_price: ws, discount: 0, total: 0,
        unit: product.unit || 'pcs', stock_qty: product.stock_qty || 0,
      })];
    });
    setQuery(''); setShowDrop(false); setActive(-1);
    if (focusQty) setTimeout(() => {
      const inputs = document.querySelectorAll('.cart-qty-input');
      const last = inputs[inputs.length - 1];
      if (last) { last.focus(); last.select(); }
    }, 20);
  }

  function onSizeSelect(size, qty) {
    const p = sizePicker.product;
    setSizePicker(null);
    addToCart({ ...p, variant_id: size.id, name: `${p.name} - ${size.label}`,
      name_si: null, selling_price: size.price, wholesale_price: size.price,
      promo_price: null, sizes: [] }, qty, false);
    refocus();
  }

  function onSearchKeyDown(e) {
    const now = Date.now();
    if (e.key.length === 1 && /[0-9A-Za-z]/.test(e.key)) {
      const gap = lastKeyTime.current > 0 ? now - lastKeyTime.current : 9999;
      lastKeyTime.current = now;
      keyIntervals.current.push(gap);
      if (keyIntervals.current.length > 6) keyIntervals.current.shift();
      isScan.current = keyIntervals.current.length >= 3 && keyIntervals.current.slice(-3).every(g => g < 60);
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, dropdownItems.length - 1)); setShowDrop(true); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Escape')    { setShowDrop(false); setQuery(''); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isScan.current && query.trim()) {
        const bc = query.trim();
        isScan.current = false; keyIntervals.current = []; lastKeyTime.current = 0;
        const hit = products.find(p => p.barcode === bc);
        if (hit) addToCart(hit, null, false);
        setQuery(''); setShowDrop(false); refocus(); return;
      }
      const items = dropdownItems;
      if (activeIdx >= 0 && items[activeIdx]) { addToCart(items[activeIdx]); return; }
      const q = query.trim().toLowerCase();
      const found = items.find(p => p.barcode?.toLowerCase() === q) || items[0];
      if (found) addToCart(found);
    }
  }

  // ─── Complete sale ────────────────────────────────────────────────────────
  async function handleCompleteSale(saveOnly = false, redirectAndPrint = false) {
    setErr('');
    if (payMethod === 'credit' && !customer) { setErr('Select a customer for credit sale'); return; }
    if (payMethod === 'cash' && !saveOnly && cashNum < total) {
      setErr('Cash paid is less than total');
      cashInputRef.current?.focus();
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);
      return;
    }

    const payments = [];
    if (payMethod === 'cash')   payments.push({ method: 'cash',   amount: total,      reference: null });
    else if (payMethod === 'card')   payments.push({ method: 'card',   amount: total,      reference: cardRef });
    else if (payMethod === 'qr')     payments.push({ method: 'qr',     amount: total,      reference: null });
    else if (payMethod === 'credit') payments.push({ method: 'credit', amount: total,      reference: null });
    else if (payMethod === 'split') {
      const sc = parseFloat(splitCash) || 0;
      payments.push({ method: 'cash', amount: sc,            reference: null });
      payments.push({ method: 'card', amount: Math.max(0, total - sc), reference: splitCardRef });
    }

    const paid = payMethod === 'cash' ? cashNum : total;
    const items = cart.map(i => ({
      product_id: i.product_id, variant_id: i.variant_id || null,
      product_name: i.name, unit_price: i.unit_price,
      original_price: i.promo_price ? i.selling_price : 0,
      cost_price: 0, qty: i.qty, discount: i.discount || 0, total: i.total,
    }));
    const salePayload = {
      items, payments, customer_id: customer?.id || null,
      subtotal, discount: totalDisc, tax: 0, extra_charges: 0,
      total, paid, balance: Math.max(0, total - paid), status: 'completed',
    };

    // ── Offline path ──────────────────────────────────────────────────────────
    if (!isOnline) {
      try {
        const offlineResult = await enqueueOfflineSale(salePayload);
        cart.forEach(item => { if (item.product_id) deductStock(item.product_id, item.qty); });
        setCart([]); setCustomer(null); setCustQuery(''); setBillDisc(''); setCashPaid('');
        if (!saveOnly) {
          if (redirectAndPrint && offlineResult?.id) {
            navigate('/sales/' + offlineResult.id, { state: { autoPrint: true } });
          } else {
            setReceipt({
              ...offlineResult,
              items: cart.map(i => ({ name: i.name, qty: i.qty, unit_price: i.unit_price, total: i.total })),
              subtotal, discount: totalDisc, total, paid, customer_name: customer?.name,
            });
          }
        }
      } catch (e) {
        setErr('Failed to save offline: ' + (e.message || 'unknown error'));
      }
      return;
    }

    // ── Online path ───────────────────────────────────────────────────────────
    try {
      const result = await createSale(salePayload).unwrap();

      cart.forEach(item => { if (item.product_id) deductStock(item.product_id, item.qty); });
      invalidate();

      setCart([]); setCustomer(null); setCustQuery(''); setBillDisc(''); setCashPaid('');
      if (!saveOnly) {
        if (redirectAndPrint && result?.id) {
          navigate('/sales/' + result.id, { state: { autoPrint: true } });
        } else {
          setReceipt({
            ...result,
            items: cart.map(i => ({ name: i.name, qty: i.qty, unit_price: i.unit_price, total: i.total })),
            subtotal, discount: totalDisc, total, paid, customer_name: customer?.name,
          });
        }
      }
    } catch (e) {
      setErr(e?.data?.error || 'Failed to save sale');
    }
  }

  function confirmHold() {
    const updated = [...heldBills, { id: Date.now(), note: holdNote, cart, customer, createdAt: new Date().toISOString() }];
    localStorage.setItem('pos_held', JSON.stringify(updated));
    setHeld(updated); setCart([]); setCustomer(null); setCustQuery(''); setBillDisc(''); setHoldNote(''); setHoldModal(false); refocus();
  }

  function resumeHeld(idx) {
    const bill = heldBills[idx];
    setCart(bill.cart || []); setCustomer(bill.customer || null);
    const updated = heldBills.filter((_, i) => i !== idx);
    localStorage.setItem('pos_held', JSON.stringify(updated));
    setHeld(updated); setShowHeld(false); refocus();
  }

  function addCustomItem() {
    if (!customItem?.name?.trim() || !customItem?.price) return;
    const price = parseFloat(customItem.price);
    if (!price || price <= 0) return;
    setCart(prev => [...prev, recalc({
      product_id: null, variant_id: null, _custom_id: Date.now(),
      name: customItem.name.trim(), barcode: '', qty: 1,
      unit_price: price, selling_price: price, promo_price: null, wholesale_price: 0,
      discount: 0, total: price, unit: 'pcs', stock_qty: 9999, is_custom: true,
    })]);
    setCustom(null); refocus();
  }

  async function saveQuickCustomer() {
    if (!qcForm?.name?.trim()) return;
    try {
      const res = await quickAdd({ name: qcForm.name.trim(), phone: qcForm.phone || null }).unwrap();
      const c = res.customer;
      setExtraCustomers(prev => [...prev, c]);
      setCustomer(c); setCustQuery(c.name); setQcForm(null); refocus();
    } catch (e) { setErr(e?.data?.error || 'Failed to add customer'); }
  }

  const newSale = () => { setCart([]); setCustomer(null); setCustQuery(''); setBillDisc(''); setQuery(''); setReceipt(null); setCashPaid(''); refocus(); };
  const handleLogout = () => { dispatch(logout()); navigate('/login'); };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-0 overflow-hidden">

      {/* ── Top header bar ── */}
      <div className="bg-white border-b border-slate-200 px-4 h-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/sales')} className="text-slate-500 hover:text-slate-700 transition-colors">{Icon.back}</button>
          <h1 className="font-bold text-slate-800 text-sm">New Sale / POS Billing</h1>
          {role === 'cashier' && (
            <button onClick={() => navigate('/sales')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              Home
            </button>
          )}
        </div>

        {/* Shortcut pills */}
        <div className="flex items-center gap-1.5 text-xs">
          {[['F1','Search'],['F2','Cash'],['F3','Card'],['F4','Credit'],['F5','Split'],['F10','Complete']].map(([k,l]) => (
            <span key={k} className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 font-medium">
              <span className="text-slate-400">{k} </span>{l}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Day End */}
          <button className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
            {Icon.sun} Day End
          </button>

          {/* Held bills badge */}
          {heldBills.length > 0 && (
            <button onClick={() => setShowHeld(true)} className="relative bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-orange-200 transition-colors">
              Held ({heldBills.length})
            </button>
          )}

          {/* Utility icons */}
          <button className="text-slate-500 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">{Icon.fullscreen}</button>
          <button onClick={invalidate} className="text-slate-500 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh products">{Icon.refresh}</button>

          {/* User */}
          <div className="flex items-center gap-2 ml-1 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-xs leading-tight">
              <p className="font-semibold text-slate-700">{user?.name}</p>
              <p className="text-slate-400 capitalize">{role}</p>
            </div>
            <button onClick={handleLogout} className="ml-1 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">{Icon.logout}</button>
          </div>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* ═══ LEFT PANEL ══════════════════════════════════════════════════════ */}
        <div className="w-[60%] flex flex-col min-w-0 overflow-hidden">

          {/* Section header + search + tabs */}
          <div className="px-4 pt-3 pb-2 space-y-2 shrink-0">
            <Step n="1" label="ADD PRODUCTS" />

            {/* Search bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icon.search}</span>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowDrop(true); setActive(-1); }}
                  onFocus={() => setShowDrop(ready && dropdownItems.length > 0)}
                  onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                  onKeyDown={onSearchKeyDown}
                  placeholder={ready ? 'Search product (F1)' : 'Loading products…'}
                  readOnly={!ready}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors">
                  {Icon.barcode} <span>Scan</span>
                </button>
                {showDrop && (
                  <ProductDropdown items={dropdownItems} activeIdx={activeIdx}
                    onSelect={p => { addToCart(p); setShowDrop(false); }} />
                )}
              </div>
            </div>

            {/* Price mode tabs */}
            <div className="flex gap-1.5">
              <button onClick={() => setPriceMode('retail')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  priceMode === 'retail' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
                {Icon.retail} Retail
              </button>
              <button onClick={() => setPriceMode('wholesale')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  priceMode === 'wholesale' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
                {Icon.tag} Wholesale
              </button>
              <button onClick={() => setCustom({ name: '', price: '' })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors">
                + Custom
              </button>
            </div>

            {/* Custom item row */}
            {customItem && (
              <div className="flex gap-2 items-center bg-yellow-50 rounded-xl p-2 border border-yellow-200">
                <input value={customItem.name} onChange={e => setCustom(c => ({ ...c, name: e.target.value }))}
                  placeholder="Item name" autoFocus
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                <input type="number" value={customItem.price} onChange={e => setCustom(c => ({ ...c, price: e.target.value }))}
                  placeholder="Price" className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white text-right" />
                <button onClick={addCustomItem} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">Add</button>
                <button onClick={() => setCustom(null)} className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-lg leading-none">&times;</button>
              </div>
            )}
          </div>

          {/* Cart area */}
          <div className="flex-1 min-h-0 overflow-y-auto mx-4 mb-2 bg-white rounded-xl shadow-sm border border-slate-100">
            {cart.length > 0 ? (
              <>
                {/* Cart header */}
                <div className="grid px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 sticky top-0 bg-white"
                  style={{ gridTemplateColumns: '1fr 60px 72px 60px 72px 24px' }}>
                  <span>Item</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Disc</span>
                  <span className="text-right">Total</span>
                  <span></span>
                </div>
                <div className="p-1 space-y-0.5">
                  {cart.map((item, i) => (
                    <CartRow key={itemKey(item)} item={item}
                      highlight={!!highlights[itemKey(item)]}
                      onChange={changes => setCart(prev => prev.map((it, j) => j === i ? recalc({ ...it, ...changes }) : it))}
                      onRemove={() => setCart(prev => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-slate-300">
                {Icon.bag}
                <p className="mt-4 text-base font-semibold text-slate-400">No items added yet</p>
                <p className="text-sm text-slate-300 mt-1">Scan barcode or search product to start sale</p>
              </div>
            )}
          </div>

          {/* ⚡ Fast products */}
          {fastProducts.length > 0 && (
            <div className="shrink-0 px-4 pb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-yellow-500">{Icon.lightning}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fast</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {fastProducts.map(p => (
                  <button key={p.id} onMouseDown={() => addToCart(p)}
                    className="shrink-0 w-24 bg-white rounded-xl border border-slate-100 shadow-sm p-2 text-left hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="w-full aspect-square bg-slate-100 rounded-lg mb-1.5 flex items-center justify-center overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14M14 8h.01"/>
                        </svg>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-700 truncate leading-tight">{p.name}</p>
                    <p className="text-xs font-bold text-blue-600 mt-0.5">Rs. {fmt(p.promo_price ?? p.selling_price)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT PANEL ═════════════════════════════════════════════════════ */}
        <div className="w-[40%] bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">

          {/* Discount + Grand Total */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            {/* Discount row */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-orange-500 w-20 shrink-0">Discount</span>
              <input type="number" min="0" step="0.01" value={billDiscount}
                onChange={e => setBillDisc(e.target.value)} placeholder="0"
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-orange-400 text-right" />
              <button onClick={() => setDiscType('amount')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${discType === 'amount' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Rs</button>
              {[5, 10, 15, 20].map(pct => (
                <button key={pct} onClick={() => { setDiscType('percent'); setBillDisc(String(pct)); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${discType === 'percent' && billDiscount === String(pct) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {pct}%
                </button>
              ))}
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
              <span className="text-base font-bold text-slate-800">Grand Total</span>
              <span className="text-2xl font-extrabold text-blue-600">{fmtAmt(total)}</span>
            </div>

            {totalDisc > 0 && (
              <div className="flex justify-between text-xs text-red-500 mt-1 px-1">
                <span>Discount applied</span><span>- {fmtAmt(totalDisc)}</span>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="px-4 py-3 border-b border-slate-100">
            <Step n="2" label="SELECT PAYMENT METHOD" />
            <div className="flex rounded-2xl border border-slate-200 overflow-hidden bg-white">
              {[
                { id: 'cash',   label: 'Cash',   shortcut: 'F2', icon: Icon.cash },
                { id: 'card',   label: 'Card',   shortcut: 'F3', icon: Icon.card },
                { id: 'credit', label: 'Credit', shortcut: 'F4', icon: Icon.credit },
                { id: 'split',  label: 'Split',  shortcut: null,  icon: Icon.split },
              ].map((m, i, arr) => (
                <button key={m.id} onClick={() => setPayMethod(m.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-5 text-sm font-semibold transition-all
                    ${i < arr.length - 1 ? 'border-r border-slate-200' : ''}
                    ${payMethod === m.id
                      ? 'bg-green-500 text-white shadow-inner'
                      : 'text-slate-500 hover:bg-slate-50'
                    }`}>
                  {m.icon}
                  <span>{m.label}{m.shortcut ? ` [${m.shortcut}]` : ''}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash paid / customer */}
          <div className="px-4 py-3 border-b border-slate-100">
            <Step n="3" label={payMethod === 'cash' ? 'ENTER CASH PAID' : payMethod === 'card' ? 'CARD DETAILS' : payMethod === 'credit' ? 'CREDIT SALE' : 'SPLIT PAYMENT'} />

            {/* Customer row */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</span>
              <button onClick={() => setQcForm({ name: '', phone: '' })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                {Icon.user} Quick Add Customer
              </button>
            </div>
            <div className="relative mb-3">
              <input value={custQuery}
                onChange={e => { setCustQuery(e.target.value); setShowCust(true); }}
                onFocus={() => setShowCust(true)}
                onBlur={() => setTimeout(() => setShowCust(false), 150)}
                placeholder="Select Customer"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
              {customer && (
                <button onClick={() => { setCustomer(null); setCustQuery(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg">&times;</button>
              )}
              {showCustDrop && filteredCusts.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 z-40 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto mb-1">
                  {filteredCusts.map(c => (
                    <button key={c.id} onMouseDown={() => { setCustomer(c); setCustQuery(c.name); setShowCust(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-50 last:border-0">
                      <p className="font-semibold">{c.name}</p>
                      {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cash input */}
            {payMethod === 'cash' && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cash Paid</span>
                  {change > 0 && (
                    <span className="text-xs font-bold text-green-600">= ශේෂය Rs.{fmt(change)}</span>
                  )}
                  {change < 0 && cashNum > 0 && (
                    <span className="text-xs font-bold text-red-500">= අඩුපාඩු Rs.{fmt(Math.abs(change))}</span>
                  )}
                </div>
                <input ref={cashInputRef} type="number" min="0" step="0.01" value={cashPaid}
                  onChange={e => { setCashPaid(e.target.value); setShakeInput(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCompleteSale(false, true); }}
                  placeholder="0.00"
                  className={`w-full rounded-lg border-2 px-3 py-2.5 text-xl font-bold text-right outline-none transition-colors mb-2 ${shakeInput ? 'shake border-red-500' : 'border-green-300 focus:border-green-500'}`} />
                <div className="flex gap-1.5 flex-wrap">
                  {[100, 500, 1000, 2000, 5000].map(v => (
                    <button key={v} onClick={() => setCashPaid(String(v))}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors min-w-0">
                      {v}
                    </button>
                  ))}
                </div>
                {total > 0 && (
                  <button onClick={() => setCashPaid(fmt(total))}
                    className="w-full mt-1.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold text-blue-700 transition-colors">
                    Exact: {fmtAmt(total)}
                  </button>
                )}
              </>
            )}

            {/* Card input */}
            {payMethod === 'card' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Card Reference No.</label>
                <input autoFocus type="text" value={cardRef} onChange={e => setCardRef(e.target.value)} placeholder="Optional"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            {/* Credit */}
            {payMethod === 'credit' && (
              <p className="text-sm text-slate-500 bg-orange-50 rounded-xl p-3 text-center">
                Amount will be added to customer's credit balance.
                {!customer && <span className="block mt-1 text-red-500 font-semibold text-xs">⚠ Please select a customer first</span>}
              </p>
            )}

            {/* Split */}
            {payMethod === 'split' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Cash Amount</label>
                  <input autoFocus type="number" min="0" step="0.01" value={splitCash} onChange={e => setSplitCash(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <p className="text-sm text-slate-600">
                  Card: <strong className="text-blue-700">{fmtAmt(Math.max(0, total - (parseFloat(splitCash) || 0)))}</strong>
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Card Reference</label>
                  <input type="text" value={splitCardRef} onChange={e => setSplitCardRef(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {err && (
            <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl">{err}</div>
          )}

          {/* Complete Sale */}
          <div className="px-4 py-4 mt-auto">
            <Step n="4" label="COMPLETE SALE" />

            <div className="flex gap-2 mb-2">
              {/* Main button */}
              <button
                disabled={cart.length === 0 || submitting}
                onClick={() => handleCompleteSale(false)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm transition-colors shadow-md"
              >
                {Icon.print}
                <span>Print Bill &amp; Complete Sale</span>
                <span className="ml-1 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded font-bold">F10</span>
              </button>

              {/* Save only */}
              <button
                disabled={cart.length === 0 || submitting}
                onClick={() => handleCompleteSale(true)}
                className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 border-2 border-slate-200 hover:border-slate-300 disabled:opacity-40 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
              >
                {Icon.save}
                <span>Save Only</span>
                <span className="text-slate-400 font-normal">F11</span>
              </button>
            </div>

            {/* Hold Bill */}
            <button
              disabled={cart.length === 0}
              onClick={() => setHoldModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-200 disabled:text-slate-400 text-amber-900 rounded-xl font-bold text-sm transition-colors"
            >
              {Icon.pause} Hold Bill
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MODALS ══════════════════════════════════════════════════════════ */}

      {sizePicker && (
        <SizePickerModal product={sizePicker.product} onSelect={onSizeSelect}
          onClose={() => { setSizePicker(null); refocus(); }} />
      )}

      {receipt && <Receipt sale={receipt} settings={settings} onClose={newSale} />}

      {/* Hold modal */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-slate-800">Hold Bill</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Note (optional)</label>
              <input autoFocus value={holdNote} onChange={e => setHoldNote(e.target.value)} placeholder="Table 3, customer name…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setHoldModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmHold} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600">Hold</button>
            </div>
          </div>
        </div>
      )}

      {/* Held bills */}
      {showHeld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Held Bills ({heldBills.length})</h2>
              <button onClick={() => setShowHeld(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            {heldBills.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No held bills</p>}
            {heldBills.map((b, i) => (
              <div key={b.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{b.note || `Bill ${i + 1}`}</p>
                  <p className="text-xs text-slate-400">{b.cart?.length} items · {new Date(b.createdAt).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resumeHeld(i)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">Resume</button>
                  <button onClick={() => { const u = heldBills.filter((_, j) => j !== i); localStorage.setItem('pos_held', JSON.stringify(u)); setHeld(u); }}
                    className="px-3 py-1.5 border border-red-300 text-red-500 rounded-lg text-xs hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick add customer */}
      {qcForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-3">
            <h2 className="font-bold text-slate-800">Quick Add Customer</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
              <input autoFocus value={qcForm.name} onChange={e => setQcForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <input value={qcForm.phone} onChange={e => setQcForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setQcForm(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={saveQuickCustomer} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
