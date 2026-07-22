import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser, selectRole } from '../../features/auth/authSlice';
import { useCreateSaleMutation } from '../../features/sales/salesApi';
import { useGetCategoriesQuery } from '../../features/products/productsApi';
import useProductCache from '../../hooks/useProductCache';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import { enqueueOfflineSale } from '../../services/offlineQueue';
import { api } from '../../app/baseApi';
import { useLocale } from '../../contexts/LocaleContext';

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
  search:  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>,
  allCat:  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>,
  cart:    <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>,
  cash:    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>,
  card:    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 10h22"/></svg>,
  split:   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12m0 0l-4-4m4 4l-4 4"/></svg>,
  check:   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  back:    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>,
  plus:    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14"/></svg>,
  logout:  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1"/></svg>,
  refresh: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/></svg>,
  print:   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8z"/></svg>,
  pause:   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6"/></svg>,
  box:     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
};

const CAT_COLORS = [
  ['bg-orange-100','text-orange-600'],['bg-blue-100','text-blue-600'],
  ['bg-green-100','text-green-600'],['bg-purple-100','text-purple-600'],
  ['bg-pink-100','text-pink-600'],['bg-yellow-100','text-yellow-700'],
  ['bg-teal-100','text-teal-700'],['bg-red-100','text-red-600'],
  ['bg-indigo-100','text-indigo-600'],['bg-cyan-100','text-cyan-700'],
];

// ─── Receipt ──────────────────────────────────────────────────────────────────
function Receipt({ sale, settings, onClose }) {
  const { t } = useLocale();
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
          <p>{t('th.invoice')}: {sale.invoice_no}</p>
          <p>{t('th.date')}: {new Date(sale.created_at || Date.now()).toLocaleString('en-LK')}</p>
          {sale.customer_name && <p>{t('lbl.customer')}: {sale.customer_name}</p>}
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
          <div className="flex justify-between"><span>{t('lbl.subtotal')}</span><span>{f(sale.subtotal)}</span></div>
          {parseFloat(sale.discount) > 0 && <div className="flex justify-between text-red-600"><span>{t('lbl.discount')}</span><span>-{f(sale.discount)}</span></div>}
          <div className="flex justify-between font-bold text-sm"><span>{t('lbl.grand_total')}</span><span>Rs.{f(sale.total)}</span></div>
          <div className="flex justify-between"><span>{t('th.paid')}</span><span>{f(sale.paid)}</span></div>
          {parseFloat(sale.paid) > parseFloat(sale.total) && (
            <div className="flex justify-between"><span>{t('lbl.change')}</span><span>{f(sale.paid - sale.total)}</span></div>
          )}
        </div>
        {settings?.receipt_note && <p className="text-center mt-2">{settings.receipt_note}</p>}
      </div>
      <div className="text-center mt-6 print:hidden">
        <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700">
          {t('btn.close')} &amp; {t('btn.new_sale')}
        </button>
      </div>
    </div>
  );
}

// ─── Size Picker Modal ────────────────────────────────────────────────────────
function SizePickerModal({ product, onSelect, onClose }) {
  const { t } = useLocale();
  const [qty, setQty]     = useState('');
  const [active, setActive] = useState(0);
  const qtyRef = useRef(null);
  useEffect(() => { qtyRef.current?.focus(); }, []);
  function handleKey(e) {
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  { e.preventDefault(); setActive(a => Math.min(product.sizes.length - 1, a + 1)); }
    if (e.key === 'Enter')   { e.preventDefault(); onSelect(product.sizes[active], parseFloat(qty) || 1); }
    if (e.key === 'Escape')  { onClose(); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onKeyDown={handleKey}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md">
        <h3 className="text-base font-bold text-slate-800 mb-3">{product.name} — {t('pos.select_size')}</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {product.sizes.map((s, i) => (
            <button key={s.id} onClick={() => setActive(i)} onDoubleClick={() => onSelect(s, parseFloat(qty) || 1)}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${i === active ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 text-slate-700 hover:border-orange-400'}`}>
              {s.label} — Rs.{fmt(s.price)}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">{t('th.qty')}</label>
            <input ref={qtyRef} type="number" min="0.001" step="0.001" value={qty} onChange={e => setQty(e.target.value)} placeholder="1"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <button onClick={() => onSelect(product.sizes[active], parseFloat(qty) || 1)}
            className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600">{t('btn.add')}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">{t('btn.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main POS Interface 2 ─────────────────────────────────────────────────────
export default function SalesCreate2() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user     = useSelector(selectCurrentUser);
  const role     = useSelector(selectRole);

  const { t } = useLocale();
  const { products, ready, deductStock, invalidate } = useProductCache();
  const [createSale, { isLoading: submitting }] = useCreateSaleMutation();
  const [quickAdd]  = posApi.useQuickAddCustomerMutation();
  const { data: custData }  = posApi.useGetPOSCustomersQuery();
  const { data: settings }  = posApi.useGetPOSSettingsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { isOnline } = useConnectivity();

  // Category & search filter
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  // Cart
  const [cart, setCart]           = useState([]);
  const [sizePicker, setSizePicker] = useState(null);
  const [err, setErr]             = useState('');

  // Payment
  const [payMethod, setPayMethod]   = useState('cash');
  const [cashPaid, setCashPaid]     = useState('');
  const [shakeInput, setShakeInput] = useState(false);
  const [cardRef, setCardRef]       = useState('');
  const [splitCash, setSplitCash]   = useState('');
  const [splitCardRef, setSplitCardRef] = useState('');
  const cashInputRef = useRef(null);

  // Customer
  const [customer, setCustomer]     = useState(null);
  const [custQuery, setCustQuery]   = useState('');
  const [showCustDrop, setShowCust] = useState(false);
  const [extraCustomers, setExtraCusts] = useState([]);
  const [qcForm, setQcForm]         = useState(null);

  // Hold / draft
  const [heldBills, setHeld]         = useState(() => JSON.parse(localStorage.getItem('pos_held') || '[]'));
  const [holdNote, setHoldNote]       = useState('');
  const [showHoldModal, setHoldModal] = useState(false);
  const [showHeld, setShowHeld]       = useState(false);

  // Manual item
  const [manualItem, setManualItem]   = useState(null);

  // Receipt
  const [receipt, setReceipt] = useState(null);

  // Mobile tab: 'products' | 'cart'
  const [mobileTab, setMobileTab] = useState('products');

  // Grid keyboard navigation
  const [selectedIdx, setSelectedIdx] = useState(null);
  const gridRef   = useRef(null);
  const navRef    = useRef({});                 // stable ref to avoid stale closures
  const GRID_COLS = 5;

  // ─── Filtered products ───────────────────────────────────────────────────
  const displayedProducts = useMemo(() => {
    let list = products;
    if (activeCat !== null) list = list.filter(p => p.category_id === activeCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.name_si && p.name_si.includes(q)) ||
        (p.barcode && p.barcode.includes(q))
      );
    }
    return list;
  }, [products, activeCat, search]);

  // ─── Totals ──────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const lineDisc = cart.reduce((s, i) => s + (i.discount || 0), 0);
  const total    = Math.max(0, subtotal - lineDisc);
  const cashNum  = parseFloat(cashPaid) || 0;
  const change   = cashNum - total;

  // ─── Customers ───────────────────────────────────────────────────────────
  const customers = useMemo(() => {
    const base = custData?.data || [];
    return [...base, ...extraCustomers.filter(e => !base.find(b => b.id === e.id))];
  }, [custData, extraCustomers]);

  const filteredCusts = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 15);
    return customers.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(custQuery.trim())).slice(0, 15);
  }, [custQuery, customers]);

  // ─── Add to cart ─────────────────────────────────────────────────────────
  function addToCart(product) {
    setErr('');
    if (product.sizes?.length > 0) { setSizePicker({ product }); return; }
    if ((product.stock_qty ?? 0) <= 0) { setErr(`"${product.name}" is out of stock`); return; }
    const variantId = product.variant_id || null;
    setCart(prev => {
      const idx = prev.findIndex(i => i.product_id === product.id && i.variant_id === variantId);
      if (idx >= 0) {
        const item = prev[idx];
        const newQ = Math.min(item.qty + 1, item.stock_qty > 0 ? item.stock_qty : Infinity);
        return prev.map((it, j) => j === idx ? recalc({ ...it, qty: newQ }) : it);
      }
      const promo = product.promo_price ? parseFloat(product.promo_price) : null;
      const price = promo ?? (parseFloat(product.selling_price) || 0);
      return [...prev, recalc({
        product_id: product.id, variant_id: variantId,
        name: product.name_si ? `${product.name} / ${product.name_si}` : product.name,
        barcode: product.barcode || '', qty: 1, unit_price: price,
        selling_price: parseFloat(product.selling_price) || 0, promo_price: promo,
        discount: 0, total: 0, unit: product.unit || 'pcs', stock_qty: product.stock_qty || 0,
      })];
    });
  }

  function onSizeSelect(size, qty) {
    const p = sizePicker.product;
    setSizePicker(null);
    setCart(prev => [...prev, recalc({
      product_id: p.id, variant_id: size.id,
      name: `${p.name} - ${size.label}`, barcode: '', qty: qty || 1,
      unit_price: parseFloat(size.price), selling_price: parseFloat(size.price),
      promo_price: null, discount: 0, total: 0, unit: p.unit || 'pcs', stock_qty: 9999,
    })]);
  }

  function removeFromCart(idx)  { setCart(prev => prev.filter((_, i) => i !== idx)); }
  function updateQty(idx, delta) {
    setCart(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newQ = Math.max(0.001, Math.round((item.qty + delta) * 1000) / 1000);
      return recalc({ ...item, qty: newQ });
    }));
  }

  // ─── Complete sale ────────────────────────────────────────────────────────
  async function handleCompleteSale(saveOnly = false, redirectAndPrint = false) {
    setErr('');
    if (payMethod === 'cash' && !saveOnly && cashNum < total) {
      setErr('Cash paid is less than total');
      cashInputRef.current?.focus();
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);
      return;
    }

    const payments = [];
    if (payMethod === 'cash') {
      payments.push({ method: 'cash', amount: total, reference: null });
    } else if (payMethod === 'paid') {
      payments.push({ method: 'cash', amount: total, reference: null });
    } else if (payMethod === 'card') {
      payments.push({ method: 'card', amount: total, reference: cardRef });
    } else if (payMethod === 'split') {
      const sc = parseFloat(splitCash) || 0;
      payments.push({ method: 'cash', amount: sc, reference: null });
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
      subtotal, discount: lineDisc, tax: 0, extra_charges: 0,
      total, paid, balance: Math.max(0, total - paid), status: 'completed',
    };

    // ── Offline path ──────────────────────────────────────────────────────────
    if (!isOnline) {
      try {
        const offlineResult = await enqueueOfflineSale(salePayload);
        cart.forEach(item => { if (item.product_id) deductStock(item.product_id, item.qty); });
        setCart([]); setCustomer(null); setCustQuery(''); setCashPaid(''); setCardRef(''); setSplitCash(''); setSplitCardRef('');
        if (!saveOnly) {
          if (redirectAndPrint && offlineResult?.id) {
            navigate('/sales/' + offlineResult.id, { state: { autoPrint: true } });
          } else {
            setReceipt({
              ...offlineResult,
              items: cart.map(i => ({ name: i.name, qty: i.qty, unit_price: i.unit_price, total: i.total })),
              subtotal, discount: lineDisc, total, paid, customer_name: customer?.name,
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

      setCart([]); setCustomer(null); setCustQuery(''); setCashPaid(''); setCardRef(''); setSplitCash(''); setSplitCardRef('');
      if (!saveOnly) {
        if (redirectAndPrint && result?.id) {
          navigate('/sales/' + result.id, { state: { autoPrint: true } });
        } else {
          setReceipt({
            ...result,
            items: cart.map(i => ({ name: i.name, qty: i.qty, unit_price: i.unit_price, total: i.total })),
            subtotal, discount: lineDisc, total, paid, customer_name: customer?.name,
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
    setHeld(updated); setCart([]); setCustomer(null); setCustQuery(''); setHoldNote(''); setHoldModal(false);
  }

  function resumeHeld(idx) {
    const bill = heldBills[idx];
    setCart(bill.cart || []); setCustomer(bill.customer || null);
    if (bill.customer) setCustQuery(bill.customer.name);
    const updated = heldBills.filter((_, i) => i !== idx);
    localStorage.setItem('pos_held', JSON.stringify(updated));
    setHeld(updated); setShowHeld(false);
  }

  async function saveQuickCustomer() {
    if (!qcForm?.name?.trim()) return;
    try {
      const res = await quickAdd({ name: qcForm.name.trim(), phone: qcForm.phone || null }).unwrap();
      const c = res.customer;
      setExtraCusts(prev => [...prev, c]);
      setCustomer(c); setCustQuery(c.name); setQcForm(null);
    } catch (e) { setErr(e?.data?.error || 'Failed to add customer'); }
  }

  function addManualItem() {
    if (!manualItem?.name?.trim() || !manualItem?.price) return;
    const price = parseFloat(manualItem.price);
    if (!price || price <= 0) return;
    setCart(prev => [...prev, recalc({
      product_id: null, variant_id: null, _custom_id: Date.now(),
      name: manualItem.name.trim(), barcode: '', qty: 1, unit_price: price,
      selling_price: price, promo_price: null, discount: 0, total: price, unit: 'pcs', stock_qty: 9999,
    })]);
    setManualItem(null);
  }

  const newSale     = () => { setCart([]); setCustomer(null); setCustQuery(''); setCashPaid(''); setReceipt(null); setErr(''); };
  const handleLogout = () => { dispatch(logout()); navigate('/login'); };

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'F9')     { e.preventDefault(); if (cart.length > 0) setHoldModal(true); }
      if (e.key === 'F10')    { e.preventDefault(); if (cart.length > 0) handleCompleteSale(false, true); }
      if (e.key === 'Escape') { setShowHeld(false); setHoldModal(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart, total, payMethod, cashPaid, cardRef, splitCash, splitCardRef, customer]);

  // ─── Grid navigation (arrow keys + Enter) ────────────────────────────────
  // Keep navRef current so the stable handler always sees latest values
  navRef.current = { displayedProducts, selectedIdx, showHeld, showHoldModal, qcForm, sizePicker, receipt, addToCart };

  // Reset selection when the displayed list changes
  useEffect(() => { setSelectedIdx(null); }, [activeCat, search]);

  // Scroll highlighted card into view
  useEffect(() => {
    if (selectedIdx === null || !gridRef.current) return;
    const cards = gridRef.current.children;
    cards[selectedIdx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIdx]);

  // Register once — reads state via navRef to avoid stale closures
  useEffect(() => {
    const onKey = e => {
      const { displayedProducts, selectedIdx, showHeld, showHoldModal, qcForm, sizePicker, receipt, addToCart } = navRef.current;

      // Don't navigate grid while any modal/overlay is open
      if (showHeld || showHoldModal || qcForm || sizePicker || receipt) return;

      const len  = displayedProducts.length;
      const isSearchFocused = document.activeElement === searchRef.current;
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

      // ArrowDown from search bar → jump into grid
      if (e.key === 'ArrowDown' && isSearchFocused) {
        if (len > 0) { e.preventDefault(); setSelectedIdx(0); searchRef.current.blur(); }
        return;
      }

      // While any other input is focused, don't hijack keys
      if (isInput) return;
      if (len === 0) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIdx(i => i === null ? 0 : Math.min(i + 1, len - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIdx(i => i === null ? len - 1 : Math.max(i - 1, 0));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => i === null ? 0 : Math.min(i + GRID_COLS, len - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => {
          if (i === null || i < GRID_COLS) { searchRef.current?.focus(); return null; }
          return i - GRID_COLS;
        });
      } else if (e.key === 'Enter' && selectedIdx !== null) {
        e.preventDefault();
        const p = displayedProducts[selectedIdx];
        if (p) addToCart(p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-0 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-3 h-12 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => navigate('/sales')} className="text-slate-500 hover:text-slate-700 transition-colors">
            {Icon.back}
          </button>
          <h1 className="font-bold text-slate-800 text-sm hidden sm:block">{t('page.new_sale')}</h1>
          {!ready && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{t('lbl.loading')}</span>}
        </div>

        {/* Mobile tab switcher */}
        <div className="flex lg:hidden rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
          <button onClick={() => setMobileTab('products')}
            className={`px-4 py-1.5 transition-colors ${mobileTab === 'products' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
            {t('pos.add_products')}
          </button>
          <button onClick={() => setMobileTab('cart')}
            className={`px-4 py-1.5 transition-colors border-l border-slate-200 ${mobileTab === 'cart' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
            {t('pos.payment_method_label')}
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {heldBills.length > 0 && (
            <button onClick={() => setShowHeld(true)}
              className="relative bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-amber-200 transition-colors">
              Held ({heldBills.length})
            </button>
          )}
          <button onClick={invalidate} title="Refresh products"
            className="text-slate-500 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            {Icon.refresh}
          </button>
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
              {Icon.logout}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="flex flex-1 min-h-0">

      {/* ═══ LEFT SECTION (Products + Categories) ══════════════════════════════ */}
      <div className={`flex min-h-0 overflow-hidden w-full lg:w-[60%] ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>

        {/* ═══ CATEGORY SIDEBAR ══════════════════════════════════════════════ */}
        <div className="w-[72px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">

          {/* All */}
          <button onClick={() => setActiveCat(null)}
            className={`flex flex-col items-center justify-center py-3.5 px-1 gap-1.5 border-b border-slate-100 transition-colors shrink-0
              ${activeCat === null ? 'bg-orange-500' : 'hover:bg-slate-50'}`}>
            <span className={activeCat === null ? 'text-white' : 'text-slate-500'}>{Icon.allCat}</span>
            <span className={`text-[10px] font-bold ${activeCat === null ? 'text-white' : 'text-slate-600'}`}>{t('lbl.all')}</span>
          </button>

          {/* Category list */}
          {categories.map((cat, i) => {
            const isActive = activeCat === cat.id;
            const [bg, fg] = CAT_COLORS[i % CAT_COLORS.length];
            return (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                className={`flex flex-col items-center justify-center py-3 px-1.5 gap-1.5 border-b border-slate-100 transition-colors shrink-0
                  ${isActive ? 'bg-orange-500' : 'hover:bg-slate-50'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black
                  ${isActive ? 'bg-white/20 text-white' : `${bg} ${fg}`}`}>
                  {cat.name?.slice(0, 2).toUpperCase()}
                </div>
                <span className={`text-[10px] font-semibold leading-tight text-center w-full line-clamp-2
                  ${isActive ? 'text-white' : 'text-slate-600'}`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* ═══ PRODUCT AREA ════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-slate-200">

          {/* Search */}
          <div className="px-3 py-2 bg-white border-b border-slate-200 shrink-0">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icon.search}</span>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={ready ? t('pos.search_product') : t('lbl.loading')}
                readOnly={!ready}
                className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xl leading-none">
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-2">
            {!ready ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">{t('lbl.loading')}</div>
            ) : displayedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <span className="text-slate-300">{Icon.box}</span>
                <p className="mt-3 text-sm text-slate-400 font-medium">{t('lbl.no_data')}</p>
              </div>
            ) : (
              <div ref={gridRef} className="grid grid-cols-5 gap-2">
                {displayedProducts.map((p, idx) => {
                  const price      = parseFloat(p.promo_price ?? p.selling_price) || 0;
                  const outOfStock = (p.stock_qty ?? 0) <= 0;
                  const isSelected = idx === selectedIdx;
                  return (
                    <button key={`${p.id}-${p.variant_id ?? ''}`}
                      onClick={() => { setSelectedIdx(idx); if (!outOfStock) addToCart(p); }}
                      className={`bg-white rounded-lg border shadow-sm overflow-hidden text-left transition-all
                        ${isSelected ? 'border-orange-400 ring-2 ring-orange-300 shadow-md' : 'border-slate-100'}
                        ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:border-orange-200 active:scale-95 cursor-pointer'}`}>
                      {/* Image */}
                      <div className={`w-full aspect-[4/3] flex items-center justify-center overflow-hidden relative ${isSelected ? 'bg-orange-50' : 'bg-slate-100'}`}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14M14 8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>
                          </svg>
                        )}
                        {outOfStock && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white text-[9px] font-bold bg-red-500 px-1.5 py-0.5 rounded-full">{t('lbl.inactive')}</span>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-1.5">
                        <p className="text-[11px] font-semibold text-slate-700 leading-tight line-clamp-2 min-h-[2.2em]">{p.name}</p>
                        <p className="text-xs font-bold text-orange-500 mt-0.5">Rs. {fmt(price)}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                          {parseFloat(p.stock_qty) > 0 ? `${fmt(p.stock_qty)} ${p.unit || ''}` : 'Out of stock'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>{/* end left 60% */}

        {/* ═══ RIGHT PANEL (Cart + Payment) ═══════════════════════════════════ */}
        <div className={`bg-white border-l border-slate-200 flex-col shrink-0 w-full lg:w-[40%] ${mobileTab === 'products' ? 'hidden lg:flex' : 'flex'}`}>

          {/* Customer selector */}
          <div className="px-4 pt-3 pb-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('lbl.customer')}</span>
              <button onClick={() => setQcForm({ name: '', phone: '' })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                {Icon.plus} {t('cust.quick_add')}
              </button>
            </div>
            <div className="relative">
              <input value={custQuery}
                onChange={e => { setCustQuery(e.target.value); setShowCust(true); }}
                onFocus={() => setShowCust(true)}
                onBlur={() => setTimeout(() => setShowCust(false), 150)}
                placeholder={t('lbl.select_customer')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-400" />
              {customer && (
                <button onClick={() => { setCustomer(null); setCustQuery(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
              )}
              {showCustDrop && filteredCusts.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 z-40 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto mb-1">
                  {filteredCusts.map(c => (
                    <button key={c.id} onMouseDown={() => { setCustomer(c); setCustQuery(c.name); setShowCust(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border-b border-slate-50 last:border-0">
                      <p className="font-semibold">{c.name}</p>
                      {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 py-8">
                {Icon.cart}
                <p className="mt-3 text-sm font-semibold text-slate-400">{t('pos.cart_empty')}</p>
                <p className="text-xs text-slate-300 mt-1">{t('pos.add_products')}</p>
              </div>
            ) : (
              <div className="px-2 py-2 space-y-0.5">
                {cart.map((item, i) => (
                  <div key={itemKey(item)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 group transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{item.name}</p>
                      <p className="text-xs text-orange-500 font-bold mt-0.5">Rs. {fmt(item.unit_price)} × {fmt(item.qty)}</p>
                    </div>
                    {/* Qty controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => item.qty <= 1 ? removeFromCart(i) : updateQty(i, -1)}
                        className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-red-300 hover:text-red-500 text-base font-bold leading-none transition-colors">
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-slate-700">{item.qty % 1 === 0 ? item.qty : fmt(item.qty)}</span>
                      <button onClick={() => updateQty(i, 1)}
                        className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-orange-300 hover:text-orange-500 text-base font-bold leading-none transition-colors">
                        +
                      </button>
                    </div>
                    {/* Line total */}
                    <span className="text-sm font-bold text-slate-800 shrink-0 w-16 text-right">
                      {fmt(item.total)}
                    </span>
                    {/* Remove */}
                    <button onClick={() => removeFromCart(i)}
                      className="text-slate-300 hover:text-red-500 text-xl leading-none opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add item manually */}
          <div className="px-3 py-2 border-t border-slate-100 shrink-0">
            {manualItem ? (
              <div className="flex gap-1.5 items-center">
                <input value={manualItem.name} onChange={e => setManualItem(m => ({ ...m, name: e.target.value }))}
                  placeholder="Item name" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') addManualItem(); if (e.key === 'Escape') setManualItem(null); }}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-orange-400" />
                <input type="number" value={manualItem.price} onChange={e => setManualItem(m => ({ ...m, price: e.target.value }))}
                  placeholder="Price"
                  className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-right outline-none focus:ring-1 focus:ring-orange-400" />
                <button onClick={addManualItem}
                  className="px-2.5 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors">{t('btn.add')}</button>
                <button onClick={() => setManualItem(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl leading-none transition-colors">&times;</button>
              </div>
            ) : (
              <button onClick={() => setManualItem({ name: '', price: '' })}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-500 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors border border-dashed border-slate-200 hover:border-orange-300">
                {Icon.plus} {t('pos.add_items')}
              </button>
            )}
          </div>

          {/* ── Total + Payment ── */}
          <div className="border-t border-slate-200 bg-slate-50 shrink-0">

            {/* Total row */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">{t('lbl.grand_total')}</p>
                <p className="text-3xl font-extrabold text-slate-800">{fmtAmt(total)}</p>
              </div>
              <div className="text-right text-xs text-slate-400 space-y-0.5">
                <p className="font-semibold text-slate-600">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
                {lineDisc > 0 && <p className="text-red-500 font-medium">− {fmtAmt(lineDisc)} disc</p>}
              </div>
            </div>

            {/* Payment tabs */}
            <div className="px-4 pb-3">
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
                {[
                  { id: 'cash',  label: t('lbl.cash'),  icon: Icon.cash  },
                  { id: 'card',  label: t('lbl.card'),  icon: Icon.card  },
                  { id: 'split', label: 'Split',         icon: Icon.split },
                  { id: 'paid',  label: t('th.paid'),   icon: Icon.check },
                ].map((m, i, arr) => (
                  <button key={m.id} onClick={() => { setPayMethod(m.id); setErr(''); }}
                    className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all
                      ${i < arr.length - 1 ? 'border-r border-slate-200' : ''}
                      ${payMethod === m.id ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment inputs */}
            <div className="px-4 pb-3">
              {payMethod === 'cash' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input ref={cashInputRef} type="number" min="0" step="0.01" value={cashPaid}
                      onChange={e => { setCashPaid(e.target.value); setShakeInput(false); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleCompleteSale(false, true); }}
                      placeholder="Amount paid"
                      className={`flex-1 rounded-xl border-2 px-4 py-3 text-lg font-bold text-right outline-none transition-colors ${shakeInput ? 'shake border-red-500' : 'border-orange-200 focus:border-orange-400'}`} />
                    <button onClick={() => setCashPaid(fmt(total))}
                      className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold whitespace-nowrap transition-colors">
                      {t('lbl.cash')}
                    </button>
                  </div>
                  {change > 0.005 && (
                    <p className="text-sm text-center font-bold text-green-600 bg-green-50 rounded-xl py-2.5">
                      {t('lbl.change')}: Rs. {fmt(change)}
                    </p>
                  )}
                  {change < -0.005 && cashNum > 0 && (
                    <p className="text-sm text-center font-bold text-red-500 bg-red-50 rounded-xl py-2.5">
                      {t('lbl.balance')}: Rs. {fmt(Math.abs(change))}
                    </p>
                  )}
                </div>
              )}
              {payMethod === 'card' && (
                <input type="text" value={cardRef} onChange={e => setCardRef(e.target.value)}
                  placeholder="Card reference (optional)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
              )}
              {payMethod === 'split' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">{t('lbl.cash')}</p>
                    <input type="number" min="0" step="0.01" value={splitCash}
                      onChange={e => setSplitCash(e.target.value)} placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Card Ref</p>
                    <input type="text" value={splitCardRef} onChange={e => setSplitCardRef(e.target.value)}
                      placeholder="ref"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
              )}
              {payMethod === 'paid' && (
                <div className="px-4 py-4 bg-green-50 rounded-xl text-center border border-green-200">
                  <p className="text-lg font-extrabold text-green-700">{fmtAmt(total)}</p>
                  <p className="text-xs text-green-600 mt-1">Exact amount received</p>
                </div>
              )}
            </div>

            {/* Error */}
            {err && (
              <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl">
                {err}
              </div>
            )}

            {/* Action buttons */}
            <div className="px-4 pb-5 flex gap-2">
              <button
                disabled={cart.length === 0}
                onClick={() => setHoldModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 rounded-xl text-sm font-bold transition-colors">
                {Icon.pause}
                <span>{t('pos.hold_btn')}</span>
                <span className="text-[10px] text-slate-400 font-normal">[F9]</span>
              </button>
              <button
                disabled={cart.length === 0 || submitting}
                onClick={() => handleCompleteSale(false, true)}
                className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-bold transition-colors shadow-md">
                {Icon.print}
                <span>{submitting ? t('pos.processing') : t('pos.complete_sale')}</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">[F10]</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MODALS ══════════════════════════════════════════════════════════ */}

      {sizePicker && (
        <SizePickerModal product={sizePicker.product} onSelect={onSizeSelect}
          onClose={() => setSizePicker(null)} />
      )}

      {receipt && <Receipt sale={receipt} settings={settings} onClose={newSale} />}

      {/* Quick add customer */}
      {qcForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-3">
            <h2 className="font-bold text-slate-800">{t('cust.quick_add')}</h2>
            <input autoFocus value={qcForm.name} onChange={e => setQcForm(f => ({ ...f, name: e.target.value }))}
              placeholder={`${t('cust.name')} *`}
              onKeyDown={e => { if (e.key === 'Enter') saveQuickCustomer(); if (e.key === 'Escape') setQcForm(null); }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
            <input value={qcForm.phone || ''} onChange={e => setQcForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="Phone (optional)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setQcForm(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">{t('btn.cancel')}</button>
              <button onClick={saveQuickCustomer}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600">{t('btn.add')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Hold / Draft modal */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-3">
            <h2 className="font-bold text-slate-800">{t('pos.hold_title')}</h2>
            <input autoFocus value={holdNote} onChange={e => setHoldNote(e.target.value)}
              placeholder={t('pos.hold_placeholder')}
              onKeyDown={e => { if (e.key === 'Enter') confirmHold(); if (e.key === 'Escape') setHoldModal(false); }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setHoldModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">{t('btn.cancel')}</button>
              <button onClick={confirmHold}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600">{t('btn.hold')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Drafts / Held bills list */}
      {showHeld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">{t('pos.held_bills')} ({heldBills.length})</h2>
              <button onClick={() => setShowHeld(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            {heldBills.length === 0 && <p className="text-slate-400 text-sm text-center py-4">{t('pos.no_held')}</p>}
            {heldBills.map((b, i) => (
              <div key={b.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{b.note || `${t('pos.hold_btn')} ${i + 1}`}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {b.cart?.length} item{b.cart?.length !== 1 ? 's' : ''} ·{' '}
                    {new Date(b.createdAt).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resumeHeld(i)}
                    className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors">
                    {t('btn.view')}
                  </button>
                  <button onClick={() => {
                    const u = heldBills.filter((_, j) => j !== i);
                    localStorage.setItem('pos_held', JSON.stringify(u));
                    setHeld(u);
                  }} className="px-3 py-1.5 border border-red-300 text-red-500 rounded-lg text-xs hover:bg-red-50 transition-colors">
                    {t('btn.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
