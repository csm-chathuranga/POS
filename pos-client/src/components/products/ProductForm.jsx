import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useGetCategoriesQuery } from '../../features/products/productsApi';
import { useLocale } from '../../contexts/LocaleContext';

const API    = import.meta.env.VITE_API_URL;
const IK_URL = 'https://upload.imagekit.io/api/v1/files/upload';

const UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'bottle', 'tin', 'bag'];
const emptyVariant = () => ({ label: '', barcode: '', cost_price: '', selling_price: '', wholesale_price: '', conversion_factor: 1 });

function Toggle({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform duration-200
        ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function ProductForm({ initial = {}, onSubmit, isSaving }) {
  const { data: categories = [] } = useGetCategoriesQuery();
  const { t } = useLocale();
  const token          = useSelector(selectToken);
  const fileInputRef   = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [pendingFile, setPendingFile] = useState(null);     // File object waiting to upload
  const [pendingPreview, setPendingPreview] = useState(''); // local object URL for preview

  const [form, setForm] = useState({
    name: '', name_si: '', barcode: '', sku: '',
    category_id: '', unit: 'pcs',
    cost_price: '0.00', selling_price: '0.00', wholesale_price: '0.00',
    promo_price: '', promo_start_date: '', promo_end_date: '',
    expiry_date: '', stock_qty: '0', alert_qty: '1',
    description: '',
    active: true, is_fast_moving: false,
    image: '',
    ...initial,
  });

  const [variants, setVariants] = useState(initial.variants || []);
  const [error, setError]       = useState('');

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  }
  function setToggle(field) {
    return val => setForm(f => ({ ...f, [field]: val }));
  }

  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    const preview = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingPreview(preview);
    if (fileInputRef.current)   fileInputRef.current.value   = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  async function uploadPendingFile() {
    const authRes = await fetch(`${API}/api/imagekit/auth`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const auth = await authRes.json();

    const fd = new FormData();
    fd.append('file', pendingFile);
    fd.append('fileName', `product_${Date.now()}`);
    fd.append('folder', '/pos/products');
    fd.append('publicKey',  auth.publicKey);
    fd.append('signature',  auth.signature);
    fd.append('expire',     auth.expire);
    fd.append('token',      auth.token);

    const upRes  = await fetch(IK_URL, { method: 'POST', body: fd });
    const upData = await upRes.json();
    if (!upRes.ok) throw new Error(upData.message || 'Upload failed');
    return upData.url;
  }

  function addVariant()           { setVariants(v => [...v, emptyVariant()]); }
  function removeVariant(i)       { setVariants(v => v.filter((_, idx) => idx !== i)); }
  function setVariant(i, k, val)  { setVariants(v => v.map((vv, idx) => idx === i ? { ...vv, [k]: val } : vv)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setUploadErr('');
    if (!form.name.trim())    return setError('Product name is required');
    if (!form.selling_price)  return setError('Selling price is required');
    let imageUrl = form.image;
    if (pendingFile) {
      setUploading(true);
      try {
        imageUrl = await uploadPendingFile();
        setPendingFile(null);
        URL.revokeObjectURL(pendingPreview);
        setPendingPreview('');
      } catch (err) {
        setUploadErr(err.message || 'Image upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    const nullIfEmpty = v => (v === '' || v === undefined) ? null : v;
    const payload = {
      ...form,
      image:            imageUrl,
      promo_price:      nullIfEmpty(form.promo_price),
      promo_start_date: nullIfEmpty(form.promo_start_date),
      promo_end_date:   nullIfEmpty(form.promo_end_date),
      expiry_date:      nullIfEmpty(form.expiry_date),
      category_id:      nullIfEmpty(form.category_id),
      variants,
    };
    try { await onSubmit(payload); }
    catch (err) { setError(err?.data?.error || 'Failed to save product'); }
  }

  const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition placeholder-slate-300';

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
      )}

      {/* ── Two-column grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* ── LEFT: SHOP INFORMATION ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('prod.shop_info')}</p>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.category')}</label>
            <select value={form.category_id} onChange={set('category_id')} className={inp}>
              <option value="">— {t('prod.select_category')} —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.name')} <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={set('name')} required placeholder={t('prod.name')} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.name_si')}</label>
              <input value={form.name_si} onChange={set('name_si')} placeholder="නමේ" className={inp} />
            </div>
          </div>

          {/* Barcode + SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.barcode')}</label>
              <input value={form.barcode} onChange={set('barcode')} placeholder="1234567890" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.sku')}</label>
              <input value={form.sku} onChange={set('sku')} placeholder="PROD-001" className={inp} />
            </div>
          </div>

          {/* Qty unit + Initial Stock + Alert */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.unit')}</label>
              <select value={form.unit} onChange={set('unit')} className={inp}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.initial_stock')}</label>
              <input type="number" min="0" step="0.001" value={form.stock_qty} onChange={set('stock_qty')} placeholder="0" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.low_stock_alert')}</label>
              <input type="number" min="0" step="0.001" value={form.alert_qty} onChange={set('alert_qty')} placeholder="1" className={inp} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.description')}</label>
            <textarea value={form.description} onChange={set('description')} rows={3}
              placeholder={t('prod.description')}
              className={`${inp} resize-none`} />
          </div>

          {/* Product Image */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('prod.image')}</label>
            <div className="flex items-start gap-3">
              {/* Preview */}
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 flex items-center justify-center">
                {uploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    <span className="text-[10px] text-slate-400">Uploading…</span>
                  </div>
                ) : pendingPreview ? (
                  <>
                    <img src={pendingPreview} alt="preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { URL.revokeObjectURL(pendingPreview); setPendingFile(null); setPendingPreview(''); }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center leading-none shadow">
                      ×
                    </button>
                  </>
                ) : form.image ? (
                  <>
                    <img src={form.image} alt="product" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, image: '' }))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center leading-none shadow">
                      ×
                    </button>
                  </>
                ) : (
                  <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14M14 8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>
                  </svg>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-500 text-sm font-medium transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14M14 8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>
                  </svg>
                  {t('prod.choose_photo')}
                </button>

                <button type="button" disabled={uploading} onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-green-400 text-green-600 hover:bg-green-50 text-sm font-medium transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="12" cy="13" r="3" strokeWidth={2}/>
                  </svg>
                  {t('prod.take_photo')}
                </button>

                <p className="text-xs text-slate-400">Max 5MB · Uploaded on save</p>
                {pendingFile && <p className="text-xs text-blue-500 font-medium">Image ready — will upload on save</p>}
                {uploadErr && <p className="text-xs text-red-500">{uploadErr}</p>}
              </div>
            </div>
            <input ref={fileInputRef}   type="file" accept="image/*"                     className="hidden" onChange={handleImageFile} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageFile} />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-slate-700">{t('prod.active')}</span>
            <Toggle checked={form.active} onChange={setToggle('active')} />
          </div>

          {/* Fast Moving toggle */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${form.is_fast_moving ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-100'}`}>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500">⚡</span>
                <span className="text-sm font-semibold text-slate-700">{t('prod.fast_moving')}</span>
              </div>
              <p className="text-xs text-amber-600 mt-0.5">{t('prod.fast_moving_hint')}</p>
            </div>
            <Toggle checked={form.is_fast_moving} onChange={setToggle('is_fast_moving')} />
          </div>
        </div>

        {/* ── RIGHT: PRICING ────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('prod.price_info')}</p>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.buy_price')} <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" value={form.cost_price} onChange={set('cost_price')} placeholder="0.00" className={inp} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.sell_price')} <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" value={form.selling_price} onChange={set('selling_price')} required placeholder="0.00" className={inp} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.wholesale_price')}</label>
              <input type="number" min="0" step="0.01" value={form.wholesale_price} onChange={set('wholesale_price')} placeholder="0.00" className={inp} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.expiry_date')}</label>
              <input type="date" value={form.expiry_date} onChange={set('expiry_date')} className={inp} />
            </div>

            {/* Promotional Price */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
              <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">{t('prod.promo_section')}</p>

              <div>
                <label className="block text-sm font-medium text-orange-600 mb-1.5">{t('prod.promo_price')}</label>
                <input type="number" min="0" step="0.01" value={form.promo_price} onChange={set('promo_price')} placeholder="0.00"
                  className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-orange-600 mb-1.5">{t('prod.promo_start')}</label>
                  <input type="date" value={form.promo_start_date} onChange={set('promo_start_date')}
                    className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-600 mb-1.5">{t('prod.promo_end')}</label>
                  <input type="date" value={form.promo_end_date} onChange={set('promo_end_date')}
                    className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition" />
                </div>
              </div>

              <p className="text-xs text-slate-400">{t('prod.promo_note')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sizes / Variants ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-700">{t('prod.sizes')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('prod.sizes_hint')}</p>
          </div>
          <button type="button" onClick={addVariant}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-400 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors">
            + {t('prod.add_size')}
          </button>
        </div>

        {variants.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
            {t('prod.no_sizes')}
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                {[
                  [t('prod.size_label') + ' *', 'label',             'text',   'e.g. 500ml'],
                  [t('prod.barcode'),            'barcode',           'text',   ''],
                  [t('prod.sell_price'),         'selling_price',     'number', '0.00'],
                  [t('prod.wholesale_price'),    'wholesale_price',   'number', '0.00'],
                  [t('prod.conv_factor'),        'conversion_factor', 'number', '1'],
                ].map(([label, key, type, ph]) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
                    <input type={type} value={v[key]} placeholder={ph}
                      onChange={e => setVariant(i, key, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                  </div>
                ))}
                <div className="md:col-span-5 flex justify-end">
                  <button type="button" onClick={() => removeVariant(i)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium">{t('prod.remove')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Save / Cancel ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <button type="submit" disabled={uploading || isSaving}
          className="py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-70 transition-colors shadow-md shadow-blue-600/20 flex items-center justify-center gap-2">
          {(uploading || isSaving) && (
            <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          )}
          {uploading ? 'Uploading…' : isSaving ? 'Saving…' : t('btn.save')}
        </button>
        <button type="button" onClick={() => history.back()}
          className="py-3 rounded-xl text-slate-500 text-sm font-medium hover:bg-slate-100 transition-colors">
          {t('btn.cancel')}
        </button>
      </div>
    </form>
  );
}
