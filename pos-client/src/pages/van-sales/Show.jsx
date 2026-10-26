import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetVanTripQuery, useGetSettlementQuery,
  useAddDailyRecordMutation, useAddRefillMutation, useUnloadTripMutation,
} from '../../features/van-sales/vanSalesApi';
import { useGetProductsQuery } from '../../features/products/productsApi';

const fmt  = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const today = () => new Date().toISOString().slice(0, 10);

// ── Product Picker ─────────────────────────────────────────────────────────────

function ProductPicker({ value, onSelect, afterSelect }) {
  const [q, setQ]       = useState(value || '');
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const inputRef = useRef(null);
  const lastKey  = useRef(0);
  const scanBuf  = useRef('');
  const { data } = useGetProductsQuery({ active: 1, limit: 500 });
  const products = data?.data || [];

  const filtered = q.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(q.toLowerCase()))
      ).slice(0, 12)
    : products.slice(0, 10);

  useEffect(() => {
    const h = e => { if (inputRef.current && !inputRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function openDropdown() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
  }

  function pick(p) {
    setQ(p.name);
    setOpen(false);
    scanBuf.current = '';
    onSelect({ variant_name: p.name, unit_price: p.selling_price || 0, unit_cost: p.cost_price || 0 });
    afterSelect?.();
  }

  function handleKeyDown(e) {
    const now = Date.now();
    const gap = now - lastKey.current;
    lastKey.current = now;

    if (e.key === 'Enter') {
      e.preventDefault();
      const buf = scanBuf.current;
      scanBuf.current = '';
      if (buf.length > 2) {
        const match =
          products.find(p => p.barcode && p.barcode === buf) ||
          products.find(p => p.name.toLowerCase().includes(buf.toLowerCase()));
        if (match) { pick(match); return; }
      }
      if (filtered.length > 0) pick(filtered[0]);
      return;
    }

    if (e.key.length === 1) {
      if (gap < 80) scanBuf.current += e.key;
      else scanBuf.current = e.key;
    }
  }

  return (
    <div ref={inputRef}>
      <input value={q}
        onChange={e => { setQ(e.target.value); openDropdown(); onSelect({ variant_name: e.target.value }); }}
        onFocus={openDropdown}
        onKeyDown={handleKeyDown}
        placeholder="Search product or scan barcode…"
        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      {open && filtered.length > 0 && rect && createPortal(
        <div style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} type="button" onMouseDown={() => pick(p)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800 truncate">{p.name}</span>
              <span className="text-xs text-slate-400 shrink-0">Rs.{fmt(p.selling_price)}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Daily Modal ────────────────────────────────────────────────────────────────

function DailyModal({ tripId, existing, onClose }) {
  const init = existing || {};
  const [date, setDate]         = useState(init.date || today());
  const [advance, setAdvance]   = useState(init.advance_given ?? 5000);
  const [handover, setHandover] = useState(init.cash_handover ?? '');
  const [notes, setNotes]       = useState(init.notes || '');
  const [err, setErr]           = useState('');
  const [save, { isLoading }]   = useAddDailyRecordMutation();

  async function handleSubmit(e) {
    e.preventDefault(); setErr('');
    try {
      await save({ id: tripId, date, advance_given: advance, cash_handover: handover || 0, notes }).unwrap();
      onClose();
    } catch (ex) { setErr(ex?.data?.error || 'Failed to save'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-lg">{existing ? 'Edit Record' : 'Daily Record'}</h2>
              <p className="text-blue-100 text-xs mt-0.5">Record daily advance & cash handover</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl font-bold leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">&times;</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{err}</p>}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Advance (Rs.)</label>
              <input type="number" value={advance} onChange={e => setAdvance(e.target.value)} min="0" step="0.01"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cash In (Rs.)</label>
              <input type="number" value={handover} onChange={e => setHandover(e.target.value)} min="0" step="0.01" placeholder="0.00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right tabular-nums" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isLoading}
              className="flex-1 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {isLoading ? 'Saving…' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Refill Modal ───────────────────────────────────────────────────────────────

const EMPTY_ITEM = { variant_name: '', quantity: '', unit_price: '', unit_cost: '' };

function RefillModal({ tripId, existingItems: seedItems, onClose }) {
  const [date, setDate]   = useState(today());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState(
    seedItems.length
      ? seedItems.map(v => ({ variant_name: v.variant_name, quantity: '', unit_price: v.unit_price || '', unit_cost: v.unit_cost || '' }))
      : [{ ...EMPTY_ITEM }]
  );
  const [err, setErr]         = useState('');
  const [save, { isLoading }] = useAddRefillMutation();
  const qtyRefs = useRef([]);

  function setItem(i, k, v) { setItems(prev => prev.map((x, idx) => idx === i ? { ...x, [k]: v } : x)); }
  function setItemFromProduct(i, p) { setItems(prev => prev.map((x, idx) => idx === i ? { ...x, ...p } : x)); }

  async function handleSubmit(e) {
    e.preventDefault(); setErr('');
    const valid = items.filter(x => x.variant_name?.trim() && x.quantity);
    if (!valid.length) return setErr('Add at least one item');
    try {
      await save({ id: tripId, date, notes, items: valid }).unwrap();
      onClose();
    } catch (ex) { setErr(ex?.data?.error || 'Failed to save'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-lg">Add Refill</h2>
              <p className="text-amber-100 text-xs mt-0.5">Record additional stock loaded to van</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl font-bold leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">&times;</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {err && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{err}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</span>
                <button type="button" onClick={() => setItems(p => [...p, { ...EMPTY_ITEM }])}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                  Add Row
                </button>
              </div>
              <div className="grid grid-cols-[1fr_90px_130px_28px] gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                <span>Product / Variant</span><span className="text-right">Qty</span><span className="text-right">Selling Price</span><span></span>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_90px_130px_28px] gap-2 items-center">
                    <ProductPicker value={item.variant_name} onSelect={p => setItemFromProduct(i, p)}
                      afterSelect={() => qtyRefs.current[i]?.focus()} />
                    <input ref={el => qtyRefs.current[i] = el}
                      type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)}
                      min="0" placeholder="0" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right" />
                    <input type="number" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)}
                      min="0" step="0.01" placeholder="0.00" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right" />
                    {items.length > 1
                      ? <button type="button" onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}
                          className="text-slate-300 hover:text-red-500 font-bold text-xl leading-none">&times;</button>
                      : <span />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isLoading}
              className="px-6 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-60">
              {isLoading ? 'Saving…' : 'Save Refill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Unload Modal ───────────────────────────────────────────────────────────────

function UnloadModal({ trip, onClose }) {
  const variantNames = [...new Set(
    (trip.loads || []).flatMap(l => (l.items || []).map(i => i.variant_name))
  )];
  const [date, setDate]         = useState(today());
  const [items, setItems]       = useState(variantNames.map(v => ({ variant_name: v, qty_returned: '', qty_damaged: '' })));
  const [err, setErr]           = useState('');
  const [unload, { isLoading }] = useUnloadTripMutation();

  function setField(i, k, v) { setItems(prev => prev.map((x, idx) => idx === i ? { ...x, [k]: v } : x)); }

  async function handleSubmit(e) {
    e.preventDefault(); setErr('');
    const valid = items.filter(x => x.qty_returned !== '');
    if (!valid.length) return setErr('Enter at least one returned quantity');
    try {
      await unload({ id: trip.id, date, items: valid }).unwrap();
      onClose();
    } catch (ex) { setErr(ex?.data?.error || 'Failed to unload'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-rose-500 px-6 py-5 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-lg">Unload Van</h2>
              <p className="text-red-100 text-xs mt-0.5">Record returned stock & close this trip</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl font-bold leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">&times;</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {err && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{err}</p>}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/>
              </svg>
              <p className="text-xs text-amber-700">Enter <strong>returned</strong> qty for each variant. This will permanently <strong>close the trip</strong> and unlock the settlement report.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unload Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_110px_110px] gap-3 text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
                <span>Variant</span><span className="text-right">Returned</span><span className="text-right text-red-400">Damaged</span>
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_110px_110px] gap-3 items-center bg-slate-50 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{item.variant_name}</span>
                  <input type="number" value={item.qty_returned} onChange={e => setField(i, 'qty_returned', e.target.value)}
                    min="0" placeholder="0" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right bg-white" />
                  <input type="number" value={item.qty_damaged} onChange={e => setField(i, 'qty_damaged', e.target.value)}
                    min="0" placeholder="0" className="border border-red-100 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-400 outline-none text-right bg-white text-red-600" />
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex gap-2 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isLoading}
              className="flex-1 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60">
              {isLoading ? 'Processing…' : 'Confirm & Close Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tab: Stock ─────────────────────────────────────────────────────────────────

function StockTab({ trip }) {
  const variantMap = {};
  for (const load of trip.loads || []) {
    for (const item of load.items || []) {
      const k = item.variant_name;
      if (!variantMap[k]) variantMap[k] = { initial: 0, refills: 0, unit_price: Number(item.unit_price) };
      if (load.type === 'initial') variantMap[k].initial += item.quantity;
      else variantMap[k].refills += item.quantity;
    }
  }
  const returnMap = {};
  const damageMap = {};
  for (const u of trip.unload_items || []) {
    returnMap[u.variant_name] = (returnMap[u.variant_name] || 0) + u.qty_returned;
    damageMap[u.variant_name] = (damageMap[u.variant_name] || 0) + (u.qty_damaged || 0);
  }

  const rows = Object.entries(variantMap).map(([name, d]) => {
    const total    = d.initial + d.refills;
    const returned = returnMap[name] ?? null;
    const damaged  = damageMap[name] ?? null;
    const sold     = returned !== null ? total - returned - (damaged || 0) : null;
    return { name, initial: d.initial, refills: d.refills, total, returned, damaged, sold, unit_price: d.unit_price };
  });

  const totalSold = rows.reduce((s, r) => s + (r.sold ?? 0), 0);

  return (
    <div className="space-y-5">
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-600 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-white tabular-nums">{rows.reduce((s, r) => s + r.total, 0)}</div>
            <div className="text-xs text-blue-200 mt-0.5">Total Loaded</div>
          </div>
          <div className="bg-emerald-500 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-white tabular-nums">{totalSold || '—'}</div>
            <div className="text-xs text-emerald-100 mt-0.5">Units Sold</div>
          </div>
          <div className="bg-slate-700 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-white tabular-nums">{rows.reduce((s, r) => s + (r.returned ?? 0), 0) || '—'}</div>
            <div className="text-xs text-slate-400 mt-0.5">Returned</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl overflow-hidden border border-slate-200">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="bg-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Variant</th>
              <th className="text-right px-4 py-3">Initial</th>
              <th className="text-right px-4 py-3">Refills</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-right px-4 py-3">Returned</th>
              <th className="text-right px-4 py-3 text-red-400">Damaged</th>
              <th className="text-right px-4 py-3 text-blue-400">Sold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map(r => (
              <tr key={r.name} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                <td className="px-4 py-3 text-right text-slate-500">{r.initial}</td>
                <td className="px-4 py-3 text-right text-amber-600 font-medium">{r.refills || '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-700">{r.total}</td>
                <td className="px-4 py-3 text-right text-slate-400">{r.returned ?? '—'}</td>
                <td className="px-4 py-3 text-right text-red-500 font-medium">{r.damaged || '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">{r.sold ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-xs">No items loaded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(trip.loads || []).length > 1 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Load History</h3>
          <div className="space-y-2">
            {(trip.loads || []).map(load => (
              <div key={load.id} className="border border-slate-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${load.type === 'initial' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {load.type === 'initial' ? 'Initial Load' : 'Refill'}
                  </span>
                  <span className="text-sm text-slate-500">{fmtD(load.date)}</span>
                  {load.notes && <span className="text-xs text-slate-400 ml-1">{load.notes}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(load.items || []).map((item, i) => (
                    <span key={i} className="text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                      <span className="font-semibold text-slate-700">{item.variant_name}</span>
                      <span className="text-slate-400 ml-1.5">× {item.quantity}</span>
                      {item.unit_price > 0 && <span className="text-slate-300 ml-1.5">@ Rs.{fmt(item.unit_price)}</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Daily ─────────────────────────────────────────────────────────────────

function DailyTab({ trip, onAdd, onEdit }) {
  const records       = trip.daily_records || [];
  const totalAdvance  = records.reduce((s, r) => s + Number(r.advance_given), 0);
  const totalHandover = records.reduce((s, r) => s + Number(r.cash_handover), 0);

  return (
    <div className="space-y-4">
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-700 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-white tabular-nums">{records.length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Days Recorded</div>
          </div>
          <div className="bg-amber-500 rounded-xl p-3 text-center">
            <div className="text-sm font-bold text-white tabular-nums">{fmt(totalAdvance)}</div>
            <div className="text-xs text-amber-100 mt-0.5">Total Advance</div>
          </div>
          <div className="bg-emerald-500 rounded-xl p-3 text-center">
            <div className="text-sm font-bold text-white tabular-nums">{fmt(totalHandover)}</div>
            <div className="text-xs text-emerald-100 mt-0.5">Total Cash In</div>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-500">No daily records yet</p>
          {trip.status === 'active' && <p className="text-xs mt-1">Add today's advance and cash handover</p>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl overflow-hidden border border-slate-200">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="bg-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Advance</th>
                <th className="text-right px-4 py-3">Cash In</th>
                <th className="text-right px-4 py-3">Diff</th>
                <th className="text-left px-4 py-3">Notes</th>
                {trip.status === 'active' && <th className="px-4 py-3 w-12"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {records.map(r => {
                const diff = Number(r.cash_handover) - Number(r.advance_given);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{fmtD(r.date)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">{fmt(r.advance_given)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(r.cash_handover)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${diff >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                      {diff >= 0 ? '+' : ''}{fmt(diff)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{r.notes || '—'}</td>
                    {trip.status === 'active' && (
                      <td className="px-4 py-3">
                        <button onClick={() => onEdit(r)} className="text-xs text-slate-400 hover:text-blue-600 font-medium hover:underline">Edit</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-700 text-sm border-t-2 border-slate-200">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right text-amber-700">{fmt(totalAdvance)}</td>
                <td className="px-4 py-3 text-right text-green-700">{fmt(totalHandover)}</td>
                <td className={`px-4 py-3 text-right ${totalHandover - totalAdvance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {totalHandover - totalAdvance >= 0 ? '+' : ''}{fmt(totalHandover - totalAdvance)}
                </td>
                <td colSpan={trip.status === 'active' ? 2 : 1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {trip.status === 'active' && (
        <button onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors w-full justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Add Daily Record
        </button>
      )}
    </div>
  );
}

// ── Tab: Settlement ────────────────────────────────────────────────────────────

function SettlementTab({ tripId }) {
  const { data: s, isLoading, error } = useGetSettlementQuery(tripId);

  if (isLoading) return <div className="text-center py-14 text-slate-400 text-sm">Loading settlement…</div>;
  if (error)     return <div className="text-center py-14 text-red-500 text-sm">{error?.data?.error || 'Failed to load'}</div>;
  if (!s)        return null;

  const balanceOwed = s.balance >= 0;

  return (
    <div className="space-y-5">
      {/* Financial summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-blue-600 text-white rounded-xl p-4">
          <div className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1">Gross Sales</div>
          <div className="text-lg font-bold tabular-nums">Rs. {fmt(s.gross_sales)}</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Advances Given</div>
          <div className="text-lg font-bold text-amber-700 tabular-nums">Rs. {fmt(s.total_advances)}</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">Cash Collected</div>
          <div className="text-lg font-bold text-green-700 tabular-nums">Rs. {fmt(s.total_cash)}</div>
        </div>
        <div className={`rounded-xl p-4 border ${balanceOwed ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${balanceOwed ? 'text-red-400' : 'text-emerald-500'}`}>
            {balanceOwed ? 'Driver Owes' : 'Owed to Driver'}
          </div>
          <div className={`text-lg font-bold tabular-nums ${balanceOwed ? 'text-red-700' : 'text-emerald-700'}`}>
            Rs. {fmt(Math.abs(s.balance))}
          </div>
        </div>
      </div>

      {/* Variants table */}
      <div className="overflow-x-auto rounded-xl overflow-hidden border border-slate-200">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="bg-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Variant</th>
              <th className="text-right px-4 py-3">Loaded</th>
              <th className="text-right px-4 py-3">Returned</th>
              <th className="text-right px-4 py-3 text-red-400">Damaged</th>
              <th className="text-right px-4 py-3">Sold</th>
              <th className="text-right px-4 py-3">Unit Price</th>
              <th className="text-right px-4 py-3 text-blue-400">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {s.variants.map(v => (
              <tr key={v.name} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800">{v.name}</td>
                <td className="px-4 py-3 text-right text-slate-500">{v.loaded}</td>
                <td className="px-4 py-3 text-right text-slate-400">{v.returned}</td>
                <td className="px-4 py-3 text-right text-red-500 font-medium">{v.damaged || '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">{v.sold}</td>
                <td className="px-4 py-3 text-right text-slate-500">{fmt(v.unit_price)}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(v.sales_value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-700 border-t-2 border-slate-200">
              <td className="px-4 py-3" colSpan={5}>Total</td>
              <td className="px-4 py-3 text-right text-blue-700">{fmt(s.gross_sales)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

const TABS = [
  {
    key: 'stock', label: 'Stock',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg>,
  },
  {
    key: 'daily', label: 'Daily Records',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  },
  {
    key: 'settlement', label: 'Settlement',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
];

export default function VanSalesShow() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { data: trip, isLoading } = useGetVanTripQuery(id);

  const [tab, setTab]               = useState('stock');
  const [dailyModal, setDailyModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [refillModal, setRefillModal] = useState(false);
  const [unloadModal, setUnloadModal] = useState(false);

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-slate-400 text-sm flex items-center gap-2">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Loading trip…
      </div>
    </div>
  );
  if (!trip) return <div className="flex h-screen items-center justify-center text-red-500 text-sm">Trip not found</div>;

  // Build deduplicated list of loaded variants with their most-recent price
  const existingItemsMap = {};
  for (const load of trip.loads || []) {
    for (const item of load.items || []) {
      existingItemsMap[item.variant_name] = { variant_name: item.variant_name, unit_price: item.unit_price, unit_cost: item.unit_cost };
    }
  }
  const existingItems = Object.values(existingItemsMap);

  const totalDays     = (trip.daily_records || []).length;
  const totalAdvances = (trip.daily_records || []).reduce((s, r) => s + Number(r.advance_given), 0);
  const totalCash     = (trip.daily_records || []).reduce((s, r) => s + Number(r.cash_handover), 0);
  const isActive      = trip.status === 'active';

  return (
    <div className="flex h-full min-h-screen bg-slate-100">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* Back + branding */}
        <div className="px-4 pt-4 pb-4 border-b border-slate-100">
          <button onClick={() => navigate('/van-sales')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 font-semibold uppercase tracking-wide mb-4 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            All Trips
          </button>

          {/* Driver card */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {(trip.driver_name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-800 text-sm truncate">{trip.driver_name}</div>
              {trip.vehicle_no && <div className="text-xs text-slate-400 font-medium">{trip.vehicle_no}</div>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>{trip.status}</span>
            <span className="text-xs text-slate-400">{fmtD(trip.start_date)}</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-base font-bold text-slate-700 tabular-nums">{totalDays}</div>
              <div className="text-xs text-slate-400">Days</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-amber-600 tabular-nums leading-tight">{Number(totalAdvances / 1000).toFixed(1)}k</div>
              <div className="text-xs text-slate-400">Advance</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-green-600 tabular-nums leading-tight">{Number(totalCash / 1000).toFixed(1)}k</div>
              <div className="text-xs text-slate-400">Cash In</div>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">View</p>
          {TABS.map(t => {
            const locked = t.key === 'settlement' && !(!isActive);
            return (
              <button key={t.key}
                onClick={() => !locked && setTab(t.key)}
                disabled={locked}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : locked
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}>
                <span className={tab === t.key ? 'text-blue-600' : 'text-slate-400'}>{t.icon}</span>
                <span>{t.label}</span>
                {locked && (
                  <span className="ml-auto">
                    <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900">
              {tab === 'stock' ? 'Stock Overview' : tab === 'daily' ? 'Daily Records' : 'Trip Settlement'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {fmtD(trip.start_date)}{trip.end_date ? ` — ${fmtD(trip.end_date)}` : ' · ongoing'}
            </p>
          </div>

          {isActive ? (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setRefillModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition-all shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Refill
              </button>
              <button onClick={() => setUnloadModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white text-xs font-semibold rounded-xl hover:bg-red-600 transition-all shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                Unload
              </button>
              <button onClick={() => setDailyModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                Daily Record
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full shrink-0">Trip Closed</span>
          )}
        </div>

        <div className="p-6">
          {tab === 'stock'      && <StockTab trip={trip} />}
          {tab === 'daily'      && <DailyTab trip={trip} onAdd={() => setDailyModal(true)} onEdit={r => setEditRecord(r)} />}
          {tab === 'settlement' && !isActive && <SettlementTab tripId={id} />}
        </div>
      </main>

      {dailyModal  && <DailyModal tripId={id} onClose={() => setDailyModal(false)} />}
      {editRecord  && <DailyModal tripId={id} existing={editRecord} onClose={() => setEditRecord(null)} />}
      {refillModal && <RefillModal tripId={id} existingItems={existingItems} onClose={() => setRefillModal(false)} />}
      {unloadModal && <UnloadModal trip={trip} onClose={() => setUnloadModal(false)} />}
    </div>
  );
}
