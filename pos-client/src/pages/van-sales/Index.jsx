import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useGetVanTripsQuery, useCreateVanTripMutation, useDeleteVanTripMutation } from '../../features/van-sales/vanSalesApi';
import { useGetProductsQuery } from '../../features/products/productsApi';
import { useGetEmployeesQuery } from '../../features/employees/employeesApi';

const fmt  = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Product picker input (supports barcode scanner) ───────────────────────────

function ProductPicker({ value, onSelect, afterSelect, placeholder = 'Search product…' }) {
  const [q, setQ]       = useState(value || '');
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const inputRef  = useRef(null);
  const lastKey   = useRef(0);  // timestamp of last keydown
  const scanBuf   = useRef(''); // characters accumulated during fast scan

  const { data } = useGetProductsQuery({ active: 1, limit: 500 });
  const products = data?.data || [];

  const filtered = q.trim().length > 0
    ? products.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(q.toLowerCase()))
      ).slice(0, 12)
    : products.slice(0, 10);

  useEffect(() => {
    function handler(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
        // barcode scanner fired — find by exact barcode first, then name substring
        const match =
          products.find(p => p.barcode && p.barcode === buf) ||
          products.find(p => p.name.toLowerCase().includes(buf.toLowerCase()));
        if (match) { pick(match); return; }
      }
      // regular keyboard Enter — pick top result
      if (filtered.length > 0) pick(filtered[0]);
      return;
    }

    // accumulate scan buffer only for rapid keystrokes (< 80 ms between chars)
    if (e.key.length === 1) {
      if (gap < 80) scanBuf.current += e.key;
      else scanBuf.current = e.key;
    }
  }

  return (
    <div ref={inputRef}>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); openDropdown(); onSelect({ variant_name: e.target.value }); }}
        onFocus={openDropdown}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      {open && filtered.length > 0 && rect && createPortal(
        <div style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} type="button" onMouseDown={() => pick(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800 truncate">{p.name}</span>
              <span className="text-xs text-slate-400 shrink-0">Rs. {fmt(p.selling_price)}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Driver picker input ────────────────────────────────────────────────────────

function DriverPicker({ value, onChange }) {
  const [q, setQ]       = useState(value || '');
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const inputRef = useRef(null);
  const { data: employees = [] } = useGetEmployeesQuery();

  const filtered = q.trim().length > 0
    ? employees.filter(e => e.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : employees.slice(0, 8);

  useEffect(() => {
    function handler(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function openDropdown() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
  }

  function pick(emp) {
    setQ(emp.name);
    setOpen(false);
    onChange(emp.name);
  }

  return (
    <div ref={inputRef}>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); openDropdown(); }}
        onFocus={openDropdown}
        required
        placeholder="Search employee…"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      {open && filtered.length > 0 && rect && createPortal(
        <div style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {filtered.map(emp => (
            <button key={emp.id} type="button" onMouseDown={() => pick(emp)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800 truncate">{emp.name}</span>
              {emp.position && <span className="text-xs text-slate-400 shrink-0">{emp.position}</span>}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Create Modal ───────────────────────────────────────────────────────────────

const EMPTY_ITEM = { variant_name: '', quantity: '', unit_price: '', unit_cost: '' };

function CreateModal({ onClose }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [driver, setDriver]   = useState('');
  const [vehicle, setVehicle] = useState('');
  const [date, setDate]       = useState(today);
  const [notes, setNotes]     = useState('');
  const [items, setItems]     = useState([{ ...EMPTY_ITEM }]);
  const [err, setErr]         = useState('');
  const [create, { isLoading }] = useCreateVanTripMutation();
  const qtyRefs = useRef([]);

  function setItem(i, k, v) { setItems(prev => prev.map((x, idx) => idx === i ? { ...x, [k]: v } : x)); }
  function setItemFromProduct(i, p) {
    setItems(prev => prev.map((x, idx) => idx === i ? { ...x, ...p } : x));
  }
  function addItem()     { setItems(prev => [...prev, { ...EMPTY_ITEM }]); }
  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    const validItems = items.filter(x => x.variant_name?.trim() && x.quantity);
    if (!validItems.length) return setErr('Add at least one item with a name and quantity');
    try {
      const trip = await create({ driver_name: driver, vehicle_no: vehicle, start_date: date, notes, items: validItems }).unwrap();
      onClose();
      navigate(`/van-sales/${trip.id}`);
    } catch (ex) {
      setErr(ex?.data?.error || 'Failed to create trip');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">New Van Trip</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {err && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Driver Name *</label>
                <DriverPicker value={driver} onChange={setDriver} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Vehicle No</label>
                <input value={vehicle} onChange={e => setVehicle(e.target.value)}
                  placeholder="e.g. ABC-1234" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Start Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Initial Load Items *</span>
                <button type="button" onClick={addItem}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800">+ Add Row</button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_90px_130px_28px] gap-3 text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
                  <span>Product / Variant</span><span>Qty</span><span>Selling Price</span><span></span>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_90px_130px_28px] gap-3 items-center">
                    <ProductPicker
                      value={item.variant_name}
                      onSelect={p => setItemFromProduct(i, p)}
                      afterSelect={() => qtyRefs.current[i]?.focus()}
                    />
                    <input ref={el => qtyRefs.current[i] = el}
                      type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)}
                      min="0" placeholder="0" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right" />
                    <input type="number" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)}
                      min="0" step="0.01" placeholder="0.00" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right" />
                    {items.length > 1
                      ? <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none font-bold">&times;</button>
                      : <span />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
            <button type="submit" disabled={isLoading}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {isLoading ? 'Creating…' : 'Open Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sidebar nav ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'trips',   label: 'Trips',   icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
];

// ── Trips list ─────────────────────────────────────────────────────────────────

function DeleteModal({ trip, onConfirm, onClose, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-800 text-center">Delete Trip?</h2>
          <p className="text-sm text-slate-500 text-center mt-1">
            This will permanently delete the trip for <span className="font-semibold text-slate-700">{trip.driver_name}</span>. This cannot be undone.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60">
            {isLoading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TripsSection({ onNew }) {
  const { data: trips = [], isLoading } = useGetVanTripsQuery();
  const [deleteTrip, { isLoading: isDeleting }] = useDeleteVanTripMutation();
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function handleDelete() {
    try {
      await deleteTrip(confirmDelete.id).unwrap();
      setConfirmDelete(null);
    } catch (ex) {
      setConfirmDelete(null);
      alert(ex?.data?.error || 'Failed to delete');
    }
  }

  if (isLoading) return <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>;

  const inRange = t => {
    const d = t.start_date?.slice(0, 10);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  };

  const active = trips.filter(t => t.status === 'active' && inRange(t));
  const closed = trips.filter(t => t.status === 'closed' && inRange(t));
  const total  = active.length + closed.length;

  return (
    <div className="space-y-5">
      {/* Date filter bar */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span className="text-xs font-semibold text-slate-500 shrink-0">From</span>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
        <span className="text-xs font-semibold text-slate-400 shrink-0">To</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }}
            className="ml-auto text-xs text-slate-400 hover:text-red-500 font-semibold flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400 tabular-nums">{total} trip{total !== 1 ? 's' : ''}</span>
      </div>

      {active.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            Active Trips
          </h3>
          <div className="space-y-2">
            {active.map(t => <TripCard key={t.id} t={t} onDelete={setConfirmDelete} />)}
          </div>
        </div>
      )}
      {closed.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
            Closed Trips
          </h3>
          <div className="space-y-2">
            {closed.map(t => <TripCard key={t.id} t={t} onDelete={setConfirmDelete} />)}
          </div>
        </div>
      )}
      {total === 0 && (
        <div className="text-center py-20 text-slate-400">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.25 0M13 16H9m4 0h5m-9-5h9M5 11V7h7v4"/>
            </svg>
          </div>
          <p className="font-semibold text-slate-500">{(from || to) ? 'No trips in this date range' : 'No trips yet'}</p>
          {!from && !to && (
            <button onClick={onNew} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
              + New Trip
            </button>
          )}
        </div>
      )}

      {confirmDelete && (
        <DeleteModal
          trip={confirmDelete}
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function TripCard({ t, onDelete }) {
  const isActive = t.status === 'active';
  return (
    <Link to={`/van-sales/${t.id}`}
      className={`block rounded-xl p-4 transition-all group border ${
        isActive
          ? 'bg-blue-600 border-blue-600 hover:bg-blue-700'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-800'}`}>{t.driver_name}</span>
            {t.vehicle_no && <span className={`text-xs font-medium ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>{t.vehicle_no}</span>}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>{t.status}</span>
          </div>
          <div className={`text-xs mb-2 ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
            {fmtD(t.start_date)}{t.end_date ? ` → ${fmtD(t.end_date)}` : ' · ongoing'}
          </div>
          <div className="flex gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg tabular-nums ${isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {t.summary?.days || 0} days
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg tabular-nums ${isActive ? 'bg-amber-400/30 text-amber-100' : 'bg-amber-50 text-amber-700'}`}>
              Adv Rs.{fmt(t.summary?.total_advance)}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg tabular-nums ${isActive ? 'bg-green-400/30 text-green-100' : 'bg-green-50 text-green-700'}`}>
              Cash Rs.{fmt(t.summary?.total_cash)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {isActive && (t.summary?.days || 0) === 0 ? (
            <button onClick={e => { e.preventDefault(); onDelete(t); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete
            </button>
          ) : (
            <svg className={`w-4 h-4 ${isActive ? 'text-blue-300' : 'text-slate-300 group-hover:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function VanSalesIndex() {
  const [section, setSection] = useState('trips');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex h-full min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="px-4 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.25 0M13 16H9m4 0h5m-9-5h9M5 11V7h7v4"/>
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-sm">Van Sales</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => setSection(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                section === item.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <h1 className="text-base font-bold text-slate-800">Trips</h1>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            New Trip
          </button>
        </div>
        <div className="flex-1 p-6">
          {section === 'trips' && <TripsSection onNew={() => setShowCreate(true)} />}
        </div>
      </main>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
