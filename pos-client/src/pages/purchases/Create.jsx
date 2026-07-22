import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatePurchaseMutation } from '../../features/purchases/purchasesApi';
import { useGetSuppliersQuery } from '../../features/suppliers/suppliersApi';
import { api } from '../../app/baseApi';
import { useLocale } from '../../contexts/LocaleContext';

const searchApi = api.injectEndpoints({
  endpoints: build => ({
    searchProducts: build.query({ query: q => `/products/search?q=${encodeURIComponent(q)}` }),
  }),
  overrideExisting: false,
});

const today = () => new Date().toISOString().slice(0, 10);
const emptyItem = (p = null) => ({
  product_id:   p?.id     ?? '',
  product_name: p?.name   ?? '',
  qty:          1,
  cost_price:   p?.cost_price ?? '',
  selling_price:p?.selling_price ?? '',
});

export default function PurchaseCreate() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [create, { isLoading }] = useCreatePurchaseMutation();
  const { data: suppliers = [] } = useGetSuppliersQuery();

  const [form, setForm] = useState({
    supplier_id: '', purchase_date: today(), status: 'received', paid: '', note: '',
  });
  const [items, setItems]     = useState([]);
  const [search, setSearch]   = useState('');
  const [results, setResults] = useState([]);
  const [err, setErr]         = useState('');
  const searchRef = useRef(null);
  const [trigger] = searchApi.useLazySearchProductsQuery();

  async function doSearch(q) {
    if (!q.trim()) { setResults([]); return; }
    const r = await trigger(q);
    setResults(r.data || []);
  }

  function addProduct(p) {
    setItems(prev => {
      const existing = prev.findIndex(i => i.product_id === p.id);
      if (existing >= 0) {
        return prev.map((item, idx) => idx === existing ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, emptyItem(p)];
    });
    setSearch('');
    setResults([]);
    searchRef.current?.focus();
  }

  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  function updateItem(i, field, value) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  const total = items.reduce((sum, i) => sum + (parseFloat(i.cost_price) || 0) * (parseFloat(i.qty) || 0), 0);
  const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!items.length) return setErr(t('pur.add_row'));
    try {
      await create({ ...form, total, items }).unwrap();
      navigate('/purchases');
    } catch (e) { setErr(e?.data?.error || t('lbl.error')); }
  }

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-slate-800">{t('pur.grn')}</h1>
      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{err}</p>}

      {/* Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('pur.supplier')}</label>
          <select value={form.supplier_id} onChange={set('supplier_id')}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{t('pur.select_supplier')}</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('th.date')}</label>
          <input type="date" value={form.purchase_date} onChange={set('purchase_date')}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('th.status')}</label>
          <select value={form.status} onChange={set('status')}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="received">Received</option>
            <option value="pending">{t('lbl.pending')}</option>
            <option value="partial">Partial</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('th.paid')}</label>
          <input type="number" min="0" step="0.01" value={form.paid} onChange={set('paid')} placeholder="0.00"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="col-span-2 md:col-span-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('lbl.note')}</label>
          <input value={form.note} onChange={set('note')} placeholder={t('pur.optional_note')}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Product search */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">{t('pur.items_title')}</h2>
        <div className="relative">
          <input ref={searchRef} value={search}
            onChange={e => { setSearch(e.target.value); doSearch(e.target.value); }}
            placeholder={t('pos.search_product')}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          {results.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-y-auto">
              {results.map(p => (
                <button key={p.id} type="button" onClick={() => addProduct(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-0">
                  <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                  <p className="text-xs text-slate-400">Cost: Rs.{parseFloat(p.cost_price).toFixed(2)} | Stock: {p.stock_qty}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left pb-2 font-semibold">{t('th.product')}</th>
                  <th className="text-right pb-2 font-semibold w-24">{t('th.qty')}</th>
                  <th className="text-right pb-2 font-semibold w-28">{t('pur.unit_price')}</th>
                  <th className="text-right pb-2 font-semibold w-28">{t('th.price')}</th>
                  <th className="text-right pb-2 font-semibold w-28">{t('th.total')}</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 font-medium text-slate-800">{item.product_name}</td>
                    <td className="py-2 pr-2">
                      <input type="number" min="0.001" step="0.001" value={item.qty}
                        onChange={e => updateItem(i, 'qty', e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-right outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min="0" step="0.01" value={item.cost_price}
                        onChange={e => updateItem(i, 'cost_price', e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-right outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min="0" step="0.01" value={item.selling_price}
                        onChange={e => updateItem(i, 'selling_price', e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-right outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 text-right font-semibold text-slate-700 pr-2">
                      {fmt((parseFloat(item.cost_price) || 0) * (parseFloat(item.qty) || 0))}
                    </td>
                    <td className="py-2">
                      <button type="button" onClick={() => removeItem(i)}
                        className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={4} className="pt-3 text-right font-bold text-slate-700 pr-2">{t('pur.grand_total')}</td>
                  <td className="pt-3 text-right font-bold text-slate-800 pr-2">Rs. {fmt(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => navigate('/purchases')}
          className="px-5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          {t('btn.cancel')}
        </button>
        <button type="button" disabled={isLoading || !items.length} onClick={handleSubmit}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {isLoading ? t('lbl.loading') : t('pur.save_purchase')}
        </button>
      </div>
    </div>
  );
}
