import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetSuppliersQuery } from '../../features/suppliers/suppliersApi';
import { useGetProductsQuery } from '../../features/products/productsApi';
import { useCreateSupplierReturnMutation } from '../../features/supplierReturns/supplierReturnsApi';

const fmt = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

export default function SupplierReturnsCreate() {
  const navigate = useNavigate();

  const { data: suppliers = [] } = useGetSuppliersQuery();
  const [createReturn, { isLoading: submitting }] = useCreateSupplierReturnMutation();

  const [supplierId,  setSupplierId]  = useState('');
  const [returnType,  setReturnType]  = useState('damaged');
  const [notes,       setNotes]       = useState('');
  const [items,       setItems]       = useState([]);
  const [err,         setErr]         = useState('');

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const { data: productResults } = useGetProductsQuery(
    { search: productSearch, limit: 10 },
    { skip: productSearch.trim().length < 2 }
  );
  const products = productResults?.data || [];

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function addProduct(product) {
    const already = items.find(i => i.product_id === product.id);
    if (already) {
      setErr('Product already in list. Adjust the quantity below.');
      setDropdownOpen(false);
      setProductSearch('');
      return;
    }
    setItems(prev => [...prev, {
      product_id:   product.id,
      product_name: product.name,
      qty:          '1',
      cost_price:   String(product.cost_price || '0'),
    }]);
    setProductSearch('');
    setDropdownOpen(false);
    setErr('');
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  const grandTotal = items.reduce((s, i) => s + (parseFloat(i.cost_price) || 0) * (parseFloat(i.qty) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!items.length) { setErr('Add at least one item.'); return; }
    for (const it of items) {
      if (!(parseFloat(it.qty) > 0)) { setErr(`Invalid quantity for "${it.product_name}".`); return; }
    }
    try {
      const payload = {
        supplier_id: supplierId || null,
        return_type: returnType,
        notes:       notes.trim() || null,
        items: items.map(i => ({
          product_id:   i.product_id,
          product_name: i.product_name,
          qty:          parseFloat(i.qty),
          cost_price:   parseFloat(i.cost_price) || 0,
        })),
      };
      await createReturn(payload).unwrap();
      navigate('/supplier-returns');
    } catch (ex) {
      setErr(ex?.data?.error || 'Failed to create return');
    }
  }

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/supplier-returns')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">New Supplier Return</h1>
          <p className="text-sm text-slate-400">Record damaged or expired stock returned to supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {err && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{err}</p>}

        {/* Meta fields */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Supplier <span className="text-slate-400 font-normal">(optional)</span></label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">— None —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Return Type <span className="text-red-500">*</span></label>
            <select
              value={returnType}
              onChange={e => setReturnType(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="damaged">Damaged</option>
              <option value="expired">Expired</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional details…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Product search */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-slate-700 text-sm">Items to Return</h2>

          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={productSearch}
              onChange={e => { setProductSearch(e.target.value); setDropdownOpen(true); }}
              onFocus={() => productSearch.trim().length >= 2 && setDropdownOpen(true)}
              placeholder="Search product by name or barcode…"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
            {dropdownOpen && products.length > 0 && (
              <div ref={dropdownRef} className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {products.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => addProduct(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-slate-800">{p.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">
                      Stock: {parseFloat(p.stock_qty || 0)} | Cost: Rs.{parseFloat(p.cost_price || 0).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-xs text-white uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Product</th>
                    <th className="px-4 py-2 text-right font-semibold w-28">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold w-32">Cost Price</th>
                    <th className="px-4 py-2 text-right font-semibold w-32">Total</th>
                    <th className="px-4 py-2 w-10"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item, i) => {
                    const lineTotal = (parseFloat(item.cost_price) || 0) * (parseFloat(item.qty) || 0);
                    return (
                      <tr key={item.product_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-800">{item.product_name}</td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.qty}
                            onChange={e => updateItem(i, 'qty', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.cost_price}
                            onChange={e => updateItem(i, 'cost_price', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-800">{fmt(lineTotal)}</td>
                        <td className="px-4 py-2 text-center">
                          <button type="button" onClick={() => removeItem(i)}
                            className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {items.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Search and add products above.</p>
          )}
        </div>

        {/* Summary + actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {items.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3 ml-auto">
              <span className="text-sm text-slate-500 mr-3">Grand Total</span>
              <span className="text-lg font-bold text-slate-800">{fmt(grandTotal)}</span>
            </div>
          )}
          <div className="flex gap-3 ml-auto">
            <button type="button" onClick={() => navigate('/supplier-returns')}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !items.length}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60 hover:bg-blue-700 transition-colors">
              {submitting ? 'Saving…' : 'Create Return'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
