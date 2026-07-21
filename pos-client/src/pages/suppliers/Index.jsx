import { useState } from 'react';
import {
  useGetSuppliersQuery, useCreateSupplierMutation,
  useUpdateSupplierMutation, useDeleteSupplierMutation,
} from '../../features/suppliers/suppliersApi';

const empty = { name: '', phone: '', email: '', address: '', active: true };

export default function SuppliersIndex() {
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState(empty);
  const [err, setErr]     = useState('');

  const { data: suppliers = [], isLoading } = useGetSuppliersQuery();
  const [create, { isLoading: creating }]  = useCreateSupplierMutation();
  const [update, { isLoading: updating }]  = useUpdateSupplierMutation();
  const [del]                               = useDeleteSupplierMutation();

  function openCreate() { setForm(empty); setErr(''); setModal(null); setModal('form'); }
  function openEdit(s)  { setForm({ ...s }); setErr(''); setModal({ edit: s }); }
  function close()      { setModal(null); }

  async function handleSave(e) {
    e.preventDefault(); setErr('');
    try {
      if (modal?.edit) await update({ id: modal.edit.id, ...form }).unwrap();
      else await create(form).unwrap();
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
  }

  async function handleDelete(s) {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    await del(s.id);
  }

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Suppliers</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          + Add Supplier
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Address</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{s.address || '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                    <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    <button onClick={() => handleDelete(s)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No suppliers yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">{modal?.edit ? 'Edit Supplier' : 'New Supplier'}</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              {err && <p className="text-sm text-red-600">{err}</p>}
              {[['Name *', 'name', 'text', { required: true }], ['Phone', 'phone'], ['Email', 'email', 'email'], ['Address', 'address']].map(([label, field, type = 'text', props = {}]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input type={type} value={form[field] ?? ''} onChange={set(field)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" {...props} />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={creating || updating}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-blue-700">
                  {creating || updating ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
