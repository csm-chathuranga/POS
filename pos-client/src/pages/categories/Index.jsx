import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  useGetCategoriesQuery, useCreateCategoryMutation,
  useUpdateCategoryMutation, useDeleteCategoryMutation,
} from '../../features/categories/categoriesApi';
import { useLocale } from '../../contexts/LocaleContext';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import { getLocalCategories } from '../../services/cacheSync';
import { enqueueCategoryCreate, enqueueCategoryEdit, getPendingQueueByTypes } from '../../services/offlineQueue';
import ConfirmModal from '../../components/ConfirmModal';

const empty = { name: '' };

export default function CategoriesIndex() {
  const { t } = useLocale();
  const { isOnline } = useConnectivity();
  const [modal, setModal] = useState(null);
  const [err, setErr]     = useState('');
  const [saving, setSaving] = useState(false);
  const [offlineCategories, setOfflineCategories] = useState([]);
  const [pendingCategories, setPendingCategories] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { register, handleSubmit: rhfSubmit, formState: { errors }, reset, setFocus } = useForm({ defaultValues: empty });

  const loadPending = () => getPendingQueueByTypes(['category_create']).then(setPendingCategories);

  useEffect(() => {
    if (!isOnline) getLocalCategories().then(setOfflineCategories);
    loadPending();
  }, [isOnline]);

  const { data: serverCategories = [], isLoading, refetch } = useGetCategoriesQuery(undefined, { skip: !isOnline });
  const baseCategories = isOnline ? serverCategories : offlineCategories;
  const categories = [...pendingCategories, ...baseCategories.filter(c => !pendingCategories.some(p => p.id === c.id))];
  const [create, { isLoading: creating }] = useCreateCategoryMutation();
  const [update, { isLoading: updating }] = useUpdateCategoryMutation();
  const [del]                             = useDeleteCategoryMutation();

  function openCreate() { reset(empty); setErr(''); setModal('form'); setTimeout(() => setFocus('name'), 50); }
  function openEdit(c)  { reset({ name: c.name }); setErr(''); setModal({ edit: c }); setTimeout(() => setFocus('name'), 50); }
  function close()      { setModal(null); }

  const handleSave = rhfSubmit(async (data) => {
    setErr('');
    setSaving(true);
    try {
      if (isOnline) {
        if (modal?.edit) await update({ id: modal.edit.id, ...data }).unwrap();
        else await create(data).unwrap();
        refetch();
      } else {
        if (modal?.edit) {
          await enqueueCategoryEdit(modal.edit.id, data);
          setOfflineCategories(prev => prev.map(c =>
            c.id === modal.edit.id ? { ...c, ...data } : c
          ));
        } else {
          await enqueueCategoryCreate(data);
          await loadPending();
        }
      }
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  });

  async function handleDelete(c) { setConfirmDelete(c); }
  async function confirmDeleteAction() {
    await del(confirmDelete.id);
    setConfirmDelete(null);
    refetch();
  }

  const isBusy = creating || updating || saving;

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('page.categories')}</h1>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Offline
            </span>
          )}
          <button onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            + {t('btn.add')} {t('nav.categories')}
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('lbl.loading')}</div>}
        {!isLoading && categories.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">No categories yet</div>
        )}
        {categories.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-blue-700 text-sm font-black">
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{c.name}</p>
                {(c._offline || c._pending) && <span className="text-[10px] text-amber-600 font-medium">Pending sync</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(c)}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                {t('btn.edit')}
              </button>
              {isOnline && (
                <button onClick={() => handleDelete(c)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                  {t('btn.delete')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-b-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t('lbl.loading')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-200 border-b border-slate-300 text-xs text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold w-12">#</th>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.name')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No categories yet</td></tr>
              )}
              {categories.map((c, i) => (
                <tr key={c.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-blue-700 text-xs font-black shrink-0">
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-slate-800">{c.name}</span>
                        {(c._offline || c._pending) && <span className="ml-2 text-[10px] text-amber-600 font-medium">Pending sync</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(c)}
                        className="inline-flex items-center px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">
                        {t('btn.edit')}
                      </button>
                      {isOnline && (
                        <button onClick={() => handleDelete(c)}
                          className="inline-flex items-center px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors">
                          {t('btn.delete')}
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

      {confirmDelete && (
        <ConfirmModal
          message={`Delete "${confirmDelete.name}"?`}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                {modal?.edit ? t('page.edit_category') : `${t('btn.add')} ${t('nav.categories')}`}
              </h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            {!isOnline && (
              <div className="flex items-center gap-1.5 px-3 py-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                Offline — will sync when reconnected
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-3">
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('cust.name')} *</label>
                <input
                  {...register('name', { required: 'Name is required', validate: v => v.trim() !== '' || 'Name is required' })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${errors.name ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500'}`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={close}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                  {t('btn.cancel')}
                </button>
                <button type="submit" disabled={isBusy}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-blue-700 flex items-center gap-2">
                  {isBusy && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  )}
                  {isBusy ? t('lbl.loading') : t('btn.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
