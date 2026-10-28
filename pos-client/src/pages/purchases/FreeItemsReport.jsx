import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../app/baseApi';
import { useGetSuppliersQuery } from '../../features/suppliers/suppliersApi';

const reportsApi = api.injectEndpoints({
  endpoints: build => ({
    getFreeItemsReport: build.query({ query: p => ({ url: '/reports/free-items', params: p }) }),
  }),
  overrideExisting: false,
});

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtQty = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

export default function FreeItemsReport() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('grn');
  const [filters, setFilters] = useState({ date_from: firstOfMonth(), date_to: today(), supplier_id: '' });
  const [query, setQuery] = useState(filters);

  const { data, isFetching } = reportsApi.useGetFreeItemsReportQuery(query);
  const { data: suppliers = [] } = useGetSuppliersQuery();

  function applyFilters() { setQuery({ ...filters }); }
  const set = f => e => setFilters(p => ({ ...p, [f]: e.target.value }));

  const grnGroups = {};
  (data?.grnRows || []).forEach(r => {
    const key = r.grn_no;
    if (!grnGroups[key]) grnGroups[key] = { grn_no: r.grn_no, purchase_id: r.purchase_id, date: r.purchase_date, supplier: r.supplier_name, items: [] };
    grnGroups[key].items.push(r);
  });
  const grnList = Object.values(grnGroups);
  const productRows = data?.productRows || [];

  const totalFreeValue = productRows.reduce((s, r) => s + parseFloat(r.total_free_value || 0), 0);
  const totalFreeQty   = productRows.reduce((s, r) => s + parseFloat(r.total_free_qty || 0), 0);

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/purchases')} className="text-slate-500 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">Free Items Report</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">From</label>
          <input type="date" value={filters.date_from} onChange={set('date_from')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">To</label>
          <input type="date" value={filters.date_to} onChange={set('date_to')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier</label>
          <select value={filters.supplier_id} onChange={set('supplier_id')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button onClick={applyFilters}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          {isFetching ? 'Loading…' : 'Apply'}
        </button>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <p className="text-xs text-green-600 font-semibold">Total Free Qty</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{fmtQty(totalFreeQty)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-blue-600 font-semibold">Free Value (at cost)</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">Rs. {fmt(totalFreeValue)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-600 font-semibold">Products with Free Items</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{productRows.length}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          {['grn', 'product'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold transition-colors ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'grn' ? 'GRN View' : 'Product View'}
            </button>
          ))}
        </div>

        <div className="p-4">
          {isFetching && <p className="text-sm text-slate-400 text-center py-8">Loading…</p>}

          {/* GRN tab */}
          {!isFetching && tab === 'grn' && (
            grnList.length === 0
              ? <p className="text-sm text-slate-400 text-center py-8">No free items found for this period.</p>
              : <div className="space-y-4">
                  {grnList.map(grn => (
                    <div key={grn.grn_no} className="border border-slate-100 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                        <div>
                          <button onClick={() => navigate(`/purchases/${grn.purchase_id}`)}
                            className="font-semibold text-blue-600 hover:underline text-sm">{grn.grn_no}</button>
                          <span className="text-xs text-slate-400 ml-2">{grn.date}</span>
                        </div>
                        <span className="text-xs text-slate-500">{grn.supplier}</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="text-xs text-slate-500 uppercase">
                          <tr className="border-b border-slate-100">
                            <th className="text-left px-4 py-2 font-semibold">Product</th>
                            <th className="text-right px-4 py-2 font-semibold">Paid Qty</th>
                            <th className="text-right px-4 py-2 font-semibold">Free Qty</th>
                            <th className="text-right px-4 py-2 font-semibold">Cost Price</th>
                            <th className="text-right px-4 py-2 font-semibold">Free Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grn.items.map((item, i) => (
                            <tr key={i} className="border-b border-slate-50 last:border-0">
                              <td className="px-4 py-2 text-slate-800">{item.product_name}</td>
                              <td className="px-4 py-2 text-right text-slate-600">{fmtQty(item.qty)}</td>
                              <td className="px-4 py-2 text-right font-semibold text-green-600">{fmtQty(item.free_qty)}</td>
                              <td className="px-4 py-2 text-right text-slate-600">Rs. {fmt(item.cost_price)}</td>
                              <td className="px-4 py-2 text-right font-semibold text-blue-600">Rs. {fmt(item.free_value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
          )}

          {/* Product tab */}
          {!isFetching && tab === 'product' && (
            productRows.length === 0
              ? <p className="text-sm text-slate-400 text-center py-8">No free items found for this period.</p>
              : <table className="w-full text-sm">
                  <thead className="text-xs text-slate-500 uppercase">
                    <tr className="border-b border-slate-100">
                      <th className="text-left pb-2 font-semibold">Product</th>
                      <th className="text-right pb-2 font-semibold">Total Received</th>
                      <th className="text-right pb-2 font-semibold">Total Free</th>
                      <th className="text-right pb-2 font-semibold">Free %</th>
                      <th className="text-right pb-2 font-semibold">Free Value</th>
                      <th className="text-left pb-2 font-semibold pl-4">GRNs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {productRows.map((r, i) => {
                      const pct = parseFloat(r.total_qty) > 0 ? (parseFloat(r.total_free_qty) / parseFloat(r.total_qty) * 100) : 0;
                      return (
                        <tr key={i}>
                          <td className="py-2 pr-3 font-medium text-slate-800">{r.product_name}</td>
                          <td className="py-2 text-right text-slate-600">{fmtQty(r.total_qty)}</td>
                          <td className="py-2 text-right font-semibold text-green-600">{fmtQty(r.total_free_qty)}</td>
                          <td className="py-2 text-right text-slate-500">{pct.toFixed(1)}%</td>
                          <td className="py-2 text-right font-semibold text-blue-600">Rs. {fmt(r.total_free_value)}</td>
                          <td className="py-2 pl-4 text-xs text-slate-400">{r.grn_nos}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200">
                    <tr>
                      <td className="pt-2 font-bold text-slate-700">Total</td>
                      <td></td>
                      <td className="pt-2 text-right font-bold text-green-600">{fmtQty(totalFreeQty)}</td>
                      <td></td>
                      <td className="pt-2 text-right font-bold text-blue-600">Rs. {fmt(totalFreeValue)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
          )}
        </div>
      </div>
    </div>
  );
}
