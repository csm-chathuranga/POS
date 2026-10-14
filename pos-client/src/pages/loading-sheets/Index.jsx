import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useGetLoadingSheetsQuery,
  useGetAvailableSalesQuery,
  useCreateLoadingSheetMutation,
  useDeleteLoadingSheetMutation,
} from '../../features/loading-sheets/loadingSheetsApi';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CreateModal({ onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const navigate = useNavigate();
  const [date, setDate] = useState(today);
  const [driver, setDriver] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [route, setRoute] = useState('');
  const [selected, setSelected] = useState([]);
  const [err, setErr] = useState('');
  const [createSheet, { isLoading: creating }] = useCreateLoadingSheetMutation();
  const { data: sales = [], isLoading: loadingSales } = useGetAvailableSalesQuery(date, { refetchOnMountOrArgChange: true });

  function toggle(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function toggleAll() {
    setSelected(s => s.length === sales.length ? [] : sales.map(s => s.id));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErr('');
    try {
      const noteParts = [driver, vehicle, route].map(s => s.trim()).filter(Boolean);
      const note = noteParts.join(' | ');
      const sheet = await createSheet({ date, note, sale_ids: selected }).unwrap();
      onClose();
      navigate(`/loading-sheets/${sheet.id}`);
    } catch (ex) {
      setErr(ex?.data?.error || 'Failed to create sheet');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">New Loading Sheet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">&times;</button>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-4 shrink-0">
            {err && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>}

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Date</label>
                <input type="date" value={date}
                  onChange={e => { setDate(e.target.value); setSelected([]); }}
                  required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Driver</label>
                <input value={driver} onChange={e => setDriver(e.target.value)}
                  placeholder="e.g. Chamara"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Vehicle</label>
                <input value={vehicle} onChange={e => setVehicle(e.target.value)}
                  placeholder="e.g. AB-1234"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Route</label>
                <input value={route} onChange={e => setRoute(e.target.value)}
                  placeholder="e.g. Northern"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            {/* Sales picker header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Sales on {date}
                {!loadingSales && <span className="ml-2 font-normal text-slate-400 normal-case">({sales.length} available)</span>}
              </p>
              {sales.length > 0 && (
                <button type="button" onClick={toggleAll}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  {selected.length === sales.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
          </div>

          {/* Sales list — scrollable */}
          <div className="flex-1 overflow-y-auto border-t border-slate-100 mx-6 mb-4 rounded-lg border">
            {loadingSales ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading sales…</div>
            ) : !sales.length ? (
              <div className="p-6 text-center text-slate-400 text-sm">No available sales for this date.<br /><span className="text-xs">Sales already on a loading sheet are excluded.</span></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200" style={{ background: '#1e3a5f' }}>
                  <tr>
                    <th className="px-3 py-2.5 w-8">
                      <input type="checkbox" checked={selected.length === sales.length && sales.length > 0}
                        onChange={toggleAll} className="rounded" />
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Invoice</th>
                    <th className="px-3 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Customer</th>
                    <th className="px-3 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Phone</th>
                    <th className="px-3 py-2.5 text-right font-semibold" style={{ color: '#fff' }}>Total</th>
                    <th className="px-3 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => {
                    const checked = selected.includes(s.id);
                    return (
                      <tr key={s.id} onClick={() => toggle(s.id)}
                        className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${checked ? 'bg-blue-50' : 'odd:bg-white even:bg-slate-50 hover:bg-blue-50'}`}>
                        <td className="px-3 py-2.5 text-center">
                          <input type="checkbox" checked={checked} onChange={() => toggle(s.id)}
                            onClick={e => e.stopPropagation()} className="rounded" />
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold text-blue-700">{s.invoice_no}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{s.customer?.name || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{s.customer?.phone || '—'}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-800">Rs. {fmt(s.total)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            s.status === 'paid' ? 'bg-green-100 text-green-700' :
                            s.status === 'credit' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{s.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 shrink-0 flex items-center gap-3">
            <span className="text-sm text-slate-500 flex-1">
              {selected.length > 0 ? <><strong>{selected.length}</strong> sale{selected.length !== 1 ? 's' : ''} selected</> : 'No sales selected'}
            </span>
            <button type="button" onClick={onClose}
              className="px-5 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={creating}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {creating ? 'Creating…' : `Create Sheet${selected.length ? ` (${selected.length})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoadingSheetsIndex() {
  const { data: sheets = [], isLoading } = useGetLoadingSheetsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [deleteSheet] = useDeleteLoadingSheetMutation();
  const [showModal, setShowModal] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Loading Sheets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Group sales into delivery runs and mark them as delivered.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          + New Sheet
        </button>
      </div>

      <div className="bg-white border overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : !sheets.length ? (
          <div className="p-10 text-center text-slate-400">No loading sheets yet. Create one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider" style={{ background: '#1e3a5f' }}>
              <tr>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>Sheet No</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>Date</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>Note</th>
                <th className="px-4 py-3 text-center font-semibold" style={{ color: '#fff' }}>Items</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>Status</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: '#fff' }}>Delivered At</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sheets.map(s => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                    <Link to={`/loading-sheets/${s.id}`} className="hover:underline">{s.sheet_no}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{fmtDate(s.date)}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{s.note || '—'}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{s.item_count}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      s.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{s.delivered_at ? fmtDate(s.delivered_at) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link to={`/loading-sheets/${s.id}`}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors">
                        View
                      </Link>
                      {s.status === 'open' && (
                        <button onClick={() => setConfirmDel(s)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <CreateModal onClose={() => setShowModal(false)} />}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <p className="text-slate-700">Delete sheet <strong>{confirmDel.sheet_no}</strong>?<br />All items will be removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50">Cancel</button>
              <button onClick={async () => { await deleteSheet(confirmDel.id); setConfirmDel(null); }}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
