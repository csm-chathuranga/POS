import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetProductsQuery,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useImportProductsMutation,
} from '../../features/products/productsApi';

const SAMPLE_CSV_HEADERS = 'name,barcode,selling_price,cost_price,wholesale_price,stock_qty,alert_qty,unit';
const SAMPLE_CSV_ROW     = 'Sample Product,123456,100.00,70.00,80.00,50,5,pcs';

function printBarcode(product) {
  const code = product.barcode || String(product.id).padStart(6, '0');
  const win  = window.open('', '_blank', 'width=380,height=260');
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Barcode</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    <style>
      body{margin:0;font-family:Arial,sans-serif;text-align:center;padding:20px}
      p{margin:4px 0;font-size:13px}
      .name{font-weight:bold;font-size:14px}
    </style>
  </head><body>
    <svg id="bc"></svg>
    <p class="name">${product.name.replace(/</g,'&lt;')}</p>
    <p>${code}</p>
    <script>
      JsBarcode("#bc","${code}",{format:"CODE128",width:2,height:55,displayValue:false});
      setTimeout(()=>window.print(),400);
    </script>
  </body></html>`);
  win.document.close();
}

function downloadSampleCSV() {
  const csv  = [SAMPLE_CSV_HEADERS, SAMPLE_CSV_ROW].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'products_import_sample.csv';
  a.click(); URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines  = text.trim().split('\n');
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    return Object.fromEntries(header.map((h, i) => [h, vals[i] ?? '']));
  }).filter(r => r.name);
}

const fmtPrice = n =>
  'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtStock = (qty, unit) => {
  const n = parseFloat(qty || 0);
  return (Number.isInteger(n) ? n : n.toFixed(2)) + ' ' + (unit || 'pcs');
};

export default function ProductsIndex() {
  const searchRef = useRef(null);

  const [search, setSearch]     = useState('');
  const [catId,  setCatId]      = useState('');
  const [filter, setFilter]     = useState('all');   // 'all' | 'low_stock'
  const [page,   setPage]       = useState(1);
  const [applied, setApplied]   = useState({ search: '', category_id: '', low_stock: false });
  const [importMsg, setImportMsg] = useState('');

  const { data, isLoading } = useGetProductsQuery({
    ...applied,
    low_stock: applied.low_stock ? 'true' : undefined,
    page,
  });
  const { data: categories = [] } = useGetCategoriesQuery();
  const [deleteProduct] = useDeleteProductMutation();
  const [importProducts, { isLoading: importing }] = useImportProductsMutation();

  const fileInputRef = useRef(null);

  // F1 → focus search
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function applySearch(e) {
    if (e) e.preventDefault();
    setApplied({ search, category_id: catId, low_stock: filter === 'low_stock' });
    setPage(1);
  }

  function handleFilterToggle(val) {
    setFilter(val);
    setApplied(a => ({ ...a, low_stock: val === 'low_stock' }));
    setPage(1);
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    await deleteProduct(id);
  }

  async function handleCSVUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) { setImportMsg('No valid rows found in CSV'); return; }
    const res = await importProducts(rows).unwrap().catch(err => ({ error: err }));
    if (res.error) { setImportMsg('Import failed'); return; }
    setImportMsg(`Imported ${res.created} products, skipped ${res.skipped}`);
    setTimeout(() => setImportMsg(''), 4000);
    e.target.value = '';
  }

  const rows = data?.data || [];

  return (
    <div className="p-6 space-y-4">

      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-60">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applySearch()}
            placeholder="Search product (F1)"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Category */}
        <select
          value={catId}
          onChange={e => { setCatId(e.target.value); }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* All / Low Stock toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
          <button
            onClick={() => handleFilterToggle('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleFilterToggle('low_stock')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-l border-slate-200 transition-colors ${
              filter === 'low_stock' ? 'bg-orange-500 text-white border-orange-500' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            Low Stock
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Import CSV */}
          <input
            ref={fileInputRef}
            type="file" accept=".csv" className="hidden"
            onChange={handleCSVUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1M12 12V4m0 0L8 8m4-4 4 4" />
            </svg>
            {importing ? 'Importing…' : 'Import CSV'}
          </button>

          {/* Sample CSV */}
          <button
            onClick={downloadSampleCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1M8 12l4 4 4-4M12 4v12" />
            </svg>
            Sample CSV
          </button>

          {/* New Product */}
          <Link
            to="/products/create"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <span className="text-lg leading-none">+</span> New Product
          </Link>
        </div>
      </div>

      {/* Import feedback */}
      {importMsg && (
        <div className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {importMsg}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Barcode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Sell Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(p => {
                  const isLow = parseFloat(p.stock_qty) <= parseFloat(p.alert_qty);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      {/* Image */}
                      <td className="px-4 py-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
                              <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.5} />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M21 15l-5-5L5 21" />
                            </svg>
                          </div>
                        )}
                      </td>

                      {/* Product name */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        {p.name_si && <p className="text-xs text-slate-400">{p.name_si}</p>}
                      </td>

                      {/* Barcode */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {p.barcode || '—'}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {p.category?.name || '—'}
                      </td>

                      {/* Sell price */}
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {fmtPrice(p.selling_price)}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
                          {fmtStock(p.stock_qty, p.unit)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          p.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {/* Barcode print */}
                          <button
                            onClick={() => printBarcode(p)}
                            title="Print barcode"
                            className="text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8z" />
                            </svg>
                          </button>

                          <Link
                            to={`/products/${p.id}/edit`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </Link>

                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="text-red-500 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{data.total} products</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                ‹ Prev
              </button>
              {Array.from({ length: Math.min(data.last_page, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded-lg border transition-colors ${
                      p === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page >= data.last_page}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
