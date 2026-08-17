import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateSaleMutation } from '../../features/sales/salesApi';
import { useGetProductsQuery } from '../../features/products/productsApi';

const fmt = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

export default function DayEndCreate() {
  const navigate = useNavigate();
  const [qtys, setQtys]     = useState({});
  const [search, setSearch] = useState('');
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useGetProductsQuery({ limit: 9999, page: 1 });
  const allProducts = data?.data || [];

  const [createSale] = useCreateSaleMutation();

  const filtered = useMemo(() => {
    if (!search) return allProducts;
    const q = search.toLowerCase();
    return allProducts.filter(p =>
      p.name?.toLowerCase().includes(q) || p.barcode?.includes(search)
    );
  }, [allProducts, search]);

  const entries = useMemo(() =>
    allProducts
      .filter(p => parseFloat(qtys[p.id] || 0) > 0)
      .map(p => ({ ...p, soldQty: parseFloat(qtys[p.id]) })),
    [allProducts, qtys]
  );

  const total = entries.reduce((s, p) => s + p.soldQty * parseFloat(p.selling_price || 0), 0);

  function setQty(id, val) {
    setQtys(prev => ({ ...prev, [id]: val === '' ? '' : Math.max(0, parseFloat(val) || 0) }));
  }

  async function handleSave() {
    if (!entries.length) return alert('Enter qty sold for at least one product.');
    setSaving(true);
    try {
      const items = entries.map(p => ({
        product_id: p.id,
        product_name: p.name,
        unit_price: parseFloat(p.selling_price || 0),
        original_price: parseFloat(p.selling_price || 0),
        cost_price: parseFloat(p.cost_price || 0),
        qty: p.soldQty,
        discount: 0,
        total: p.soldQty * parseFloat(p.selling_price || 0),
      }));
      await createSale({
        customer_id: null,
        subtotal: total,
        discount: 0,
        tax: 0,
        extra_charges: 0,
        total,
        paid: total,
        balance: 0,
        note: note || 'Day End Entry',
        items,
        payments: [{ method: 'cash', amount: total }],
      }).unwrap();
      navigate('/invoices');
    } catch (err) {
      alert('Save failed: ' + (err?.data?.error || err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Day End Entry</h1>
          <p className="text-xs text-slate-400 mt-0.5">Enter qty sold today for each product — stock will be deducted on save</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/invoices')}
            className="px-4 py-2 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !entries.length}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? 'Saving…' : entries.length ? `Save (${entries.length} products)` : 'Save'}
          </button>
        </div>
      </div>

      {/* Note */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <label className="block text-xs font-semibold text-slate-600 mb-1">Note (optional)</label>
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder={`Day End ${new Date().toLocaleDateString('en-LK')}`}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Summary bar */}
      {entries.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-semibold text-blue-800">
            {entries.length} product{entries.length !== 1 ? 's' : ''} with qty entered
          </span>
          <span className="text-lg font-bold text-blue-700">{fmt(total)}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product by name or barcode…"
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm" />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none">
            ×
          </button>
        )}
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Product</th>
                  <th className="px-4 py-3 text-right font-semibold">Stock</th>
                  <th className="px-4 py-3 text-right font-semibold w-36">Qty Sold</th>
                  <th className="px-4 py-3 text-right font-semibold">Price</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => {
                  const qty      = parseFloat(qtys[p.id] || 0);
                  const hasQty   = qty > 0;
                  const lineTotal = qty * parseFloat(p.selling_price || 0);
                  const stockQty  = parseFloat(p.stock_qty || 0);
                  const alertQty  = parseFloat(p.alert_qty || 0);
                  return (
                    <tr key={p.id}
                      className={`transition-colors ${hasQty ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-2.5">
                        <span className={`font-medium ${hasQty ? 'text-blue-800' : 'text-slate-800'}`}>{p.name}</span>
                        {p.category?.name && (
                          <span className="ml-2 text-xs text-slate-400">{p.category.name}</span>
                        )}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold tabular-nums
                        ${stockQty <= 0 ? 'text-red-500' : stockQty <= alertQty ? 'text-orange-500' : 'text-slate-500'}`}>
                        {stockQty}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number" min="0" step="1"
                          value={qtys[p.id] ?? ''}
                          onChange={e => setQty(p.id, e.target.value)}
                          placeholder="0"
                          className={`w-24 text-right px-2 py-1 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500
                            ${hasQty
                              ? 'border-blue-300 bg-white font-semibold text-blue-700'
                              : 'border-slate-200 bg-white text-slate-700'}`}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500 tabular-nums">{fmt(p.selling_price)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold tabular-nums
                        ${hasQty ? 'text-blue-700' : 'text-slate-300'}`}>
                        {hasQty ? fmt(lineTotal) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">No products found</td>
                  </tr>
                )}
              </tbody>
              {entries.length > 0 && !search && (
                <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold">
                  <tr>
                    <td className="px-4 py-3 text-slate-600">{entries.length} product{entries.length !== 1 ? 's' : ''}</td>
                    <td colSpan={3} />
                    <td className="px-4 py-3 text-right text-blue-700 text-base">{fmt(total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
