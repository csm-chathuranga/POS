import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetAccountsQuery, useCreateAccountMutation,
  useUpdateAccountMutation, useDeleteAccountMutation,
  useGetJournalQuery, useGetCashbookQuery,
  useGetLedgerQuery, useGetBalanceSheetQuery,
  useGetTrialBalanceQuery, useGetProfitLossQuery,
  useGetExpensesQuery, useCreateJournalEntryMutation,
  useGetOpeningBalanceQuery, useSaveOpeningBalanceMutation,
} from '../../features/accounting/accountingApi';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt     = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const today      = () => new Date().toISOString().slice(0, 10);
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

const TYPES = ['asset', 'liability', 'equity', 'income', 'expense'];
const TYPE_META = {
  asset:     { label: 'Assets',      color: 'text-blue-700',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700'    },
  liability: { label: 'Liabilities', color: 'text-red-700',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700'      },
  equity:    { label: 'Equity',      color: 'text-purple-700', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  income:    { label: 'Income',      color: 'text-green-700',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-700'  },
  expense:   { label: 'Expenses',    color: 'text-orange-700', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
};

const TABS = [
  { key: 'cashbook',  label: 'Cash Book'    },
  { key: 'journal',   label: 'Journal'      },
  { key: 'expenses',  label: 'Expenses'     },
  { key: 'accounts',  label: 'Accounts'     },
  { key: 'ledger',    label: 'Ledger'       },
  { key: 'opening',   label: 'Opening Bal.' },
  { key: 'reports',   label: 'Reports'      },
];

const REPORT_TABS = [
  { key: 'balance-sheet', label: 'Balance Sheet' },
  { key: 'profit-loss',   label: 'Profit & Loss' },
  { key: 'trial-balance', label: 'Trial Balance' },
];

const empty = { code: '', name: '', type: 'asset', parent_id: '' };

function Spin() {
  return (
    <div className="flex justify-center py-16">
      <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PrintBtn({ label = 'Print' }) {
  return (
    <button onClick={() => window.print()}
      className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4h10z"/></svg>
      {label}
    </button>
  );
}

// Shown only on print — fetches shop info for letterhead
const API_BASE = typeof window !== 'undefined' ? (window.__RUNTIME_CONFIG__?.API_URL || 'http://localhost:8000') : 'http://localhost:8000';

function PrintLetterhead({ title, subtitle }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    fetch(`${API_BASE}/api/settings/public`)
      .then(r => r.json()).then(setInfo).catch(() => {});
  }, []);

  return (
    <div className="print-only hidden" style={{ marginBottom: 20 }}>
      {/* Top letterhead */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #1e3a5f', paddingBottom: 12, marginBottom: 14 }}>
        {info?.shop_logo ? (
          <img src={info.shop_logo} alt="logo" style={{ width: 64, height: 64, objectFit: 'contain', marginRight: 16, borderRadius: 6 }} />
        ) : (
          <div style={{ width: 64, height: 64, background: '#1e3a5f', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16, color: '#fff', fontWeight: 800, fontSize: 28 }}>
            {(info?.shop_name || 'A')[0].toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', letterSpacing: '-0.3px' }}>{info?.shop_name || 'Business Name'}</div>
          {info?.address && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{info.address}</div>}
          {info?.phone  && <div style={{ fontSize: 11, color: '#475569' }}>Tel: {info.phone}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{subtitle}</div>}
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Printed: {new Date().toLocaleString('en-LK')}</div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Chart of Accounts ────────────────────────────────────────────────────

function AccountsTab() {
  const { data: accounts = [], isLoading } = useGetAccountsQuery();
  const [createAccount, { isLoading: creating }] = useCreateAccountMutation();
  const [updateAccount, { isLoading: updating }] = useUpdateAccountMutation();
  const [deleteAccount] = useDeleteAccountMutation();
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState(empty);
  const [err, setErr]     = useState('');
  const [delConfirm, setDelConfirm] = useState(null);

  function openCreate() { setForm(empty); setErr(''); setModal('create'); }
  function openEdit(a)  { setForm({ code: a.code, name: a.name, type: a.type, parent_id: a.parent_id ?? '' }); setErr(''); setModal({ edit: a }); }
  function close()      { setModal(null); }

  async function handleSave(e) {
    e.preventDefault(); setErr('');
    try {
      const payload = { ...form, parent_id: form.parent_id || null };
      if (modal?.edit) await updateAccount({ id: modal.edit.id, ...payload }).unwrap();
      else             await createAccount(payload).unwrap();
      close();
    } catch (ex) { setErr(ex?.data?.error || 'Failed'); }
  }

  async function handleDelete(a) {
    try { await deleteAccount(a.id).unwrap(); setDelConfirm(null); }
    catch (ex) { alert(ex?.data?.error || 'Cannot delete'); }
  }

  const isBusy = creating || updating;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add Account
        </button>
      </div>

      {isLoading ? <Spin /> : (
        <div className="space-y-4">
          {TYPES.map(type => {
            const group = accounts.filter(a => a.type === type);
            if (!group.length) return null;
            const meta = TYPE_META[type];
            return (
              <div key={type} className="bg-white border overflow-hidden">
                <div className={`px-4 py-2.5 border-b ${meta.bg}`}>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${meta.color}`}>{meta.label}</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold w-24">Code</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Name</th>
                      <th className="px-4 py-2.5 text-left font-semibold hidden md:table-cell">Parent</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map(a => {
                      const parent = accounts.find(p => p.id === a.parent_id);
                      const isChild = !!a.parent_id;
                      return (
                        <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-blue-50 transition-colors">
                          <td className={`px-4 py-2.5 font-mono text-xs ${isChild ? 'pl-8 text-slate-400' : 'text-slate-500 font-semibold'}`}>{a.code}</td>
                          <td className={`px-4 py-2.5 ${isChild ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>
                            {isChild && <span className="text-slate-300 mr-2">└</span>}{a.name}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs hidden md:table-cell">
                            {parent ? `${parent.code} – ${parent.name}` : ''}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => openEdit(a)} className="px-3 py-1 rounded-md bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors">Edit</button>
                              <button onClick={() => setDelConfirm(a)} className="px-3 py-1 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
          {!accounts.length && <div className="bg-white rounded-2xl border p-8 text-center text-slate-400">No accounts yet.</div>}
        </div>
      )}

      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center space-y-4">
            <p className="font-semibold text-slate-800">Delete "{delConfirm.name}"?</p>
            <p className="text-sm text-slate-500">Accounts with journal entries cannot be deleted.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDelConfirm(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(delConfirm)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal?.edit ? 'Edit Account' : 'Add Account'} onClose={close}>
          <form onSubmit={handleSave} className="space-y-4">
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Code *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required placeholder="e.g. 1000"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Cash"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Parent Account</label>
              <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— None —</option>
                {accounts.filter(a => !modal?.edit || a.id !== modal.edit.id).map(a => (
                  <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-blue-700 flex items-center gap-2">
                {isBusy && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Journal ──────────────────────────────────────────────────────────────

function JournalTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetJournalQuery({ page, limit: 20 }, { refetchOnMountOrArgChange: true });
  const { total = 0, data: entries = [] } = data || {};
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link to="/accounting/journal/create"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New Entry
        </Link>
      </div>
      <div className="bg-white border overflow-hidden">
        {isLoading ? <Spin /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Ref No</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-right font-semibold">Total Dr</th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">By</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {!entries.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No journal entries yet.</td></tr>}
              {entries.map(e => {
                const totalDr = e.lines?.reduce((s, l) => s + parseFloat(l.debit || 0), 0) ?? 0;
                return (
                  <tr key={e.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.ref_no}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{e.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{fmt(totalDr)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{e.user?.name || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/accounting/journal/${e.id}`} className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{total} entries</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium disabled:opacity-40 hover:bg-slate-50">Prev</button>
            <span className="text-xs">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Cash Book ────────────────────────────────────────────────────────────

function CashBookTab() {
  const { data: accounts = [] } = useGetAccountsQuery();
  const cashAccounts = accounts.filter(a => ['1010', '1020', '1030'].includes(a.code));
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo]     = useState(today());
  const { data: rows = [], isLoading, isFetching } = useGetCashbookQuery({ account_id: accountId || undefined, from, to }, { refetchOnMountOrArgChange: true });
  const totalDebit  = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const closingBal  = rows.length ? rows[rows.length - 1].balance : 0;

  const cbSubtitle = `${fmtDate(from)} – ${fmtDate(to)}`;
  return (
    <div className="space-y-4">
      <PrintLetterhead title="Cash Book" subtitle={cbSubtitle} />
      <div className="no-print flex flex-wrap items-center gap-2">
        <select value={accountId} onChange={e => setAccountId(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Cash &amp; Bank</option>
          {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {isFetching && <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
        <PrintBtn label="Print Cash Book" />
      </div>
      {rows.length > 0 && (
        <div className="no-print grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Total In (Dr)</p>
            <p className="text-lg font-bold text-green-700">{fmt(totalDebit)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Total Out (Cr)</p>
            <p className="text-lg font-bold text-red-700">{fmt(totalCredit)}</p>
          </div>
          <div className={`border rounded-xl px-4 py-3 ${closingBal >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${closingBal >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Closing Balance</p>
            <p className={`text-lg font-bold ${closingBal >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(Math.abs(closingBal))}</p>
          </div>
        </div>
      )}
      <div className="bg-white border overflow-hidden">
        {isLoading ? <Spin /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Ref</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Account</th>
                <th className="px-4 py-3 text-right font-semibold text-green-700">In (Dr)</th>
                <th className="px-4 py-3 text-right font-semibold text-red-700">Out (Cr)</th>
                <th className="px-4 py-3 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No cash transactions in this period.</td></tr>}
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.ref_no}</td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{r.description || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs hidden md:table-cell">{r.account?.code} – {r.account?.name}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-green-700">{r.debit > 0 ? fmt(r.debit) : ''}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-red-600">{r.credit > 0 ? fmt(r.credit) : ''}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${r.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(Math.abs(r.balance))}{r.balance < 0 ? ' Cr' : ''}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-sm">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-slate-500">Total</td>
                  <td className="px-4 py-3 text-right text-green-700">{fmt(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmt(totalCredit)}</td>
                  <td className={`px-4 py-3 text-right ${closingBal < 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(Math.abs(closingBal))}{closingBal < 0 ? ' Cr' : ''}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab: General Ledger ───────────────────────────────────────────────────────

function LedgerTab() {
  const { data: accounts = [] } = useGetAccountsQuery();
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo]     = useState(today());

  const { data, isLoading, isFetching } = useGetLedgerQuery(
    { account_id: accountId, from, to },
    { refetchOnMountOrArgChange: true, skip: !accountId }
  );
  const rows    = data?.rows ?? [];
  const account = data?.account;
  const totalDr = rows.reduce((s, r) => s + r.debit, 0);
  const totalCr = rows.reduce((s, r) => s + r.credit, 0);
  const closing = rows.length ? rows[rows.length - 1].balance : 0;

  const ledgerTitle  = account ? `General Ledger – ${account.code} ${account.name}` : 'General Ledger';
  const ledgerSubtitle = `${fmtDate(from)} – ${fmtDate(to)}`;
  return (
    <div className="space-y-4">
      <PrintLetterhead title={ledgerTitle} subtitle={ledgerSubtitle} />
      <div className="no-print flex flex-wrap items-center gap-2">
        <select value={accountId} onChange={e => setAccountId(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]">
          <option value="">— Select account —</option>
          {TYPES.map(type => {
            const group = accounts.filter(a => a.type === type);
            if (!group.length) return null;
            return (
              <optgroup key={type} label={TYPE_META[type].label}>
                {group.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
              </optgroup>
            );
          })}
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {isFetching && <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
        {accountId && <PrintBtn label="Print Ledger" />}
      </div>

      {!accountId ? (
        <div className="bg-white rounded-2xl border p-10 text-center text-slate-400">Select an account to view its ledger.</div>
      ) : (
        <>
          {account && (
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${TYPE_META[account.type]?.badge}`}>{account.type}</span>
              <h2 className="font-bold text-slate-800">{account.code} – {account.name}</h2>
              {rows.length > 0 && (
                <span className={`ml-auto text-sm font-bold ${closing < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                  Closing: {fmt(Math.abs(closing))}{closing < 0 ? ' Cr' : ' Dr'}
                </span>
              )}
            </div>
          )}
          <div className="bg-white border overflow-hidden">
            {isLoading ? <Spin /> : (
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Ref</th>
                    <th className="px-4 py-3 text-left font-semibold">Description</th>
                    <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Note</th>
                    <th className="px-4 py-3 text-right font-semibold">Debit</th>
                    <th className="px-4 py-3 text-right font-semibold">Credit</th>
                    <th className="px-4 py-3 text-right font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {!rows.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No transactions for this account in the selected period.</td></tr>}
                  {rows.map((r, i) => (
                    <tr key={i} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.ref_no}</td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{r.description || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs hidden md:table-cell">{r.note || ''}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{r.debit > 0 ? fmt(r.debit) : ''}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{r.credit > 0 ? fmt(r.credit) : ''}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${r.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(Math.abs(r.balance))}{r.balance < 0 ? ' Cr' : ''}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-sm">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-slate-500">Total</td>
                      <td className="px-4 py-3 text-right text-slate-800">{fmt(totalDr)}</td>
                      <td className="px-4 py-3 text-right text-slate-800">{fmt(totalCr)}</td>
                      <td className={`px-4 py-3 text-right ${closing < 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(Math.abs(closing))}{closing < 0 ? ' Cr' : ''}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab: Expenses ─────────────────────────────────────────────────────────────

const PAY_ACCOUNTS = [
  { code: '1010', label: 'Cash in Hand' },
  { code: '1020', label: 'Bank Account' },
  { code: '1030', label: 'Petty Cash'   },
];

function ExpenseTab() {
  const { data: accounts = [] } = useGetAccountsQuery();
  const expenseAccounts = accounts.filter(a => a.type === 'expense');

  const [createJournalEntry, { isLoading: saving }] = useCreateJournalEntryMutation();
  const [page, setPage] = useState(1);
  const { data, isLoading: listLoading, isFetching } = useGetExpensesQuery({ page, limit: 20 }, { refetchOnMountOrArgChange: true });
  const { total = 0, data: entries = [] } = data || {};
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const [form, setForm] = useState({ date: today(), account_id: '', pay_code: '1010', amount: '', description: '' });
  const [err, setErr]   = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault(); setErr(''); setSuccess('');
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setErr('Enter a valid amount'); return; }
    if (!form.account_id)        { setErr('Select an expense account'); return; }

    const payAcc = accounts.find(a => a.code === form.pay_code);
    if (!payAcc) { setErr('Payment account not found — please seed chart of accounts first'); return; }

    try {
      await createJournalEntry({
        date: form.date,
        description: form.description || null,
        lines: [
          { account_id: parseInt(form.account_id), debit: amount, credit: 0 },
          { account_id: payAcc.id,                 debit: 0, credit: amount },
        ],
      }).unwrap();
      setSuccess('Expense recorded.');
      setForm(f => ({ ...f, account_id: '', amount: '', description: '' }));
      setTimeout(() => setSuccess(''), 3000);
    } catch (ex) {
      setErr(ex?.data?.error || 'Failed to save');
    }
  }

  return (
    <div className="space-y-5">
      {/* Quick entry form */}
      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Record Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {err     && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Expense Account *</label>
              <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Select —</option>
                {expenseAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Pay From *</label>
              <select value={form.pay_code} onChange={e => setForm(f => ({ ...f, pay_code: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PAY_ACCOUNTS.map(p => <option key={p.code} value={p.code}>{p.code} – {p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Amount *</label>
              <input type="number" min="0.01" step="0.01" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Monthly rent, Electricity bill…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-60 transition-colors whitespace-nowrap">
              {saving && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
              Save Expense
            </button>
          </div>
        </form>
      </div>

      {/* Expense list */}
      <div className="bg-white border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
          <h2 className="text-sm font-bold text-slate-700">Recent Expenses</h2>
          {isFetching && <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
        </div>
        {listLoading ? <Spin /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Ref</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-left font-semibold">Expense Account</th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Paid From</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {!entries.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No expense entries yet.</td></tr>
              )}
              {entries.map(e => {
                const expLine  = e.lines?.find(l => l.account?.type === 'expense' && parseFloat(l.debit) > 0);
                const payLine  = e.lines?.find(l => l.account?.type !== 'expense' && parseFloat(l.credit) > 0);
                const amount   = parseFloat(expLine?.debit || 0);
                return (
                  <tr key={e.id} className="odd:bg-white even:bg-slate-50 hover:bg-orange-50 border-b border-slate-100 transition-colors">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(e.date)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{e.ref_no}</td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{e.description || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {expLine?.account ? (
                        <span className="text-xs"><span className="font-mono text-slate-400 mr-1">{expLine.account.code}</span>{expLine.account.name}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs hidden md:table-cell">
                      {payLine?.account ? `${payLine.account.code} – ${payLine.account.name}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-orange-700">{fmt(amount)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link to={`/accounting/journal/${e.id}`} className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{total} entries</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium disabled:opacity-40 hover:bg-slate-50">Prev</button>
            <span className="text-xs">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────

function BalanceSheetReport() {
  const { data, isLoading } = useGetBalanceSheetQuery();
  if (isLoading) return <Spin />;
  if (!data) return null;

  const { assets, liabilities, equity, net_income, total_assets, total_liabilities, total_equity } = data;
  const balanced = Math.abs(total_assets - (total_liabilities + total_equity)) < 0.01;

  function Section({ title, rows, total, color }) {
    return (
      <div className="bg-white border overflow-hidden">
        <div className={`px-4 py-2.5 border-b ${color.bg}`}>
          <h3 className={`text-xs font-bold uppercase tracking-widest ${color.text}`}>{title}</h3>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={`border-b border-slate-50 last:border-0 ${r.parent_id ? '' : 'font-semibold'}`}>
                <td className={`px-4 py-2.5 font-mono text-xs text-slate-400 ${r.parent_id ? 'pl-8' : ''}`}>{r.code}</td>
                <td className={`px-4 py-2.5 ${r.parent_id ? 'text-slate-600' : 'text-slate-800'}`}>
                  {r.parent_id && <span className="text-slate-300 mr-2">└</span>}{r.name}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-700">{r.balance !== 0 ? fmt(r.balance) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className={`border-t-2 ${color.border} font-bold`}>
            <tr>
              <td colSpan={2} className={`px-4 py-3 ${color.text}`}>Total {title}</td>
              <td className={`px-4 py-3 text-right ${color.text}`}>{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PrintLetterhead title="Balance Sheet" />
      <div className="no-print flex items-center justify-between">
        <div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${balanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {balanced ? '✓ Balanced' : `Out of balance by ${fmt(Math.abs(total_assets - total_liabilities - total_equity))}`}
          </span>
        </div>
        <PrintBtn />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <BalanceSheetReport.Section title="Assets" rows={assets} total={total_assets}
          color={{ bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }} />
        <div className="space-y-4">
          <BalanceSheetReport.Section title="Liabilities" rows={liabilities} total={total_liabilities}
            color={{ bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }} />
          <div className="bg-white border overflow-hidden">
            <div className="bg-purple-50 px-4 py-2.5 border-b">
              <h3 className="text-xs font-bold uppercase tracking-widest text-purple-700">Equity</h3>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {equity.map(r => (
                  <tr key={r.id} className={`border-b border-slate-50 last:border-0 ${r.parent_id ? '' : 'font-semibold'}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.code}</td>
                    <td className="px-4 py-2.5 text-slate-800">{r.name}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{r.balance !== 0 ? fmt(r.balance) : ''}</td>
                  </tr>
                ))}
                <tr className="border-b border-slate-100 italic">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">—</td>
                  <td className="px-4 py-2.5 text-slate-600">Net Income (Current Period)</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${net_income < 0 ? 'text-red-600' : 'text-green-700'}`}>{fmt(net_income)}</td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-purple-200 font-bold">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-purple-700">Total Equity</td>
                  <td className="px-4 py-3 text-right text-purple-700">{fmt(total_equity)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className={`rounded-2xl border-2 px-5 py-3 flex justify-between items-center ${balanced ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-300'}`}>
            <span className="font-bold text-slate-700">Total Liabilities + Equity</span>
            <span className="font-bold text-lg text-slate-800">{fmt(total_liabilities + total_equity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
BalanceSheetReport.Section = function({ title, rows, total, color }) {
  return (
    <div className="bg-white border overflow-hidden">
      <div className={`px-4 py-2.5 border-b ${color.bg}`}>
        <h3 className={`text-xs font-bold uppercase tracking-widest ${color.text}`}>{title}</h3>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className={`border-b border-slate-50 last:border-0`}>
              <td className={`px-4 py-2.5 font-mono text-xs text-slate-400 ${r.parent_id ? 'pl-8' : ''}`}>{r.code}</td>
              <td className={`px-4 py-2.5 ${r.parent_id ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>
                {r.parent_id && <span className="text-slate-300 mr-2">└</span>}{r.name}
              </td>
              <td className="px-4 py-2.5 text-right text-slate-700">{r.balance !== 0 ? fmt(r.balance) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className={`border-t-2 ${color.border} font-bold`}>
          <tr>
            <td colSpan={2} className={`px-4 py-3 ${color.text}`}>Total {title}</td>
            <td className={`px-4 py-3 text-right ${color.text}`}>{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

function ProfitLossReport() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo]     = useState(today());
  const { data, isLoading, isFetching } = useGetProfitLossQuery({ from, to });
  const income = data?.income ?? [], expenses = data?.expenses ?? [];
  const totalIncome = data?.total_income ?? 0, totalExpenses = data?.total_expenses ?? 0, net = data?.net ?? 0;

  const subtitle = `${fmtDate(from)} – ${fmtDate(to)}`;
  return (
    <div className="space-y-4">
      <PrintLetterhead title="Profit & Loss Statement" subtitle={subtitle} />
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {isFetching && <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
        </div>
        <PrintBtn />
      </div>
      {isLoading ? <Spin /> : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-5 py-3 border-b bg-green-50"><h2 className="text-sm font-bold text-green-700">Income</h2></div>
            <table className="w-full text-sm"><tbody>
              {!income.length && <tr><td colSpan={2} className="px-5 py-4 text-center text-slate-400 text-xs">No income accounts</td></tr>}
              {income.map(r => <tr key={r.id} className="border-b border-slate-50 last:border-0"><td className="px-5 py-2.5 text-slate-700"><span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}</td><td className="px-5 py-2.5 text-right font-medium text-green-700">{fmt(r.amount)}</td></tr>)}
            </tbody><tfoot className="bg-green-50 border-t border-green-100"><tr><td className="px-5 py-3 text-sm font-bold text-green-800">Total Income</td><td className="px-5 py-3 text-right text-sm font-bold text-green-800">{fmt(totalIncome)}</td></tr></tfoot></table>
          </div>
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-5 py-3 border-b bg-red-50"><h2 className="text-sm font-bold text-red-700">Expenses</h2></div>
            <table className="w-full text-sm"><tbody>
              {!expenses.length && <tr><td colSpan={2} className="px-5 py-4 text-center text-slate-400 text-xs">No expense accounts</td></tr>}
              {expenses.map(r => <tr key={r.id} className="border-b border-slate-50 last:border-0"><td className="px-5 py-2.5 text-slate-700"><span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}</td><td className="px-5 py-2.5 text-right font-medium text-red-700">{fmt(r.amount)}</td></tr>)}
            </tbody><tfoot className="bg-red-50 border-t border-red-100"><tr><td className="px-5 py-3 text-sm font-bold text-red-800">Total Expenses</td><td className="px-5 py-3 text-right text-sm font-bold text-red-800">{fmt(totalExpenses)}</td></tr></tfoot></table>
          </div>
          <div className={`rounded-2xl border-2 px-6 py-4 flex items-center justify-between ${net >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <span className={`font-bold text-base ${net >= 0 ? 'text-green-800' : 'text-red-800'}`}>Net {net >= 0 ? 'Profit' : 'Loss'}</span>
            <span className={`font-bold text-xl ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(Math.abs(net))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TrialBalanceReport() {
  const { data: rows = [], isLoading } = useGetTrialBalanceQuery();
  const totalDr = rows.reduce((s, r) => s + r.total_debit, 0);
  const totalCr = rows.reduce((s, r) => s + r.total_credit, 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.01;

  return (
    <div className="space-y-4">
      <PrintLetterhead title="Trial Balance" />
      <div className="no-print flex justify-end"><PrintBtn /></div>
      {isLoading ? <Spin /> : (
        <div className="bg-white border overflow-hidden">
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
              {!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No accounts or journal entries yet.</td></tr>}
              {TYPES.map(group => {
                const groupRows = rows.filter(r => r.type === group);
                if (!groupRows.length) return null;
                const meta = TYPE_META[group];
                const groupBalance = groupRows.reduce((s, r) => s + r.balance, 0);
                return (
                  <>
                    <tr key={`hdr-${group}`} className={meta.bg.replace('bg-', 'bg-') }><td colSpan={6} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${meta.color}`}>{meta.label}</td></tr>
                    {groupRows.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-blue-50">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.code}</td>
                        <td className="px-4 py-2.5 text-slate-800">{r.name}</td>
                        <td className="px-4 py-2.5"><span className={`text-xs font-semibold capitalize ${meta.badge}`}>{r.type}</span></td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{r.total_debit > 0 ? fmt(r.total_debit) : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{r.total_credit > 0 ? fmt(r.total_credit) : '—'}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${r.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(Math.abs(r.balance))}{r.balance < 0 ? ' Cr' : ''}</td>
                      </tr>
                    ))}
                    <tr key={`sub-${group}`} className="bg-slate-50 border-b-2 border-slate-200">
                      <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-slate-500 text-right">Subtotal</td>
                      <td className={`px-4 py-2 text-right text-sm font-bold ${groupBalance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(Math.abs(groupBalance))}{groupBalance < 0 ? ' Cr' : ''}</td>
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
                <td className="px-4 py-3 text-right"><span className={`text-xs font-bold ${balanced ? 'text-green-600' : 'text-red-600'}`}>{balanced ? '✓ Balanced' : `Off by ${fmt(Math.abs(totalDr - totalCr))}`}</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Opening Balances ──────────────────────────────────────────────────────────

function OpeningBalanceTab() {
  const { data: accounts = [], isLoading: loadingAccounts } = useGetAccountsQuery();
  const { data: obData, isLoading: loadingOB } = useGetOpeningBalanceQuery(undefined, { refetchOnMountOrArgChange: true });
  const [saveOB, { isLoading: saving }] = useSaveOpeningBalanceMutation();

  const currentYear = new Date().getFullYear();
  const [date, setDate] = useState(`${currentYear}-01-01`);
  const [balances, setBalances] = useState({});
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (!obData) return;
    if (obData.entry?.date) setDate(obData.entry.date);
    if (obData.lines?.length) {
      const b = {};
      for (const l of obData.lines) {
        const isDebitNormal = ['asset', 'expense'].includes(l.account?.type);
        b[l.account_id] = isDebitNormal ? (parseFloat(l.debit) || 0) : (parseFloat(l.credit) || 0);
      }
      setBalances(b);
    }
  }, [obData]);

  const debitNormal = type => ['asset', 'expense'].includes(type);

  const lines = accounts
    .filter(a => parseFloat(balances[a.id]) > 0)
    .map(a => {
      const amt = parseFloat(balances[a.id]) || 0;
      const dn  = debitNormal(a.type);
      return { account_id: a.id, debit: dn ? amt : 0, credit: dn ? 0 : amt };
    });

  const totalDr  = lines.reduce((s, l) => s + l.debit, 0);
  const totalCr  = lines.reduce((s, l) => s + l.credit, 0);
  const diff     = Math.abs(totalDr - totalCr);
  const balanced = diff < 0.01;

  async function handleSave() {
    await saveOB({ date, lines });
    setFlash('Saved!');
    setTimeout(() => setFlash(''), 3000);
  }

  if (loadingAccounts || loadingOB) return <Spin />;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Opening Balances</strong> — Enter the starting balance for each account when you begin using the accounting module.
        Assets & expenses enter as debits; liabilities, equity & income as credits. Leave blank to skip an account.
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Opening Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="flex gap-3 ml-auto">
          {[['Total DR', totalDr, 'text-blue-700'], ['Total CR', totalCr, 'text-blue-700'], ['Diff', diff, balanced ? 'text-green-600' : 'text-red-600']].map(([label, val, cls]) => (
            <div key={label} className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-center min-w-[80px]">
              <div className="text-xs text-slate-400">{label}</div>
              <div className={`text-sm font-bold ${cls}`}>{label === 'Diff' && balanced ? '✓ OK' : fmt(val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Accounts per type */}
      {TYPES.map(group => {
        const groupAccounts = accounts.filter(a => a.type === group);
        if (!groupAccounts.length) return null;
        const meta = TYPE_META[group];
        const dn   = debitNormal(group);
        return (
          <div key={group} className="bg-white border overflow-hidden">
            <div className={`px-4 py-2.5 border-b ${meta.bg} flex items-center justify-between`}>
              <span className={`text-xs font-bold uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
              <span className={`text-xs font-medium ${meta.color} opacity-70`}>{dn ? 'Debit (DR)' : 'Credit (CR)'}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {groupAccounts.map(a => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400 w-20">{a.code}</td>
                    <td className="px-4 py-2.5 text-slate-700">{a.name}</td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number" min="0" step="0.01"
                        value={balances[a.id] || ''}
                        onChange={e => setBalances(b => ({ ...b, [a.id]: e.target.value }))}
                        placeholder="0.00"
                        className="w-36 text-right border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        {!balanced && lines.length > 0 ? (
          <p className="text-xs text-amber-600">Entry is not balanced — adjust an equity account by {fmt(diff)} to balance.</p>
        ) : <span />}
        <div className="flex items-center gap-3">
          {flash && <span className="text-xs text-green-600 font-semibold">{flash}</span>}
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Opening Balances'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportsTab() {
  const [report, setReport] = useState('balance-sheet');
  function rCls(key) {
    return `px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${report === key ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`;
  }
  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-1">
        {REPORT_TABS.map(t => <button key={t.key} onClick={() => setReport(t.key)} className={rCls(t.key)}>{t.label}</button>)}
      </div>
      {report === 'balance-sheet' && <BalanceSheetReport />}
      {report === 'profit-loss'   && <ProfitLossReport />}
      {report === 'trial-balance' && <TrialBalanceReport />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ChartOfAccounts() {
  const [tab, setTab] = useState('cashbook');

  function tabCls(key) {
    return `px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
      tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
    }`;
  }

  return (
    <div className="p-3 sm:p-6 space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Accounting</h1>
      <div className="no-print flex items-center gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={tabCls(t.key)}>{t.label}</button>)}
      </div>
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'journal'  && <JournalTab />}
      {tab === 'expenses' && <ExpenseTab />}
      {tab === 'cashbook' && <CashBookTab />}
      {tab === 'ledger'   && <LedgerTab />}
      {tab === 'opening'  && <OpeningBalanceTab />}
      {tab === 'reports'  && <ReportsTab />}
    </div>
  );
}
