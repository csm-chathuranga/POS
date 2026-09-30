import { useState, useEffect, useRef } from 'react';
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

const empty = { name: '', image: '', active: true };

export default function CategoriesIndex() {
  const { t } = useLocale();
  const { isOnline } = useConnectivity();
  const [modal, setModal]           = useState(null);
  const [err, setErr]               = useState('');
  const [saving, setSaving]         = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [offlineCategories, setOfflineCategories] = useState([]);
  const [pendingCategories, setPendingCategories] = useState([]);
  const [confirmDelete, setConfirmDelete]         = useState(null);
  const fileRef = useRef();

  const { register, handleSubmit: rhfSubmit, formState: { errors }, reset, setFocus, watch, setValue } = useForm({ defaultValues: empty });

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

  function openCreate() {
    reset(empty);
    setImagePreview('');
    setErr('');
    setModal('form');
    setTimeout(() => setFocus('name'), 50);
  }

  function openEdit(c) {
    reset({ name: c.name, image: c.image || '', active: c.active !== 0 });
    setImagePreview(c.image || '');
    setErr('');
    setModal({ edit: c });
    setTimeout(() => setFocus('name'), 50);
  }

  function close() { setModal(null); setImagePreview(''); }

  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImagePreview(ev.target.result);
      setValue('image', ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImagePreview('');
    setValue('image', '');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function toggleActive(c) {
    try {
      await update({ id: c.id, name: c.name, image: c.image || null, active: !c.active }).unwrap();
      refetch();
    } catch {}
  }

  const handleSave = rhfSubmit(async (data) => {
    setErr('');
    setSaving(true);
    try {
      const payload = { name: data.name.trim(), image: data.image || null, active: data.active };
      if (isOnline) {
        if (modal?.edit) await update({ id: modal.edit.id, ...payload }).unwrap();
        else await create(payload).unwrap();
        refetch();
      } else {
        if (modal?.edit) {
          await enqueueCategoryEdit(modal.edit.id, payload);
          setOfflineCategories(prev => prev.map(c =>
            c.id === modal.edit.id ? { ...c, ...payload } : c
          ));
        } else {
          await enqueueCategoryCreate(payload);
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

  function CatAvatar({ cat, size = 'md' }) {
    const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    if (cat.image) return <img src={cat.image} alt="" className={`${cls} rounded-lg object-cover shrink-0`} />;
    return (
      <div className={`${cls} rounded-lg bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-blue-700 font-black shrink-0`}>
        {cat.name?.[0]?.toUpperCase()}
      </div>
    );
  }

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
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            {t('btn.add')} {t('nav.categories')}
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border">{t('lbl.loading')}</div>}
        {!isLoading && categories.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border">No categories yet</div>
        )}
        {categories.map(c => (
          <div key={c.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CatAvatar cat={c} />
              <div>
                <p className="font-semibold text-slate-800">{c.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {(c._offline || c._pending) && <span className="text-[10px] text-amber-600 font-medium">Pending sync</span>}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.active !== 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.active !== 0 ? 'Active' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => toggleActive(c)} title={c.active !== 0 ? 'Hide' : 'Show'}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${c.active !== 0 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {c.active !== 0
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  }
                </svg>
              </button>
              <button onClick={() => openEdit(c)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                {t('btn.edit')}
              </button>
              {isOnline && (
                <button onClick={() => handleDelete(c)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/></svg>
                  {t('btn.delete')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t('lbl.loading')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-200 border-b border-slate-300 text-xs text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold w-10">#</th>
                <th className="px-4 py-3 text-left font-semibold">Image</th>
                <th className="px-4 py-3 text-left font-semibold">{t('cust.name')}</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No categories yet</td></tr>
              )}
              {categories.map((c, i) => (
                <tr key={c.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <CatAvatar cat={c} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{c.name}</span>
                    {(c._offline || c._pending) && <span className="ml-2 text-[10px] text-amber-600 font-medium">Pending sync</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => isOnline && toggleActive(c)}
                      disabled={!isOnline}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                        c.active !== 0
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      } disabled:cursor-not-allowed`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.active !== 0 ? 'bg-green-500' : 'bg-slate-400'}`} />
                      {c.active !== 0 ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        {t('btn.edit')}
                      </button>
                      {isOnline && (
                        <button onClick={() => handleDelete(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/></svg>
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
            <form onSubmit={handleSave} className="space-y-4">
              {err && <p className="text-sm text-red-600">{err}</p>}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('cust.name')} *</label>
                <input
                  {...register('name', { required: 'Name is required', validate: v => v.trim() !== '' || 'Name is required' })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${errors.name ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500'}`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category Image</label>
                {imagePreview ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                    <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={removeImage}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center leading-none hover:bg-red-600">
                      ×
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span className="text-[10px] font-medium">Upload</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                <input type="hidden" {...register('image')} />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Visible in POS</p>
                  <p className="text-xs text-slate-400">Show this category on the sales screen</p>
                </div>
                <button type="button"
                  onClick={() => setValue('active', !watch('active'))}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${watch('active') ? 'bg-green-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${watch('active') ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-1">
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
