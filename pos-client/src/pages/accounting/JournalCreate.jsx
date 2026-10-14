import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAccountsQuery, useCreateJournalEntryMutation } from '../../features/accounting/accountingApi';

const today = () => new Date().toISOString().slice(0, 10);
const toNum = v => parseFloat(v) || 0;

const emptyLine = () => ({ account_id: '', debit: '', credit: '', note: '' });

export default function JournalCreate() {
  const navigate = useNavigate();
  const { data: accounts = [] } = useGetAccountsQuery();
  const [createEntry, { isLoading }] = useCreateJournalEntryMutation();

  const [date, setDate]             = useState(today());
  const [description, setDesc]      = useState('');
  const [lines, setLines]           = useState([emptyLine(), emptyLine()]);
  const [err, setErr]               = useState('');

  const totalDebit  = lines.reduce((s, l) => s + toNum(l.debit),  0);
  const totalCredit = lines.reduce((s, l) => s + toNum(l.credit), 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  function setLine(i, field, value) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  function addLine()    { setLines(ls => [...ls, emptyLine()]); }
  function removeLine(i){ if (lines.length > 2) setLines(ls => ls.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    const payload = {
      date,
      description: description.trim() || null,
      lines: lines
        .filter(l => l.account_id)
        .map(l => ({ account_id: parseInt(l.account_id), debit: toNum(l.debit), credit: toNum(l.credit), note: l.note || null })),
    };
    try {
      const entry = await createEntry(payload).unwrap();
      navigate(`/accounting/journal/${entry.id}`);
    } catch (ex) { setErr(ex?.data?.error || 'Failed to save entry'); }
  }

  return (
    <div className="p-3 sm:p-6 max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/accounting/journal')}
          className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">New Journal Entry</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <input value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Optional memo"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Entry Lines</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Account</th>
                  <th className="px-4 py-2.5 text-right font-semibold w-36">Debit</th>
                  <th className="px-4 py-2.5 text-right font-semibold w-36">Credit</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Note</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-4 py-2">
                      <select value={l.account_id} onChange={e => setLine(i, 'account_id', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">— Select account —</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" step="0.01" value={l.debit}
                        onChange={e => { setLine(i, 'debit', e.target.value); if (e.target.value) setLine(i, 'credit', ''); }}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" step="0.01" value={l.credit}
                        onChange={e => { setLine(i, 'credit', e.target.value); if (e.target.value) setLine(i, 'debit', ''); }}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={l.note} onChange={e => setLine(i, 'note', e.target.value)}
                        placeholder="Optional"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-2">
                      <button type="button" onClick={() => removeLine(i)} disabled={lines.length <= 2}
                        className="text-slate-300 hover:text-red-500 disabled:opacity-0 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-2.5">
                    <button type="button" onClick={addLine}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                      Add line
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                    {totalDebit.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                    {totalCredit.toFixed(2)}
                  </td>
                  <td colSpan={2} className="px-4 py-2.5">
                    {totalDebit > 0 && (
                      <span className={`text-xs font-semibold ${balanced ? 'text-green-600' : 'text-red-500'}`}>
                        {balanced ? '✓ Balanced' : `Off by ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/accounting/journal')}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={!balanced || isLoading}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 flex items-center gap-2">
            {isLoading && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
            Post Entry
          </button>
        </div>
      </form>
    </div>
  );
}
