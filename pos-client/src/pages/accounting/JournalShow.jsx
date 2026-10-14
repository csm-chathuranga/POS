import { useNavigate, useParams } from 'react-router-dom';
import { useGetJournalEntryQuery } from '../../features/accounting/accountingApi';

const fmt     = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function JournalShow() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { data: entry, isLoading } = useGetJournalEntryQuery(id);

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (!entry)    return <div className="p-8 text-center text-slate-400">Entry not found.</div>;

  const totalDr = entry.lines?.reduce((s, l) => s + parseFloat(l.debit || 0), 0) ?? 0;
  const totalCr = entry.lines?.reduce((s, l) => s + parseFloat(l.credit || 0), 0) ?? 0;

  return (
    <div className="p-3 sm:p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/accounting/journal')}
          className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{entry.ref_no}</h1>
          <p className="text-sm text-slate-500">{fmtDate(entry.date)}{entry.user && ` · Posted by ${entry.user.name}`}</p>
        </div>
      </div>

      {entry.description && (
        <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 text-sm text-slate-600">
          {entry.description}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Account</th>
              <th className="px-4 py-3 text-left font-semibold">Note</th>
              <th className="px-4 py-3 text-right font-semibold">Debit</th>
              <th className="px-4 py-3 text-right font-semibold">Credit</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines?.map(l => (
              <tr key={l.id} className="odd:bg-white even:bg-slate-50 border-b border-slate-100">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-slate-400 mr-2">{l.account?.code}</span>
                  <span className="font-medium text-slate-800">{l.account?.name}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{l.note || '—'}</td>
                <td className="px-4 py-3 text-right text-slate-800">{parseFloat(l.debit) > 0 ? fmt(l.debit) : ''}</td>
                <td className="px-4 py-3 text-right text-slate-800">{parseFloat(l.credit) > 0 ? fmt(l.credit) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-sm">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-slate-500">Total</td>
              <td className="px-4 py-3 text-right text-slate-800">{fmt(totalDr)}</td>
              <td className="px-4 py-3 text-right text-slate-800">{fmt(totalCr)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
