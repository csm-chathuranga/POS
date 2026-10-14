import { useGetTrialBalanceQuery } from '../../features/accounting/accountingApi';

const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

const TYPE_COLORS = {
  asset:     'text-blue-600',
  liability: 'text-red-600',
  equity:    'text-purple-600',
  income:    'text-green-600',
  expense:   'text-orange-600',
};

const GROUPS = ['asset', 'liability', 'equity', 'income', 'expense'];

export default function TrialBalance() {
  const { data: rows = [], isLoading } = useGetTrialBalanceQuery();

  const totalDr = rows.reduce((s, r) => s + r.total_debit, 0);
  const totalCr = rows.reduce((s, r) => s + r.total_credit, 0);

  return (
    <div className="p-3 sm:p-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Trial Balance</h1>
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4h10z"/></svg>
          Print
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Account</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-right font-semibold">Debit</th>
                <th className="px-4 py-3 text-right font-semibold">Credit</th>
                <th className="px-4 py-3 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No accounts or journal entries yet.</td></tr>
              )}
              {GROUPS.map(group => {
                const groupRows = rows.filter(r => r.type === group);
                if (groupRows.length === 0) return null;
                const groupBalance = groupRows.reduce((s, r) => s + r.balance, 0);
                return (
                  <>
                    <tr key={`hdr-${group}`} className="bg-slate-50">
                      <td colSpan={6} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${TYPE_COLORS[group]}`}>
                        {group.charAt(0).toUpperCase() + group.slice(1)}s
                      </td>
                    </tr>
                    {groupRows.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.code}</td>
                        <td className="px-4 py-2.5 text-slate-800">{r.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold capitalize ${TYPE_COLORS[r.type]}`}>{r.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{r.total_debit > 0 ? fmt(r.total_debit) : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{r.total_credit > 0 ? fmt(r.total_credit) : '—'}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${r.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                          {fmt(Math.abs(r.balance))}{r.balance < 0 ? ' Cr' : ''}
                        </td>
                      </tr>
                    ))}
                    <tr key={`sub-${group}`} className="bg-slate-50 border-b-2 border-slate-200">
                      <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-slate-500 text-right">
                        Subtotal {group}
                      </td>
                      <td className={`px-4 py-2 text-right text-sm font-bold ${groupBalance < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {fmt(Math.abs(groupBalance))}{groupBalance < 0 ? ' Cr' : ''}
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-slate-700">Total</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(totalDr)}</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(totalCr)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-xs font-bold ${Math.abs(totalDr - totalCr) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(totalDr - totalCr) < 0.01 ? '✓ Balanced' : `Off by ${fmt(Math.abs(totalDr - totalCr))}`}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
