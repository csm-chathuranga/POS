import { Fragment, useRef, useState } from 'react';
import { useGetProductsQuery } from '../../features/products/productsApi';
import {
  useGetCoopStoresQuery,
  useCreateCoopStoreMutation,
  useDeleteCoopStoreMutation,
  useGetCoopTransfersQuery,
  useGetCoopTransferQuery,
  useCreateCoopTransferMutation,
  useDeleteCoopTransferMutation,
} from '../../features/coop-city/coopCityApi';

const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = d => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const errMsg = e => e?.data?.error || 'Something went wrong';

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const btnPrimary = 'px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50';
const btnGhost = 'px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50';

// ── Searchable product picker (name / Sinhala name / barcode; Enter selects scan) ──
function ProductPicker({ id, products, value, onSelect }) {
  const selected = products.find(p => String(p.id) === String(value));
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const inputRef = useRef(null);

  const q = query.trim().toLowerCase();
  const matches = q
    ? products.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.name_si?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)).slice(0, 30)
    : products.slice(0, 30);

  const openList = () => {
    const r = inputRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 320) });
    setOpen(true);
  };

  const choose = p => {
    onSelect(p);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (!q) return;
      // A scanned barcode types the code then Enter: prefer an exact barcode/SKU match
      const exact = products.find(p => p.barcode?.toLowerCase() === q || p.sku?.toLowerCase() === q);
      const pick = exact || matches[active];
      if (pick) choose(pick);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        className={inputCls}
        placeholder={selected ? `${selected.name} (stock ${Number(selected.stock_qty)})` : 'Search item or scan barcode…'}
        value={open ? query : (selected ? selected.name : query)}
        onFocus={openList}
        onChange={e => { setQuery(e.target.value); setActive(0); if (!open) openList(); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        data-product-picker
      />
      {open && pos && (
        <div
          className="fixed z-50 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {matches.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">No items found</div>
          ) : matches.map((p, idx) => (
            <button
              type="button"
              key={p.id}
              onMouseDown={e => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setActive(idx)}
              className={`w-full text-left px-4 py-2 text-sm flex justify-between gap-3 ${idx === active ? 'bg-blue-50' : ''}`}
            >
              <span className="truncate">{p.name}{p.barcode ? <span className="text-slate-400"> · {p.barcode}</span> : null}</span>
              <span className="text-slate-500 shrink-0">stock {Number(p.stock_qty)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Transfer form (mirrors the F18 paper form) ───────────────────────────────
function TransferForm({ onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: stores = [] } = useGetCoopStoresQuery();
  const { data: prodData } = useGetProductsQuery({ page: 1, limit: 9999, active: '1' });
  const products = prodData?.data || [];
  const [createTransfer, { isLoading }] = useCreateCoopTransferMutation();

  const [form, setForm] = useState({
    date: today, from_store_id: '', to_store_id: '', remarks: '',
    prepared_by: '', checked_by: '', issued_by: '', received_by: '',
  });
  const [items, setItems] = useState([{ product_id: '', qty: '', cost_price: '', selling_price: '' }]);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (i, patch) => setItems(rows => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const pickProduct = (i, id, focusId) => {
    const p = products.find(x => String(x.id) === String(id));
    setItem(i, { product_id: id, cost_price: p ? p.cost_price : '', selling_price: p ? p.selling_price : '' });
    if (focusId) setTimeout(() => document.getElementById(focusId)?.focus(), 0);
  };

  const addRow = () => {
    const next = items.length;
    setItems(rows => [...rows, { product_id: '', qty: '', cost_price: '', selling_price: '' }]);
    setTimeout(() => document.getElementById(`pick-${next}`)?.focus(), 0);
  };

  // Enter moves to the next input; Enter on the last input of a row adds a new row
  const onEnter = (e, nextId, rowIndex) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (nextId) document.getElementById(nextId)?.focus();
    else if (rowIndex === items.length - 1) addRow();
    else document.getElementById(`pick-${rowIndex + 1}`)?.focus();
  };

  const lineTotals = r => ({
    cost: (parseFloat(r.qty) || 0) * (parseFloat(r.cost_price) || 0),
    sell: (parseFloat(r.qty) || 0) * (parseFloat(r.selling_price) || 0),
  });
  const totalCost = items.reduce((s, r) => s + lineTotals(r).cost, 0);
  const totalSell = items.reduce((s, r) => s + lineTotals(r).sell, 0);

  const submit = async () => {
    setErr('');
    const valid = items.filter(r => r.product_id && parseFloat(r.qty) > 0);
    try {
      await createTransfer({ ...form, items: valid }).unwrap();
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">New Stock Transfer</h2>
        <button onClick={onClose} className={btnGhost}>Cancel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-xs text-slate-500">Date
          <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
        </label>
        <label className="text-xs text-slate-500">From Store
          <select className={inputCls} value={form.from_store_id} onChange={e => set('from_store_id', e.target.value)}>
            <option value="">Select…</option>
            {stores.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">To Store
          <select className={inputCls} value={form.to_store_id} onChange={e => set('to_store_id', e.target.value)}>
            <option value="">Select…</option>
            {stores.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b">
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 w-28">Qty</th>
              <th className="px-4 py-3 w-32 text-right">Cost Value</th>
              <th className="px-4 py-3 w-32">Selling Rate</th>
              <th className="px-4 py-3 w-32 text-right">Selling Value</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => {
              const lt = lineTotals(r);
              return (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-4 py-2.5">
                    <ProductPicker id={`pick-${i}`} products={products} value={r.product_id} onSelect={p => pickProduct(i, p.id, `qty-${i}`)} />
                  </td>
                  <td className="px-4 py-2.5"><input id={`qty-${i}`} type="number" min="0" step="any" className={inputCls} value={r.qty} onChange={e => setItem(i, { qty: e.target.value })} onKeyDown={e => onEnter(e, `sell-${i}`)} /></td>
                  <td className="px-4 py-2.5 text-right">{fmt(lt.cost)}</td>
                  <td className="px-4 py-2.5"><input id={`sell-${i}`} type="number" min="0" step="any" className={inputCls} value={r.selling_price} onChange={e => setItem(i, { selling_price: e.target.value })} onKeyDown={e => onEnter(e, null, i)} /></td>
                  <td className="px-4 py-2.5 text-right">{fmt(lt.sell)}</td>
                  <td className="py-2.5 pr-2">
                    {items.length > 1 && (
                      <button onClick={() => setItems(rows => rows.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">✕</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={2} className="px-4 py-3 text-right">Total</td>
              <td className="px-4 py-3 text-right">{fmt(totalCost)}</td>
              <td />
              <td className="px-4 py-3 text-right">{fmt(totalSell)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        <button onClick={addRow} className="mt-2 text-sm text-blue-600 hover:underline">+ Add item</button>
      </div>

      <label className="text-xs text-slate-500 block">Remarks
        <textarea rows={2} className={inputCls} value={form.remarks} onChange={e => set('remarks', e.target.value)} />
      </label>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['prepared_by', 'Prepared by'], ['checked_by', 'Checked by'], ['issued_by', 'Issued by'], ['received_by', 'Received by']].map(([k, label]) => (
          <label key={k} className="text-xs text-slate-500">{label}
            <input className={inputCls} value={form[k]} onChange={e => set(k, e.target.value)} />
          </label>
        ))}
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="flex justify-end">
        <button onClick={submit} disabled={isLoading} className={btnPrimary}>
          {isLoading ? 'Saving…' : 'Save Transfer (reduces stock)'}
        </button>
      </div>
    </div>
  );
}

// ── Transfer detail / print (F18 layout: goods issued only) ──────────────────
const splitRs = n => {
  const v = Math.round((Number(n) || 0) * 100);
  return [Math.floor(v / 100).toLocaleString('en-LK'), String(v % 100).padStart(2, '0')];
};

const F18_ROWS = 12;
const cell = { border: '1px solid #000', padding: '3px 6px', fontSize: 13, height: 24 };
const head = { ...cell, textAlign: 'center', fontWeight: 600, height: 'auto' };

function TransferDetail({ id, onClose }) {
  const { data: tr, isLoading } = useGetCoopTransferQuery(id);
  if (isLoading || !tr) return <div className="p-6 text-slate-400">Loading…</div>;

  const blanks = Math.max(F18_ROWS - tr.items.length, 0);
  const money = n => { const [rs, cts] = splitRs(n); return [rs, cts]; };
  const MoneyCells = ({ value }) => {
    const [rs, cts] = money(value);
    return (<><td style={{ ...cell, textAlign: 'right' }}>{rs}</td><td style={{ ...cell, textAlign: 'right', width: 40 }}>{cts}</td></>);
  };
  const date = fmtDate(tr.date);

  return (
    <div className="space-y-4">
      <style>{`@media print {
        @page { size: A4 landscape; margin: 10mm; }
        body * { visibility: hidden !important; }
        .f18, .f18 * { visibility: visible !important; }
        .f18 { position: absolute !important; left: 0; top: 0; }
        .f18, .f18 * { border-color: #000 !important; }
        .f18 { padding: 0 !important; width: 100% !important; }
        .f18 table { page-break-inside: auto; }
        .f18 tr { page-break-inside: avoid; }
      }
      .f18 thead th { background: #d9d9d9 !important; background-image: none !important; color: #000 !important; border-color: #000 !important; }
      .f18 thead th * { color: #000 !important; }
      @media print {
        .f18 thead th, .f18 thead th * { color: #000 !important; }
        .f18 thead th { background-color: #d9d9d9 !important; }
      }`}</style>
      <div className="flex items-center justify-between no-print">
        <button onClick={onClose} className={btnGhost}>← Back</button>
        <button onClick={() => window.print()} className={`${btnPrimary} inline-flex items-center gap-2`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z" /></svg>
          Print
        </button>
      </div>

      <div className="f18 bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none print:border-0" style={{ color: '#000' }}>
        <table style={{ width: '100%', marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={{ width: '20%' }} />
              <td style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>ගබඩා අතර බඩු මාරු කිරීම</div>
                <div style={{ fontSize: 12 }}>Stock Transfer Between Stores</div>
              </td>
              <td style={{ width: '20%', textAlign: 'right', fontSize: 12 }}>
                <div style={{ fontWeight: 700 }}>F18</div>
                <div>No. {tr.transfer_no}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', fontSize: 13, marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 0' }}>බඩු නිකුත් කරන ගබඩාව / From: <b>{tr.fromStore?.name}</b></td>
              <td style={{ padding: '3px 0' }}>බඩු භාර ගන්නා ගබඩාව / To: <b>{tr.toStore?.name}</b></td>
              <td style={{ padding: '3px 0', textAlign: 'right' }}>දිනය / Date: <b>{date}</b></td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '34%' }} />
            <col style={{ width: '8%' }} />
            {[0, 1, 2].map(i => (
              <Fragment key={i}><col style={{ width: '13%' }} /><col style={{ width: '5%' }} /></Fragment>
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={head} rowSpan={4}>විස්තරය<br /><span style={{ fontWeight: 400, fontSize: 11 }}>Description</span></th>
              <th style={head} rowSpan={4}>ප්‍රමාණය<br /><span style={{ fontWeight: 400, fontSize: 11 }}>Qty</span></th>
              <th style={head} colSpan={6}>බඩු නිකුත් කරන ගබඩාව / Goods Issued</th>
            </tr>
            <tr>
              <th style={head} colSpan={2} rowSpan={2}>ගත් මිල<br /><span style={{ fontWeight: 400, fontSize: 11 }}>Cost</span></th>
              <th style={head} colSpan={4}>විකුණන මිල / Selling</th>
            </tr>
            <tr>
              <th style={head} colSpan={2}>Rate</th>
              <th style={head} colSpan={2}>Value</th>
            </tr>
            <tr>
              {Array.from({ length: 3 }).map((_, i) => (
                <Fragment key={i}>
                  <th style={{ ...head, fontWeight: 400 }}>රු.</th>
                  <th style={{ ...head, fontWeight: 400 }}>ශත</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {tr.items.map(it => (
              <tr key={it.id}>
                <td style={cell}>{it.product_name}</td>
                <td style={{ ...cell, textAlign: 'center' }}>{Number(it.qty)}</td>
                <MoneyCells value={it.cost_total} />
                <MoneyCells value={it.selling_price} />
                <MoneyCells value={it.selling_total} />
              </tr>
            ))}
            {Array.from({ length: blanks }).map((_, i) => (
              <tr key={`b${i}`}>
                {Array.from({ length: 8 }).map((__, j) => <td key={j} style={cell}>&nbsp;</td>)}
              </tr>
            ))}
            <tr style={{ fontWeight: 700 }}>
              <td style={{ ...cell, textAlign: 'right' }} colSpan={2}>මුළු එකතුව / Total</td>
              <MoneyCells value={tr.total_cost} />
              <td style={cell} colSpan={2} />
              <MoneyCells value={tr.total_selling} />
            </tr>
          </tbody>
        </table>

        {tr.remarks && <div style={{ fontSize: 13, marginTop: 8 }}>සටහන / Remarks: {tr.remarks}</div>}

        <div style={{ display: 'flex', gap: 32, fontSize: 13, marginTop: 24 }}>
          {[['පිළියෙල කළේ / Prepared by', tr.prepared_by], ['පරීක්ෂා කළේ / Checked by', tr.checked_by], ['නිකුත් කළේ / Issued by', tr.issued_by]].map(([l, v]) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ marginBottom: 6 }}>{l}: <b>{v || ''}</b></div>
              <div style={{ marginTop: 22 }}>අත්සන / Signature: ..............................</div>
              <div style={{ marginTop: 8 }}>දිනය / Date: {date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// ── Tabs ─────────────────────────────────────────────────────────────────────
function StockTransferTab() {
  const { data: transfers = [], isLoading } = useGetCoopTransfersQuery(undefined, { refetchOnMountOrArgChange: true });
  const [deleteTransfer] = useDeleteCoopTransferMutation();
  const [mode, setMode] = useState('list'); // list | new | { id }

  if (mode === 'new') return <TransferForm onClose={() => setMode('list')} />;
  if (typeof mode === 'object') return <TransferDetail id={mode.id} onClose={() => setMode('list')} />;

  const remove = async t => {
    if (!window.confirm(`Delete ${t.transfer_no}? Stock will be returned.`)) return;
    try { await deleteTransfer(t.id).unwrap(); } catch (e) { alert(errMsg(e)); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setMode('new')} className={btnPrimary}>+ New Transfer</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : transfers.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No stock transfers yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3.5 text-left">No.</th>
                <th className="px-5 py-3.5 text-left">Date</th>
                <th className="px-5 py-3.5 text-left">From</th>
                <th className="px-5 py-3.5 text-left">To</th>
                <th className="px-5 py-3.5 text-right">Cost Value</th>
                <th className="px-5 py-3.5 text-right">Selling Value</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-5 py-3.5"><button onClick={() => setMode({ id: t.id })} className="text-blue-600 hover:underline">{t.transfer_no}</button></td>
                  <td className="px-5 py-3.5">{fmtDate(t.date)}</td>
                  <td className="px-5 py-3.5">{t.fromStore?.name}</td>
                  <td className="px-5 py-3.5">{t.toStore?.name}</td>
                  <td className="px-5 py-3.5 text-right">{fmt(t.total_cost)}</td>
                  <td className="px-5 py-3.5 text-right">{fmt(t.total_selling)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setMode({ id: t.id })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" strokeWidth={2} /></svg>
                        View
                      </button>
                      <button onClick={() => remove(t)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V4h6v3m-8 0l1 13h8l1-13M10 11v6m4-6v6" /></svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StoresTab() {
  const { data: stores = [] } = useGetCoopStoresQuery();
  const [createStore, { isLoading }] = useCreateCoopStoreMutation();
  const [deleteStore] = useDeleteCoopStoreMutation();
  const [name, setName] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    try { await createStore({ name }).unwrap(); setName(''); } catch (e) { alert(errMsg(e)); }
  };
  const remove = async s => {
    if (!window.confirm(`Delete store "${s.name}"?`)) return;
    try { await deleteStore(s.id).unwrap(); } catch (e) { alert(errMsg(e)); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 max-w-lg space-y-3">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Store name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button onClick={add} disabled={isLoading} className={btnPrimary}>Add</button>
      </div>
      <ul className="divide-y divide-slate-100">
        {stores.length === 0 && <li className="py-4 text-center text-slate-400 text-sm">No stores yet.</li>}
        {stores.map(s => (
          <li key={s.id} className="flex items-center justify-between py-2 text-sm">
            <span>{s.name}</span>
            <button onClick={() => remove(s)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const NAV = [
  { key: 'transfer', label: 'Stock Transfer', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', Component: StockTransferTab },
  { key: 'stores',   label: 'Stores',         icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', Component: StoresTab },
];

export default function CoopCityIndex() {
  const [section, setSection] = useState('transfer');
  const Active = NAV.find(n => n.key === section).Component;

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* Sidebar */}
      <aside className="w-48 shrink-0 bg-white border-r border-slate-200 pt-4 no-print">
        <p className="px-4 pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Coop City</p>
        <nav className="space-y-0.5">
          {NAV.map(item => (
            <button key={item.key} onClick={() => setSection(item.key)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors text-left
                ${section === item.key
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        <Active />
      </main>
    </div>
  );
}
