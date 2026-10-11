import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useGetCategoriesQuery, useGetProductBatchesQuery, useCreateProductBatchMutation, useGetDiscountTiersQuery, useCreateDiscountTierMutation, useDeleteDiscountTierMutation } from '../../features/products/productsApi';
import { useLocale } from '../../contexts/LocaleContext';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import { getLocalCategories } from '../../services/cacheSync';
import { getApiUrl } from '../../config/runtimeConfig';

const API    = getApiUrl();
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
  const { isOnline } = useConnectivity();
  const { data: serverCategories = [] } = useGetCategoriesQuery(undefined, { skip: !isOnline });
  const { data: batches = [] } = useGetProductBatchesQuery(initial?.id, { skip: !initial?.id });
  const [createBatch, { isLoading: creatingBatch }] = useCreateProductBatchMutation();
  const [showBatchForm, setShowBatchForm] = useState(false);
  const emptyBatch = { batch_label: '', qty: '', cost_price: '', selling_price: '', expiry_date: '', received_at: new Date().toISOString().slice(0,10) };
  const [newBatch, setNewBatch] = useState(emptyBatch);
  const [batchError, setBatchError] = useState('');

  async function handleCreateBatch() {
    if (!newBatch.qty || !newBatch.selling_price) { setBatchError('Qty and Sell Price are required.'); return; }
    setBatchError('');
    await createBatch({ id: initial.id, ...newBatch }).unwrap().catch(e => setBatchError(e?.data?.message || 'Failed'));
    setNewBatch(emptyBatch);
    setShowBatchForm(false);
  }

  const { data: discountTiers = [] } = useGetDiscountTiersQuery(initial?.id, { skip: !initial?.id });
  const [createDiscountTier, { isLoading: creatingTier }] = useCreateDiscountTierMutation();
  const [deleteDiscountTier] = useDeleteDiscountTierMutation();
  const emptyTier = { min_qty: '', discount: '' };
  const [newTier, setNewTier] = useState(emptyTier);
  const [showTierForm, setShowTierForm] = useState(false);
  const [tierError, setTierError] = useState('');

  async function handleCreateTier() {
    if (!newTier.min_qty || !newTier.discount) { setTierError('Min Qty and Discount are required.'); return; }
    setTierError('');
    await createDiscountTier({ id: initial.id, min_qty: newTier.min_qty, discount: newTier.discount })
      .unwrap().catch(e => setTierError(e?.data?.message || 'Failed'));
    setNewTier(emptyTier);
    setShowTierForm(false);
  }
  const [localCategories, setLocalCategories] = useState([]);
  const categories = isOnline ? serverCategories : localCategories;

  const { t } = useLocale();
  const token = useSelector(selectToken);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm({
    defaultValues: {
      name: '', name_si: '', barcode: '', sku: '',
      category_id: '', unit: 'pcs',
      cost_price: '0.00', selling_price: '0.00', wholesale_price: '0.00', our_price: '',
      promo_price: '', promo_start_date: '', promo_end_date: '',
      expiry_date: '', stock_qty: '0', alert_qty: '1',
      description: '',
      active: true, is_fast_moving: false,
      image: '',
      ...initial,
    },
  });

  // Reset form when editing an existing product
  useEffect(() => {
    if (initial && Object.keys(initial).length) {
      const { variants: _, ...rest } = initial;
      reset(rest);
    }
  }, [initial?.id]);

  const active      = watch('active');
  const isFastMoving = watch('is_fast_moving');
  const image       = watch('image');
  const barcode     = watch('barcode');

  const nameRef         = useRef(null);
  const costPriceRef    = useRef(null);
  const sellingPriceRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const focusNext = (nextRef) => (e) => {
    if (e.key === 'Enter') { e.preventDefault(); nextRef.current?.focus(); }
  };

  useEffect(() => {
    if (!isOnline) getLocalCategories().then(setLocalCategories);
  }, [isOnline]);

  useEffect(() => {
    if (!categories.length || initial.category_id) return;
    const other = categories.find(c => c.name?.toLowerCase() === 'other');
    if (other) setValue('category_id', String(other.id), { shouldValidate: false });
  }, [categories]);

  const fileInputRef   = useRef(null);
  const cameraInputRef = useRef(null);
  const barcodeLocked  = useRef(false);

  const [uploading,    setUploading]    = useState(false);
  const [uploadErr,    setUploadErr]    = useState('');
  const [saving,       setSaving]       = useState(false);
  const [barcodeError, setBarcodeError] = useState('');
  const [pendingFile,  setPendingFile]  = useState(null);
  const [pendingPreview, setPendingPreview] = useState('');
  const [variants,     setVariants]     = useState(initial.variants || []);
  const [showVariants, setShowVariants] = useState((initial.variants || []).length > 0);
  const [submitError,  setSubmitError]  = useState('');

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

  function addVariant()          { setVariants(v => [...v, emptyVariant()]); }
  function removeVariant(i)      { setVariants(v => v.filter((_, idx) => idx !== i)); }
  function setVariant(i, k, val) { setVariants(v => v.map((vv, idx) => idx === i ? { ...vv, [k]: val } : vv)); }

  async function checkBarcodeUnique(val) {
    if (!val || !isOnline) return;
    try {
      const res = await fetch(`${API}/api/products/search?barcode=${encodeURIComponent(val)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const conflict = data.find(p => String(p.id) !== String(initial?.id));
      setBarcodeError(conflict ? `Already used by "${conflict.name}"` : '');
    } catch { /* ignore */ }
  }

  const { onChange: barcodeRegOnChange, onBlur: barcodeRegOnBlur, ref: barcodeRef, name: barcodeName } = register('barcode');

  const onFormSubmit = handleSubmit(async (data) => {
    setSubmitError('');
    setUploadErr('');
    if (barcodeError) return;

    let imageUrl = data.image;
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
      ...data,
      image:            imageUrl,
      promo_price:      nullIfEmpty(data.promo_price),
      promo_start_date: nullIfEmpty(data.promo_start_date),
      promo_end_date:   nullIfEmpty(data.promo_end_date),
      expiry_date:      nullIfEmpty(data.expiry_date),
      category_id:      nullIfEmpty(data.category_id),
      variants,
    };

    setSaving(true);
    const start = Date.now();
    try { await onSubmit(payload); }
    catch (err) { setSubmitError(err?.data?.error || err?.message || 'Failed to save product'); }
    finally {
      const elapsed = Date.now() - start;
      if (elapsed < 400) await new Promise(r => setTimeout(r, 400 - elapsed));
      setSaving(false);
    }
  });

  const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition placeholder-slate-300';
  const inpErr = 'w-full rounded-lg border border-red-400 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition placeholder-slate-300';
  const errMsg = (msg) => <p className="mt-1 text-xs text-red-500">{msg}</p>;

  return (
    <form onSubmit={onFormSubmit}>
      {submitError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{submitError}</div>
      )}

      {/* ── Two-column grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* ── LEFT: SHOP INFORMATION ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('prod.shop_info')}</p>

          {/* Category + English Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.category')}</label>
              <select {...register('category_id')} className={inp}>
                <option value="">— {t('prod.select_category')} —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                {t('prod.name')} <span className="text-red-500">*</span>
              </label>
              {(() => { const { ref: r, ...reg } = register('name', { required: 'Product name is required', validate: v => v.trim() !== '' || 'Product name is required' }); return (
              <input {...reg} ref={e => { r(e); nameRef.current = e; }}
                placeholder={t('prod.name')}
                className={errors.name ? inpErr : inp}
                onKeyDown={focusNext(costPriceRef)} />
              ); })()}
              {errors.name && errMsg(errors.name.message)}
            </div>
          </div>

          {/* Sinhala Name + Barcode + SKU */}
          <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 2fr 1fr' }}>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.name_si')}</label>
              <input {...register('name_si')} placeholder="නමේ" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.barcode')}</label>
              <input
                name={barcodeName}
                ref={barcodeRef}
                onChange={e => { if (!barcodeLocked.current) { setBarcodeError(''); barcodeRegOnChange(e); } }}
                onBlur={e => { barcodeRegOnBlur(e); checkBarcodeUnique(e.target.value); }}
                placeholder="1234567890"
                className={barcodeError ? inpErr : inp}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    barcodeLocked.current = true;
                    setTimeout(() => { barcodeLocked.current = false; checkBarcodeUnique(barcode); }, 800);
                  }
                }}
              />
              {barcodeError && errMsg(barcodeError)}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.sku')}</label>
              <input {...register('sku')} placeholder="PROD-001" className={inp} />
            </div>
          </div>

          {/* Qty unit + Initial Stock + Alert */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.unit')}</label>
              <select {...register('unit')} className={inp}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.initial_stock')}</label>
              <input type="number" min="0" step="0.001"
                {...register('stock_qty')}
                onFocus={e => e.target.select()} placeholder="0" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.low_stock_alert')}</label>
              <input type="number" min="0" step="0.001"
                {...register('alert_qty')}
                onFocus={e => e.target.select()} placeholder="1" className={inp} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.description')}</label>
            <textarea {...register('description')} rows={3}
              placeholder={t('prod.description')}
              className={`${inp} resize-none`} />
          </div>

          {/* Product Image + Toggles */}
          <div className="flex items-start gap-4">
            {/* Image picker */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-2">{t('prod.image')}</label>
              <div className="flex items-start gap-3">
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
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center leading-none shadow">×</button>
                    </>
                  ) : image ? (
                    <>
                      <img src={image} alt="product" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setValue('image', '')}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center leading-none shadow">×</button>
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
              <input ref={fileInputRef}   type="file" accept="image/*"                      className="hidden" onChange={handleImageFile} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageFile} />
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-3 pt-7 shrink-0">
              <div className="flex items-center justify-between gap-6">
                <span className="text-sm font-medium text-slate-700">{t('prod.active')}</span>
                <Toggle checked={active} onChange={val => setValue('active', val)} />
              </div>
              <div className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isFastMoving ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-100'}`}>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-500 text-xs">⚡</span>
                    <span className="text-sm font-semibold text-slate-700">{t('prod.fast_moving')}</span>
                  </div>
                  <p className="text-xs text-amber-600">{t('prod.fast_moving_hint')}</p>
                </div>
                <Toggle checked={isFastMoving} onChange={val => setValue('is_fast_moving', val)} />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: PRICING ────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('prod.price_info')}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  {t('prod.buy_price')} <span className="text-red-500">*</span>
                </label>
                {(() => { const { ref: r, ...reg } = register('cost_price', { required: 'Buy price is required', min: { value: 0.01, message: 'Buy price must be greater than 0' } }); return (
                <input type="number" min="0" step="0.01" {...reg}
                  ref={e => { r(e); costPriceRef.current = e; }}
                  onFocus={e => e.target.select()} placeholder="0.00"
                  className={errors.cost_price ? inpErr : inp}
                  onKeyDown={focusNext(sellingPriceRef)} />
                ); })()}
                {errors.cost_price && errMsg(errors.cost_price.message)}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  {t('prod.sell_price')} <span className="text-red-500">*</span>
                </label>
                {(() => { const { ref: r, ...reg } = register('selling_price', { required: 'Selling price is required', min: { value: 0.01, message: 'Selling price must be greater than 0' } }); return (
                <input type="number" min="0" step="0.01" {...reg}
                  ref={e => { r(e); sellingPriceRef.current = e; }}
                  onFocus={e => e.target.select()} placeholder="0.00"
                  className={errors.selling_price ? inpErr : inp}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onFormSubmit(e); } }} />
                ); })()}
                {errors.selling_price && errMsg(errors.selling_price.message)}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.wholesale_price')}</label>
                <input type="number" min="0" step="0.01"
                  {...register('wholesale_price')}
                  onFocus={e => e.target.select()} placeholder="0.00" className={inp} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('lbl.our_price')}</label>
                <input type="number" min="0" step="0.01"
                  {...register('our_price')}
                  onFocus={e => e.target.select()} placeholder="0.00" className={inp} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('prod.expiry_date')}</label>
              <input type="date" {...register('expiry_date')} className={inp} />
            </div>

            {/* Promotional Price */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
              <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">{t('prod.promo_section')}</p>
              <div>
                <label className="block text-sm font-medium text-orange-600 mb-1.5">{t('prod.promo_price')}</label>
                <input type="number" min="0" step="0.01"
                  {...register('promo_price')}
                  onFocus={e => e.target.select()} placeholder="0.00"
                  className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-orange-600 mb-1.5">{t('prod.promo_start')}</label>
                  <input type="date" {...register('promo_start_date')}
                    className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-600 mb-1.5">{t('prod.promo_end')}</label>
                  <input type="date" {...register('promo_end_date')}
                    className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition" />
                </div>
              </div>
              <p className="text-xs text-slate-400">{t('prod.promo_note')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Batch details (edit mode only) ───────────────────────────────── */}
      {initial?.id && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
              Stock Batches
            </h3>
            <div className="flex items-center gap-2">
              {batches.length > 0 && <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{batches.length}</span>}
              <button type="button" onClick={() => { setShowBatchForm(v => !v); setBatchError(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                New Batch
              </button>
            </div>
          </div>

          {/* Inline create form */}
          {showBatchForm && (
            <div className="px-5 py-4 border-b border-slate-100 bg-blue-50">
              <p className="text-xs font-bold text-blue-700 mb-3 uppercase tracking-wider">New Batch</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  ['Batch Label', 'batch_label', 'text',   'e.g. Oct-2026'],
                  ['Qty *',       'qty',         'number', '0'],
                  ['Cost Price',  'cost_price',  'number', '0.00'],
                  ['Sell Price *','selling_price','number', '0.00'],
                  ['Expiry Date', 'expiry_date', 'date',   ''],
                  ['Received',    'received_at', 'date',   ''],
                ].map(([label, key, type, ph]) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</label>
                    <input type={type} value={newBatch[key]} placeholder={ph}
                      onChange={e => setNewBatch(b => ({ ...b, [key]: e.target.value }))}
                      onFocus={e => type === 'number' && e.target.select()}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  </div>
                ))}
              </div>
              {batchError && <p className="text-xs text-red-600 mt-2">{batchError}</p>}
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={handleCreateBatch} disabled={creatingBatch}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {creatingBatch ? 'Saving…' : 'Save Batch'}
                </button>
                <button type="button" onClick={() => { setShowBatchForm(false); setBatchError(''); setNewBatch(emptyBatch); }}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {batches.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No batches yet. Click "New Batch" to add one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Batch</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-900 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-900 uppercase tracking-wider">Cost</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-900 uppercase tracking-wider">Sell Price</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Expiry</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b, i) => {
                    const isExpired = b.expiry_date && new Date(b.expiry_date) < new Date();
                    const isLow     = Number(b.qty) <= 0;
                    return (
                      <tr key={b.id ?? i} className={`transition-colors ${isLow ? 'bg-red-50' : isExpired ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {b.batch_label || <span className="text-slate-400 italic">—</span>}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                          {Number(b.qty).toFixed(3)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{Number(b.cost_price).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{Number(b.selling_price).toFixed(2)}</td>
                        <td className="px-4 py-2.5">
                          {b.expiry_date
                            ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{b.expiry_date}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{b.received_at || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Discount Tiers (edit mode only) ──────────────────────────────── */}
      {initial?.id && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
              </svg>
              Quantity Discounts
            </h3>
            <div className="flex items-center gap-2">
              {discountTiers.length > 0 && <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">{discountTiers.length}</span>}
              <button type="button" onClick={() => { setShowTierForm(v => !v); setTierError(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Add Tier
              </button>
            </div>
          </div>

          {showTierForm && (
            <div className="px-5 py-4 border-b border-slate-100 bg-green-50">
              <p className="text-xs font-bold text-green-700 mb-3 uppercase tracking-wider">New Discount Tier</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Min Qty *</label>
                  <input type="number" min="1" step="1" value={newTier.min_qty} placeholder="e.g. 10"
                    onChange={e => setNewTier(t => ({ ...t, min_qty: e.target.value }))}
                    onFocus={e => e.target.select()}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400 bg-white" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Discount (Rs.) *</label>
                  <input type="number" min="0" step="0.01" value={newTier.discount} placeholder="e.g. 20.00"
                    onChange={e => setNewTier(t => ({ ...t, discount: e.target.value }))}
                    onFocus={e => e.target.select()}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400 bg-white" />
                </div>
              </div>
              {tierError && <p className="text-xs text-red-600 mt-2">{tierError}</p>}
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={handleCreateTier} disabled={creatingTier}
                  className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors">
                  {creatingTier ? 'Saving…' : 'Save Tier'}
                </button>
                <button type="button" onClick={() => { setShowTierForm(false); setTierError(''); setNewTier(emptyTier); }}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {discountTiers.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No discount tiers yet. Click "Add Tier" to create quantity-based discounts.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Min Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-900 uppercase tracking-wider">Discount (Rs.)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-900 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discountTiers.map(tier => (
                    <tr key={tier.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">≥ {Number(tier.min_qty).toFixed(0)} units</td>
                      <td className="px-4 py-2.5 text-right font-bold text-green-700">Rs. {Number(tier.discount).toFixed(2)} off</td>
                      <td className="px-4 py-2.5 text-right">
                        <button type="button" onClick={() => deleteDiscountTier({ id: initial.id, tierId: tier.id })}
                          className="text-red-400 hover:text-red-600 text-xs font-semibold transition-colors">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-4 mt-4">
        <button type="button" onClick={() => history.back()}
          className="w-48 py-3 rounded-xl bg-red-500 text-white text-base font-semibold hover:bg-red-600 transition-colors shadow-sm">
          {t('btn.cancel')}
        </button>
        <button type="submit" disabled={uploading || saving || isSaving}
          className="flex items-center justify-center gap-2 w-48 py-3 rounded-xl bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 disabled:opacity-70 transition-colors shadow-sm">
          {(uploading || saving || isSaving) && (
            <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          )}
          {uploading ? 'Uploading…' : (saving || isSaving) ? 'Saving…' : t('btn.save')}
        </button>
      </div>
    </form>
  );
}
