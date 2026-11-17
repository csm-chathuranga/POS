import { useRef, useState } from 'react';
import { useImportProductsMutation, useUpdateSinhalaNamesMutation } from '../../features/products/productsApi';
import { useImportCategoriesMutation } from '../../features/categories/categoriesApi';

function parseLine(line) {
  const fields = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) { fields.push(''); break; }
    if (line[i] === '"') {
      let field = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else field += line[i++];
      }
      fields.push(field.trim());
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) { fields.push(line.slice(i).trim()); break; }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = parseLine(lines[0]).map(h => h.toLowerCase());
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    return Object.fromEntries(header.map((h, i) => [h, values[i] ?? '']));
  }).filter(r => Object.values(r).some(v => String(v).trim() !== ''));
}

export default function ImportDataPage() {
  const [importProducts] = useImportProductsMutation();
  const [importCategories] = useImportCategoriesMutation();
  const [updateSinhalaNames] = useUpdateSinhalaNamesMutation();
  const [loading, setLoading] = useState({ products: false, categories: false, sinhala: false });
  const productInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const sinhalaInputRef = useRef(null);

  async function handleImport(type, file) {
    if (!file) return;
    setLoading(prev => ({ ...prev, [type]: true }));

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) {
        alert(`No valid rows found in this CSV file.`);
        return;
      }

      if (type === 'products') {
        const result = await importProducts(rows).unwrap();
        alert(`${result.created || 0} products imported${result.skipped ? `, ${result.skipped} skipped` : ''}.`);
      } else if (type === 'categories') {
        const result = await importCategories(rows).unwrap();
        alert(`${result.created || 0} categories imported${result.skipped ? `, ${result.skipped} skipped` : ''}.`);
      } else if (type === 'sinhala') {
        const result = await updateSinhalaNames(rows).unwrap();
        alert(`${result.updated || 0} products updated${result.skipped ? `, ${result.skipped} skipped` : ''}.`);
      }
    } catch (err) {
      alert(err?.data?.error || `Import failed`);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
      if (type === 'products') productInputRef.current.value = '';
      else if (type === 'categories') categoryInputRef.current.value = '';
      else sinhalaInputRef.current.value = '';
    }
  }

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Admin</p>
          <h1 className="text-2xl font-bold text-slate-800">Bulk Data Import</h1>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Products</h2>
              <p className="text-sm text-slate-500">CSV upload for product records</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Required columns</p>
              <p className="text-sm text-slate-600">name, barcode, selling_price, cost_price, wholesale_price, stock_qty, alert_qty, unit</p>
            </div>

            <input
              ref={productInputRef}
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700"
              onChange={e => handleImport('products', e.target.files?.[0])}
            />

            <button
              onClick={() => productInputRef.current?.click()}
              disabled={loading.products}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading.products ? 'Importing products…' : 'Upload Products CSV'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Categories</h2>
              <p className="text-sm text-slate-500">CSV upload for category records</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Required columns</p>
              <p className="text-sm text-slate-600">name</p>
            </div>

            <input
              ref={categoryInputRef}
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-semibold hover:file:bg-emerald-700"
              onChange={e => handleImport('categories', e.target.files?.[0])}
            />

            <button
              onClick={() => categoryInputRef.current?.click()}
              disabled={loading.categories}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {loading.categories ? 'Importing categories…' : 'Upload Categories CSV'}
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Sinhala Names</h2>
              <p className="text-sm text-slate-500">Update සිංහල නම් from CSV</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Required columns</p>
              <p className="text-sm text-slate-600">barcode (or name), name_si</p>
            </div>

            <input
              ref={sinhalaInputRef}
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white file:font-semibold hover:file:bg-violet-700"
              onChange={e => handleImport('sinhala', e.target.files?.[0])}
            />

            <button
              onClick={() => sinhalaInputRef.current?.click()}
              disabled={loading.sinhala}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {loading.sinhala ? 'Updating names…' : 'Upload Sinhala Names CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
