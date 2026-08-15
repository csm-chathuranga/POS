import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  useGetCustomersQuery, useCreateCustomerMutation, useUpdateCustomerMutation,
  useDeleteCustomerMutation, useSettleCreditMutation,
} from '../../features/customers/customersApi';
import { useLocale } from '../../contexts/LocaleContext';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import { getLocalCustomers } from '../../services/cacheSync';
import { enqueueCustomerCreate, enqueueCustomerEdit, getPendingQueueByTypes } from '../../services/offlineQueue';
import ConfirmModal from '../../components/ConfirmModal';

const empty = { name: '', phone: '', email: '', address: '', credit_limit: 0, active: true };

export default function CustomersIndex() {
  const { t } = useLocale();
  const { isOnline } = useConnectivity();
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [applied, setApplied] = useState('');
  const [modal, setModal]   = useState(null);
  const [creditAmt, setCreditAmt] = useState('');
  const { register, handleSubmit: rhfSubmit, formState: { errors }, reset } = useForm({ defaultValues: empty });
  const [err, setErr]       = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [offlineCustomers, setOfflineCustomers] = useState([]);
  const [pendingCustomers, setPendingCustomers] = useState([]);
  const loadPending = () => getPendingQueueByTypes(['customer_create']).then(setPendingCustomers);
  useEffect(() => {
    if (!isOnline) getLocalCustomers().then(setOfflineCustomers);
    loadPending();
  }, [isOnline]);

  useEffect(() => {
    if (search.length === 0) { setApplied(''); setPage(1); return; }
    if (search.length < 3) return;
    const timer = setTimeout(() => { setApplied(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, refetch } = useGetCustomersQuery({ search: applied, page }, { skip: !isOnline });

  const baseRows = isOnline ? (data?.data || []) : offlineCustomers.filter(c =>
    !applied || c.name?.toLowerCase().includes(applied.toLowerCase()) || c.phone?.includes(applied)
  );
  const displayRows = [...pendingCustomers, ...baseRows.filter(r => !pendingCustomers.some(p => p.id === r.id))];
  const [create, { isLoading: creating }] = useCreateCustomerMutation();
  const [update, { isLoading: updating }] = useUpdateCustomerMutation();
  const [del]     = useDeleteCustomerMutation();
  const [settle, { isLoading: settling }] = useSettleCreditMutation();

  function openCreate() { reset(empty); setErr(''); setModal({ mode: 'form', data: null }); }
  function openEdit(c) { reset({ ...c }); setErr(''); setModal({ mode: 'form', data: c }); }
  function openCredit(c) { setCreditAmt(''); setErr(''); setModal({ mode: 'credit', data: c }); }
  function close() { setModal(null); }

  const handleSave = rhfSubmit(async (data) => {
    setErr('');
    setSaving(true);
    try {
      if (isOnline) {
        if (modal.data) await update({ id: modal.data.id, ...data }).unwrap();
        else await create(data).unwrap();
        refetch();
      } else {
        if (modal.data) {
          await enqueueCustomerEdit(modal.data.id, data);
          setOfflineCustomers(prev => prev.map(c =>
            c.id === modal.data.id ? { ...c, ...data } : c
          ));
        } else {
          await enqueueCustomerCreate(data);
          await loadPending();
        }
      }
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  });

  async function handleSettle(e) {
    e.preventDefault();
    setErr('');
    try {
      await settle({ id: modal.data.id, amount: parseFloat(creditAmt) }).unwrap();
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
  }

  async function handleDelete(c) {
    setConfirmDelete(c);
  }

  async function confirmDeleteAction() {
    await del(confirmDelete.id);
    setConfirmDelete(null);
    refetch();
  }

  const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('page.customers')}</h1>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Offline
            </span>
          )}
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            + {t('btn.add')} {t('lbl.customer')}
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); setApplied(search); setPage(1); }}
        className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('btn.search')}</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t('cust.name')} / ${t('cust.phone')}…`}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          {search.length > 0 && search.length < 3 && (
            <p className="text-[11px] text-slate-400 mt-1">Type {3 - search.length} more character{3 - search.length > 1 ? 's' : ''}…</p>
          )}
        </div>
        <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors">
          {t('btn.search')}
        </button>
      </form>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('lbl.loading')}</div>}
        {!isLoading && !displayRows.length && (
          <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('cust.no_customers')}</div>
        )}
        {displayRows.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-800">{c.name}</p>
                {(c._offline || c._pending) && <span className="text-[10px] text-amber-600 font-medium">Pending sync</span>}
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
              {isOnline && parseFloat(c.credit_balance) > 0 && (
                <button onClick={() => openCredit(c)}
                  className="flex-1 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                  {t('btn.settle')}
                </button>
              )}
              <button onClick={() => openEdit(c)}
                className="flex-1 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                {t('btn.edit')}
              </button>
              {isOnline && (
                <button onClick={() => handleDelete(c)}
                  className="flex-1 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                  {t('btn.delete')}
                </button>
              )}
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
      <div className="hidden md:block bg-white rounded-b-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400 text-sm">{t('lbl.loading')}</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-200 border-b border-slate-300 text-xs text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.name')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.phone')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('lbl.credit_limit')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('lbl.balance')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('th.status')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map(c => (
                <tr key={c.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {c.name}
                    {(c._offline || c._pending) && <span className="ml-2 text-[10px] text-amber-600 font-medium">Pending sync</span>}
                  </td>
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(c._offline || c._pending) && <span className="text-[10px] text-amber-600 font-medium">Pending</span>}
                      {isOnline && parseFloat(c.credit_balance) > 0 && (
                        <button onClick={() => openCredit(c)} className="inline-flex items-center px-2.5 py-1 rounded-md border border-orange-200 bg-orange-50 text-xs font-medium text-orange-600 hover:bg-orange-100 transition-colors">{t('btn.settle')}</button>
                      )}
                      <button onClick={() => openEdit(c)} className="inline-flex items-center px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">{t('btn.edit')}</button>
                      {isOnline && <button onClick={() => handleDelete(c)} className="inline-flex items-center px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors">{t('btn.delete')}</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!displayRows.length && (
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
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-3 py-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              Offline — will sync when reconnected
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-3">
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Field label={`${t('cust.name')} *`} error={errors.name}
              {...register('name', { required: 'Name is required' })} />
            <Field label={t('cust.phone')} {...register('phone')} />
            <Field label={t('cust.email')} type="email" {...register('email')} />
            <Field label={t('cust.address')} {...register('address')} />
            <Field label={t('cust.credit_limit')} type="number" min="0" step="0.01"
              {...register('credit_limit', { min: { value: 0, message: 'Cannot be negative' } })} error={errors.credit_limit} />
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" {...register('active')} className="rounded" />
              {t('cust.active')}
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">{t('btn.cancel')}</button>
              <button type="submit" disabled={creating || updating || saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-blue-700 flex items-center gap-2">
                {(creating || updating || saving) && (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                )}
                {creating || updating || saving ? t('lbl.loading') : t('btn.save')}
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

      {confirmDelete && (
        <ConfirmModal
          message={`Delete "${confirmDelete.name}"?`}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
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

function Field({ label, error, type = 'text', ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} {...props}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${error ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500'}`} />
      {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
    </div>
  );
}
