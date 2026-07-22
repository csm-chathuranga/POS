import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGetSalesQuery, useDeleteSaleMutation } from '../../features/sales/salesApi';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';
import { useLocale } from '../../contexts/LocaleContext';

export default function SalesIndex() {
  const role = useSelector(selectRole);
  const canDelete = role === 'admin';
  const navigate = useNavigate();

  // Barcode scanner: fast keystrokes → navigate to POS with barcode pre-loaded
  const barcodeRef  = useRef('');
  const barcodeTimer = useRef(null);
  const lastKey      = useRef(0);
  useEffect(() => {
    const onKey = e => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'Enter') {
        const bc = barcodeRef.current.trim();
        barcodeRef.current = '';
        clearTimeout(barcodeTimer.current);
        if (bc.length >= 3) navigate('/sales/create', { state: { barcode: bc } });
        return;
      }
      if (e.key.length !== 1) return;
      const now = Date.now();
      const gap = now - lastKey.current;
      lastKey.current = now;
      if (gap > 500) barcodeRef.current = '';
      barcodeRef.current += e.key;
      clearTimeout(barcodeTimer.current);
      barcodeTimer.current = setTimeout(() => { barcodeRef.current = ''; }, 500);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(barcodeTimer.current); };
  }, [navigate]);
  const { t } = useLocale();

  const [search, setSearch] = useState('');
  const [date, setDate]     = useState('');
  const [page, setPage]     = useState(1);
  const [applied, setApplied] = useState({});

  const { data, isLoading } = useGetSalesQuery({ ...applied, page });
  const [deleteSale] = useDeleteSaleMutation();

  function handleSearch(e) {
    e.preventDefault();
    setApplied({ search, date });
    setPage(1);
  }

  async function handleDelete(id, inv) {
    if (!window.confirm(`Delete sale ${inv}?`)) return;
    await deleteSale(id);
  }

  const fmt = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const fmtDate = s => new Date(s).toLocaleDateString('en-LK');
  const fmtTime = s => new Date(s).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });

  const statusBadge = status => {
    const cls = { completed: 'bg-green-100 text-green-700', held: 'bg-yellow-100 text-yellow-700', returned: 'bg-red-100 text-red-700' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${cls[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
  };

  const payMethod = payments => {
    if (!payments?.length) return '—';
    const methods = [...new Set(payments.map(p => p.method))].join(', ');
    return <span className="capitalize">{methods}</span>;
  };

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('page.sales')}</h1>
        <Link to="/sales/create" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          + {t('btn.new_sale')}
        </Link>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('th.invoice')}</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="INV-0001"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('th.date')}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors">
          {t('btn.search')}
        </button>
        {Object.values(applied).some(Boolean) && (
          <button type="button" onClick={() => { setApplied({}); setSearch(''); setDate(''); setPage(1); }}
            className="px-4 py-2 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            {t('btn.clear')}
          </button>
        )}
      </form>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('lbl.loading')}</div>}
        {!isLoading && !(data?.data?.length) && (
          <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('lbl.no_results')}</div>
        )}
        {(data?.data || []).map(s => (
          <Link key={s.id} to={`/sales/${s.id}`}
            className="block bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.99]">
            {/* Top row: invoice + status */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-blue-600 font-bold text-sm">{s.invoice_no}</span>
              {statusBadge(s.status)}
            </div>
            {/* Middle: date + total */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-500">{fmtDate(s.created_at)} · {fmtTime(s.created_at)}</p>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">{payMethod(s.payments)}</p>
              </div>
              <span className="text-base font-extrabold text-slate-800">{fmt(s.total)}</span>
            </div>
            {/* Bottom: customer + cashier + delete */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <div className="flex gap-3 text-xs text-slate-500">
                <span>{s.customer?.name || '—'}</span>
                <span className="text-slate-300">|</span>
                <span>{s.user?.name || '—'}</span>
              </div>
              {canDelete && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); handleDelete(s.id, s.invoice_no); }}
                  className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-0.5 hover:bg-red-50 rounded transition-colors">
                  {t('btn.delete')}
                </button>
              )}
            </div>
          </Link>
        ))}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-2 py-2 text-sm text-slate-500">
            <span>{data.total} {t('nav.sales')}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'‹'}</button>
              <span className="px-2 py-1">{page} / {data.last_page}</span>
              <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'›'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400 text-sm">{t('lbl.loading')}</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t('th.invoice')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('lbl.date_time')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('lbl.customer')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('lbl.cashier')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.total')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('th.method')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('th.status')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.data || []).map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-blue-600 font-semibold">{s.invoice_no}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <p>{fmtDate(s.created_at)}</p>
                    <p className="text-xs text-slate-400">{fmtTime(s.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.customer?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.user?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(s.total)}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{payMethod(s.payments)}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(s.status)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                    <Link to={`/sales/${s.id}`} className="text-blue-600 hover:text-blue-800 font-medium">{t('btn.view')}</Link>
                    {canDelete && (
                      <button onClick={() => handleDelete(s.id, s.invoice_no)} className="text-red-500 hover:text-red-700 font-medium">{t('btn.delete')}</button>
                    )}
                  </td>
                </tr>
              ))}
              {!(data?.data?.length) && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t('lbl.no_results')}</td></tr>
              )}
            </tbody>
          </table></div>
        )}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{data.total} {t('nav.sales')}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'‹'}</button>
              <span className="px-2 py-1">{page} / {data.last_page}</span>
              <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">{'›'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
