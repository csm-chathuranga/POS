import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useGetVanTripsQuery, useCreateVanTripMutation, useDeleteVanTripMutation, useGetVansQuery, useCreateVanMutation, useUpdateVanMutation, useDeleteVanMutation } from '../../features/van-sales/vanSalesApi';
import { useGetProductsQuery } from '../../features/products/productsApi';
import { useGetEmployeesQuery } from '../../features/employees/employeesApi';
import { useGetCategoriesQuery } from '../../features/categories/categoriesApi';

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

// ── Van picker input ───────────────────────────────────────────────────────────

function VanPicker({ value, onChange }) {
  const [q, setQ]       = useState(value || '');
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const inputRef = useRef(null);
  const { data: vans = [] } = useGetVansQuery();

  const filtered = q.trim().length > 0
    ? vans.filter(v =>
        v.name.toLowerCase().includes(q.toLowerCase()) ||
        v.vehicle_no.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8)
    : vans.slice(0, 8);

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

  function pick(van) {
    setQ(van.vehicle_no || van.name);
    setOpen(false);
    onChange(van.vehicle_no || van.name);
  }

  return (
    <div ref={inputRef}>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); openDropdown(); }}
        onFocus={openDropdown}
        placeholder="Select van or type…"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      {open && filtered.length > 0 && rect && createPortal(
        <div style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {filtered.map(van => (
            <button key={van.id} type="button" onMouseDown={() => pick(van)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800 truncate">{van.name}</span>
              {van.vehicle_no && <span className="text-xs text-slate-400 shrink-0">{van.vehicle_no}</span>}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Create Modal ───────────────────────────────────────────────────────────────

function CreateModal({ onClose }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [driver, setDriver]     = useState('');
  const [vehicle, setVehicle]   = useState('');
  const [date, setDate]         = useState(today);
  const [notes, setNotes]       = useState('');
  const [items, setItems]       = useState([]);
  const [err, setErr]           = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch]     = useState('');
  const [create, { isLoading }] = useCreateVanTripMutation();

  const { data: productsData } = useGetProductsQuery({ active: 1, limit: 500 });
  const { data: categories = [] } = useGetCategoriesQuery();
  const products = productsData?.data || [];

  const filtered = useMemo(() => products.filter(p => {
    const matchCat = catFilter === 'all' || p.category_id === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [products, catFilter, search]);

  function addProduct(p) {
    setItems(prev => {
      const hit = prev.find(x => x.variant_name === p.name);
      if (hit) return prev.map(x => x.variant_name === p.name ? { ...x, quantity: String(Number(x.quantity) + 1) } : x);
      return [...prev, { variant_name: p.name, quantity: '1', unit_price: String(p.selling_price || 0), unit_cost: String(p.cost_price || 0) }];
    });
  }

  function updateItem(name, key, val) {
    setItems(prev => prev.map(x => x.variant_name === name ? { ...x, [key]: val } : x));
  }

  function removeItem(name) {
    setItems(prev => prev.filter(x => x.variant_name !== name));
  }

  async function handleSubmit() {
    setErr('');
    if (!driver) return setErr('Driver name is required');
    const validItems = items.filter(x => x.variant_name && Number(x.quantity) > 0);
    if (!validItems.length) return setErr('Select at least one product with quantity > 0');
    try {
      const trip = await create({ driver_name: driver, vehicle_no: vehicle, start_date: date, notes, items: validItems }).unwrap();
      onClose();
      navigate(`/van-sales/${trip.id}`);
    } catch (ex) {
      setErr(ex?.data?.error || 'Failed to create trip');
    }
  }

  const getQty = name => Number(items.find(x => x.variant_name === name)?.quantity || 0);
  const totalItems = items.reduce((s, x) => s + Number(x.quantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">New Van Trip</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">&times;</button>
        </div>

        <div className="flex flex-1 min-h-0">

          {/* ── Left: product tile grid ───────────────────────── */}
          <div className="flex-1 flex flex-col border-r border-slate-100 min-w-0">

            {/* Search + category tabs */}
            <div className="px-4 pt-3 pb-2 shrink-0 space-y-2 border-b border-slate-100">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => setCatFilter('all')}
                  className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${catFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  All
                </button>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setCatFilter(cat.id)}
                    className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${catFilter === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tiles */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {filtered.map(p => {
                  const qty = getQty(p.name);
                  const inCart = qty > 0;
                  return (
                    <button key={p.id} type="button" onClick={() => addProduct(p)}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all active:scale-95 ${
                        inCart
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                      }`}>
                      {inCart && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                          {qty}
                        </span>
                      )}
                      <p className="text-xs font-semibold text-slate-800 leading-snug pr-5 line-clamp-2">{p.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 tabular-nums">Rs. {fmt(p.selling_price)}</p>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="col-span-5 text-center py-16 text-slate-400 text-sm">No products found</div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: trip details + cart ───────────────────── */}
          <div className="w-80 shrink-0 flex flex-col bg-slate-50/50">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

              {err && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Driver Name *</label>
                <DriverPicker value={driver} onChange={setDriver} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Vehicle</label>
                <VanPicker value={vehicle} onChange={setVehicle} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Start Date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                </div>
              </div>

              {/* Cart */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Load Items</span>
                  {totalItems > 0 && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      {totalItems} units
                    </span>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-200">
                    <svg className="w-8 h-8 text-slate-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/>
                    </svg>
                    <p className="text-xs text-slate-400">Tap a product tile to add</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <div key={item.variant_name} className="bg-white rounded-xl border border-slate-200 p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-700 truncate flex-1 mr-1">{item.variant_name}</span>
                          <button onClick={() => removeItem(item.variant_name)}
                            className="text-slate-300 hover:text-red-500 text-base font-bold leading-none shrink-0 transition-colors">&times;</button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <p className="text-[10px] text-slate-400 mb-0.5">Qty</p>
                            <input type="number" value={item.quantity}
                              onChange={e => updateItem(item.variant_name, 'quantity', e.target.value)}
                              min="0"
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:ring-1 focus:ring-blue-500 outline-none" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 mb-0.5">Price</p>
                            <input type="number" value={item.unit_price}
                              onChange={e => updateItem(item.variant_name, 'unit_price', e.target.value)}
                              min="0" step="0.01"
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:ring-1 focus:ring-blue-500 outline-none" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-200 flex gap-2 shrink-0">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 bg-white">
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {isLoading ? 'Opening…' : 'Open Trip'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar nav ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'trips', label: 'Trips', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
  { key: 'vans',  label: 'Vans',  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.25 0M13 16H9m4 0h5m-9-5h9M5 11V7h7v4"/></svg> },
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

// ── Vans Management ────────────────────────────────────────────────────────────

function VansSection() {
  const { data: vans = [], isLoading } = useGetVansQuery();
  const [createVan, { isLoading: isCreating }] = useCreateVanMutation();
  const [updateVan, { isLoading: isUpdating }] = useUpdateVanMutation();
  const [deleteVan] = useDeleteVanMutation();
  const [modal, setModal] = useState(null); // null | { mode:'add' } | { mode:'edit', van }

  async function handleSave(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { name: fd.get('name'), vehicle_no: fd.get('vehicle_no') };
    try {
      if (modal.mode === 'add') await createVan(body).unwrap();
      else await updateVan({ id: modal.van.id, ...body }).unwrap();
      setModal(null);
    } catch (ex) {
      alert(ex?.data?.error || 'Failed to save');
    }
  }

  async function handleDelete(van) {
    if (!confirm(`Remove van "${van.name}"?`)) return;
    try { await deleteVan(van.id).unwrap(); } catch (ex) { alert(ex?.data?.error || 'Failed'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal({ mode: 'add' })}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Add Van
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
      ) : vans.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.25 0M13 16H9m4 0h5m-9-5h9M5 11V7h7v4"/>
            </svg>
          </div>
          <p className="font-semibold text-slate-500">No vans registered yet</p>
          <button onClick={() => setModal({ mode: 'add' })}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
            + Add Van
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Van Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Vehicle No</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vans.map(van => (
                <tr key={van.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{van.name}</td>
                  <td className="px-4 py-3 text-slate-500">{van.vehicle_no || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModal({ mode: 'edit', van })}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(van)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{modal.mode === 'add' ? 'Add Van' : 'Edit Van'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Van Name *</label>
                <input name="name" defaultValue={modal.van?.name || ''} required
                  placeholder="e.g. Van 01"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Vehicle No</label>
                <input name="vehicle_no" defaultValue={modal.van?.vehicle_no || ''}
                  placeholder="e.g. ABC-1234"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating || isUpdating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
                  {isCreating || isUpdating ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
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
          <h1 className="text-base font-bold text-slate-800">
            {section === 'vans' ? 'Van Management' : 'Trips'}
          </h1>
          {section === 'trips' && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              New Trip
            </button>
          )}
        </div>
        <div className="flex-1 p-6">
          {section === 'trips' && <TripsSection onNew={() => setShowCreate(true)} />}
          {section === 'vans'  && <VansSection />}
        </div>
      </main>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
