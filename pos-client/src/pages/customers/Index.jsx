import { useState } from 'react';
import {
  useGetCustomersQuery, useCreateCustomerMutation, useUpdateCustomerMutation,
  useDeleteCustomerMutation, useSettleCreditMutation,
} from '../../features/customers/customersApi';
import { useLocale } from '../../contexts/LocaleContext';

const empty = { name: '', phone: '', email: '', address: '', credit_limit: 0, active: true };

export default function CustomersIndex() {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [applied, setApplied] = useState('');
  const [modal, setModal]   = useState(null);   // { mode: 'form'|'credit', data: {} }
  const [form, setForm]     = useState(empty);
  const [creditAmt, setCreditAmt] = useState('');
  const [err, setErr]       = useState('');

  const { data, isLoading } = useGetCustomersQuery({ search: applied, page });
  const [create, { isLoading: creating }] = useCreateCustomerMutation();
  const [update, { isLoading: updating }] = useUpdateCustomerMutation();
  const [del]     = useDeleteCustomerMutation();
  const [settle, { isLoading: settling }] = useSettleCreditMutation();

  function openCreate() { setForm(empty); setErr(''); setModal({ mode: 'form', data: null }); }
  function openEdit(c) { setForm({ ...c }); setErr(''); setModal({ mode: 'form', data: c }); }
  function openCredit(c) { setCreditAmt(''); setErr(''); setModal({ mode: 'credit', data: c }); }
  function close() { setModal(null); }

  async function handleSave(e) {
    e.preventDefault();
    setErr('');
    try {
      if (modal.data) await update({ id: modal.data.id, ...form }).unwrap();
      else await create(form).unwrap();
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
  }

  async function handleSettle(e) {
    e.preventDefault();
    setErr('');
    try {
      await settle({ id: modal.data.id, amount: parseFloat(creditAmt) }).unwrap();
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    await del(c.id);
  }

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('page.customers')}</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          + {t('btn.add')} {t('lbl.customer')}
        </button>
      </div>

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); setApplied(search); setPage(1); }}
        className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('btn.search')}</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t('cust.name')} / ${t('cust.phone')}…`}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors">
          {t('btn.search')}
        </button>
      </form>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('lbl.loading')}</div>}
        {!isLoading && !(data?.data?.length) && (
          <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('cust.no_customers')}</div>
        )}
        {(data?.data || []).map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.phone || '—'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {c.active ? t('lbl.active') : t('lbl.inactive')}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
              <span>{t('lbl.credit_limit')}: {fmt(c.credit_limit)}</span>
              <span className={parseFloat(c.credit_balance) > 0 ? 'text-red-600 font-bold' : ''}>
                {t('lbl.balance')}: {fmt(c.credit_balance)}
              </span>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-50">
              {parseFloat(c.credit_balance) > 0 && (
                <button onClick={() => openCredit(c)}
                  className="flex-1 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                  {t('btn.settle')}
                </button>
              )}
              <button onClick={() => openEdit(c)}
                className="flex-1 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                {t('btn.edit')}
              </button>
              <button onClick={() => handleDelete(c)}
                className="flex-1 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                {t('btn.delete')}
              </button>
            </div>
          </div>
        ))}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-2 py-2 text-sm text-slate-500">
            <span>{data.total} {t('nav.customers')}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'‹'}</button>
              <span className="px-2 py-1">{page} / {data.last_page}</span>
              <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'›'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400 text-sm">{t('lbl.loading')}</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.name')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.phone')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('lbl.credit_limit')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('lbl.balance')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('th.status')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.data || []).map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(c.credit_limit)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={parseFloat(c.credit_balance) > 0 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                      {fmt(c.credit_balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.active ? t('lbl.active') : t('lbl.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    {parseFloat(c.credit_balance) > 0 && (
                      <button onClick={() => openCredit(c)} className="text-orange-500 hover:text-orange-700 font-medium">{t('btn.settle')}</button>
                    )}
                    <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 font-medium">{t('btn.edit')}</button>
                    <button onClick={() => handleDelete(c)} className="text-red-500 hover:text-red-700 font-medium">{t('btn.delete')}</button>
                  </td>
                </tr>
              ))}
              {!(data?.data?.length) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t('cust.no_customers')}</td></tr>
              )}
            </tbody>
          </table></div>
        )}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{data.total} {t('nav.customers')}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'‹'}</button>
              <span className="px-2 py-1">{page} / {data.last_page}</span>
              <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'›'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {modal?.mode === 'form' && (
        <Modal title={modal.data ? `${t('btn.edit')} ${t('lbl.customer')}` : `${t('btn.add')} ${t('lbl.customer')}`} onClose={close}>
          <form onSubmit={handleSave} className="space-y-3">
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Field label={`${t('cust.name')} *`} value={form.name} onChange={set('name')} required />
            <Field label={t('cust.phone')} value={form.phone} onChange={set('phone')} />
            <Field label={t('cust.email')} type="email" value={form.email} onChange={set('email')} />
            <Field label={t('cust.address')} value={form.address} onChange={set('address')} />
            <Field label={t('cust.credit_limit')} type="number" value={form.credit_limit} onChange={set('credit_limit')} min="0" step="0.01" />
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={set('active')} className="rounded" />
              {t('cust.active')}
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">{t('btn.cancel')}</button>
              <button type="submit" disabled={creating || updating} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-blue-700">
                {creating || updating ? t('lbl.loading') : t('btn.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Credit Settle Modal */}
      {modal?.mode === 'credit' && (
        <Modal title={`${t('btn.settle')} ${t('lbl.credit')} — ${modal.data.name}`} onClose={close}>
          <p className="text-sm text-slate-600 mb-3">{t('cust.current_balance')}: <strong className="text-red-600">{fmt(modal.data.credit_balance)}</strong></p>
          <form onSubmit={handleSettle} className="space-y-3">
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Field label="Payment Amount" type="number" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} min="0.01" step="0.01" required />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">{t('btn.cancel')}</button>
              <button type="submit" disabled={settling} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold disabled:opacity-60 hover:bg-orange-600">
                {settling ? t('lbl.loading') : t('btn.settle')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value ?? ''} onChange={onChange}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        {...props} />
    </div>
  );
}
