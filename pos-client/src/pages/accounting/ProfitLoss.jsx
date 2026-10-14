import { useState } from 'react';
import { useGetProfitLossQuery } from '../../features/accounting/accountingApi';

const fmt      = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today      = () => new Date().toISOString().slice(0, 10);

export default function ProfitLoss() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo]     = useState(today());

  const { data, isLoading, isFetching } = useGetProfitLossQuery({ from, to });

  const income        = data?.income        ?? [];
  const expenses      = data?.expenses      ?? [];
  const totalIncome   = data?.total_income  ?? 0;
  const totalExpenses = data?.total_expenses ?? 0;
  const net           = data?.net           ?? 0;

  return (
    <div className="p-3 sm:p-6 max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">Profit &amp; Loss</h1>
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4h10z"/></svg>
          Print
        </button>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {isFetching && (
          <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {/* Income */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-green-50">
              <h2 className="text-sm font-bold text-green-700">Income</h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {income.length === 0 && (
                  <tr><td colSpan={2} className="px-5 py-4 text-center text-slate-400 text-xs">No income accounts</td></tr>
                )}
                {income.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-2.5 text-slate-700">
                      <span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-green-700">{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-green-50 border-t border-green-100">
                <tr>
                  <td className="px-5 py-3 text-sm font-bold text-green-800">Total Income</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-green-800">{fmt(totalIncome)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-red-50">
              <h2 className="text-sm font-bold text-red-700">Expenses</h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {expenses.length === 0 && (
                  <tr><td colSpan={2} className="px-5 py-4 text-center text-slate-400 text-xs">No expense accounts</td></tr>
                )}
                {expenses.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-2.5 text-slate-700">
                      <span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-red-700">{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-red-50 border-t border-red-100">
                <tr>
                  <td className="px-5 py-3 text-sm font-bold text-red-800">Total Expenses</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-red-800">{fmt(totalExpenses)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Net */}
          <div className={`rounded-2xl border-2 px-6 py-4 flex items-center justify-between
            ${net >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <span className={`font-bold text-base ${net >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              Net {net >= 0 ? 'Profit' : 'Loss'}
            </span>
            <span className={`font-bold text-xl ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {fmt(Math.abs(net))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
