import { useState, useMemo, useEffect } from 'react';
import {
  useGetSmsConfigQuery,
  useSaveSmsConfigMutation,
  useTestSmsMutation,
  useGetSmsLogsQuery,
  useGetCustomersWithPhoneQuery,
  useSendBulkSmsMutation,
  useGetAccountStatusQuery,
  useReloadCreditMutation,
} from '../../features/sms/smsApi';

const DEFAULT_TEMPLATE = 'Dear {customer}, your receipt {invoice_no} total Rs. {total} has been processed. Thank you!';

const NAV = [
  {
    key: 'config',
    label: 'Configuration',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'test',
    label: 'Send Test',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    key: 'bulk',
    label: 'Bulk SMS',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'account',
    label: 'Account',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    key: 'logs',
    label: 'SMS Logs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
];

function Badge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
      status === 'sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
    }`}>
      {status}
    </span>
  );
}

// ── Config panel ──────────────────────────────────────────────────────────────
function ConfigPanel() {
  const { data: cfg, isLoading } = useGetSmsConfigQuery();
  const [saveConfig, { isLoading: saving }] = useSaveSmsConfigMutation();

  const [userId,   setUserId]   = useState('');
  const [apiKey,   setApiKey]   = useState('');
  const [senderId, setSenderId] = useState('');
  const [template, setTemplate] = useState('');
  const [loaded,   setLoaded]   = useState(false);
  const [msg,      setMsg]      = useState('');

  if (cfg !== undefined && !loaded) {
    setUserId(cfg?.user_id  || '');
    setSenderId(cfg?.sender_id || '');
    setTemplate(cfg?.receipt_template || DEFAULT_TEMPLATE);
    setLoaded(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setMsg('');
    try {
      await saveConfig({ user_id: userId, api_key: apiKey, sender_id: senderId, receipt_template: template }).unwrap();
      setMsg('success:Saved successfully.');
      setApiKey('');
    } catch (err) {
      setMsg('error:' + (err?.data?.error || 'Save failed.'));
    }
  }

  if (isLoading) return <p className="text-slate-400 text-sm p-6">Loading…</p>;

  return (
    <form onSubmit={handleSave} className="p-6 space-y-5 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">SMSlenz Credentials</h2>
        <p className="text-xs text-slate-400">Find these in your SMSlenz dashboard → API tab.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">User ID</label>
          <input
            type="text" value={userId} onChange={e => setUserId(e.target.value)} required
            placeholder="e.g. 1344"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            API Key{cfg?.user_id && <span className="text-slate-400 font-normal ml-1">(blank = keep existing)</span>}
          </label>
          <input
            type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            required={!cfg?.user_id}
            placeholder="14d351ad-…"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Sender ID</label>
          <input
            type="text" value={senderId} onChange={e => setSenderId(e.target.value)} required
            placeholder="MYSTORE"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Receipt Message Template</label>
        <textarea
          rows={3} value={template} onChange={e => setTemplate(e.target.value)} required
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-slate-400 mt-1 flex flex-wrap gap-1">
          Variables:
          {['{customer}','{invoice_no}','{total}','{date}','{store_name}'].map(v => (
            <code key={v} className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">{v}</code>
          ))}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit" disabled={saving}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
        {msg && (
          <span className={`text-sm ${msg.startsWith('success') ? 'text-green-600' : 'text-red-500'}`}>
            {msg.slice(msg.indexOf(':') + 1)}
          </span>
        )}
      </div>
    </form>
  );
}

// ── Test panel ────────────────────────────────────────────────────────────────
function TestPanel() {
  const [testSms, { isLoading }] = useTestSmsMutation();
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);

  async function handleTest(e) {
    e.preventDefault();
    setResult(null);
    try {
      const r = await testSms({ phone }).unwrap();
      setResult({ ok: true, msg: `Sent! Preview: "${r.message}"` });
    } catch (err) {
      setResult({ ok: false, msg: err?.data?.error || 'Send failed.' });
    }
  }

  return (
    <div className="p-6 max-w-md space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Send Test SMS</h2>
        <p className="text-xs text-slate-400">Uses your saved template with dummy data to verify the integration.</p>
      </div>
      <form onSubmit={handleTest} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Phone Number</label>
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
            placeholder="+94761234567"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit" disabled={isLoading}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {isLoading ? 'Sending…' : 'Send Test SMS'}
        </button>
      </form>
      {result && (
        <div className={`rounded-lg p-4 text-sm ${result.ok
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}

// ── Logs panel ────────────────────────────────────────────────────────────────
function LogsPanel() {
  const [page, setPage] = useState(1);
  const { data: logs, isFetching } = useGetSmsLogsQuery(page);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">SMS Logs</h2>
        <p className="text-xs text-slate-400">All outbound SMS attempts — automatic receipts and manual sends.</p>
      </div>

      {isFetching ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : !logs?.data?.length ? (
        <p className="text-slate-400 text-sm">No SMS logs yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                {logs.data.map(log => (
                  <tr key={log.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.sent_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.phone}</td>
                    <td className="px-4 py-3 text-xs">{log.sale_id ? `#${log.sale_id}` : '—'}</td>
                    <td className="px-4 py-3"><Badge status={log.status} /></td>
                    <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate">{log.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.last_page > 1 && (
            <div className="flex gap-2 justify-end">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                ← Prev
              </button>
              <span className="px-3 py-1 text-xs text-slate-500">{page} / {logs.last_page}</span>
              <button disabled={page >= logs.last_page} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Account panel ─────────────────────────────────────────────────────────────
function AccountPanel() {
  const { data: status, isLoading, refetch, isFetching } = useGetAccountStatusQuery();
  const [reloadCredit, { isLoading: creating }] = useReloadCreditMutation();

  const [amount,  setAmount]  = useState('');
  const [payLink, setPayLink] = useState(null);
  const [paid,    setPaid]    = useState(false);
  const [err,     setErr]     = useState('');

  // Listen for postMessage from the /sms-payment-done page inside the iframe
  useEffect(() => {
    function onMessage(e) {
      if (e.data?.type !== 'sms-payment-done') return;
      setPayLink(null);
      if (e.data.status === 'success') {
        setPaid(true);
        refetch(); // refresh credit balance
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [refetch]);

  async function handleReload(e) {
    e.preventDefault();
    setErr(''); setPayLink(null); setPaid(false);
    const amt = parseInt(amount, 10);
    if (!amt || amt < 1000 || amt > 100000) {
      setErr('Amount must be between Rs. 1,000 and Rs. 100,000');
      return;
    }
    const returnUrl = window.location.origin + (window.location.pathname.includes('#') ? '/#' : '') + '/sms-payment-done';
    try {
      const res = await reloadCredit({ amount: amt, return_url: returnUrl }).unwrap();
      setPayLink(res);
      setAmount('');
    } catch (e) {
      setErr(e?.data?.error || 'Failed to create payment link');
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      {/* Account status card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Account Status</h2>
          <button onClick={refetch} disabled={isFetching}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 flex items-center gap-1">
            {isFetching && <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            Refresh
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !status ? (
          <p className="text-sm text-slate-400">Could not load account status. Check your API credentials.</p>
        ) : (
          <div className="space-y-4">
            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide mb-1">SMS Credit Balance</p>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-300">Rs. {status.sms_credit_balance}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">Allocated Credit</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">Rs. {status.allocated_credit_total}</p>
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Status</p>
                <p className={`text-sm font-bold capitalize ${status.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                  {status.status}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Active Plan</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{status.active_plan || '—'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Sender IDs</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{status.total_sender_ids}</p>
              </div>
            </div>

            {/* Sender ID balances */}
            {status.sender_id_balances?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Sender ID Allocations</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  {status.sender_id_balances.map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-200">{s.sender_id}</span>
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">Rs. {s.allocated_balance}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reload credit */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-4">Reload Credit</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Creates a PayHere payment link. Completes inside this page — no tab switching needed.
        </p>

        {paid && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Payment successful! Balance updated above.</p>
            </div>
            <button onClick={() => setPaid(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
          </div>
        )}

        {payLink && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Payment link ready</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Order: <span className="font-mono">{payLink.order_id}</span>
                {payLink.expires_at && <> · Expires: {new Date(payLink.expires_at).toLocaleString()}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPayLink({ ...payLink, open: true })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pay Now
              </button>
              <button onClick={() => setPayLink(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none px-1">&times;</button>
            </div>
          </div>
        )}

        {/* Full-screen payment modal */}
        {payLink?.open && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/70 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">SMSlenz Credit Reload</p>
                  <p className="text-xs text-slate-400">Order: <span className="font-mono">{payLink.order_id}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={payLink.payment_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in tab
                </a>
                <button onClick={() => setPayLink(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-lg font-bold transition-colors">
                  &times;
                </button>
              </div>
            </div>
            <iframe
              src={payLink.payment_url}
              title="SMSlenz Payment"
              className="flex-1 w-full border-0"
              allow="payment"
            />
          </div>
        )}

        {err && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">{err}</div>
        )}

        <form onSubmit={handleReload} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Amount (Rs.)
            </label>
            <input
              type="number" min="1000" max="100000" step="100"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Min Rs. 1,000 · Max Rs. 100,000</p>
          </div>
          <button type="submit" disabled={creating || !amount}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors">
            {creating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            )}
            {creating ? 'Creating…' : 'Get Payment Link'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Bulk SMS panel ────────────────────────────────────────────────────────────
function BulkPanel() {
  const { data: customers = [], isLoading } = useGetCustomersWithPhoneQuery();
  const [sendBulk, { isLoading: sending }] = useSendBulkSmsMutation();

  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(new Set());
  const [message,  setMessage]  = useState('');
  const [result,   setResult]   = useState(null);
  const [err,      setErr]      = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, search]);

  const allSelected  = filtered.length > 0 && filtered.every(c => selected.has(c.id));
  const someSelected = filtered.some(c => selected.has(c.id));

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(c => next.add(c.id));
        return next;
      });
    }
  }

  async function handleSend() {
    setErr(''); setResult(null);
    const contacts = customers.filter(c => selected.has(c.id)).map(c => c.phone);
    if (contacts.length === 0) { setErr('Select at least one customer.'); return; }
    if (!message.trim()) { setErr('Message is required.'); return; }
    try {
      const res = await sendBulk({ contacts, message }).unwrap();
      setResult(res);
      setSelected(new Set());
      setMessage('');
    } catch (e) {
      setErr(e?.data?.error || 'Send failed.');
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-green-800 dark:text-green-300 space-y-0.5">
            <p className="font-semibold">Bulk SMS sent successfully!</p>
            <p>Campaign ID: <span className="font-mono">{result.campaign_id}</span></p>
            <p>Sent to: <span className="font-semibold">{result.sent_to}</span> recipients</p>
            {result.credit_balance && <p>Credit balance: {result.credit_balance}</p>}
          </div>
        </div>
      )}
      {err && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">{err}</div>
      )}

      {/* Message composer */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Message</h2>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          maxLength={1500}
          placeholder="Type your message… (max 1500 characters)"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-slate-400 text-right">{message.length} / 1500</p>
      </div>

      {/* Customer picker */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            Recipients
            {selected.size > 0 && (
              <span className="ml-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                {selected.size} selected
              </span>
            )}
          </h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>

        {isLoading ? (
          <p className="text-slate-400 text-sm text-center py-8">Loading customers…</p>
        ) : customers.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No customers with phone numbers found.</p>
        ) : (
          <div className="overflow-y-auto max-h-64">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-2">
                    <input type="checkbox" checked={allSelected} ref={el => el && (el.indeterminate = someSelected && !allSelected)}
                      onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Name</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => toggleOne(c.id)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="rounded" />
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-800 dark:text-slate-100">{c.name}</td>
                    <td className="px-2 py-2 text-slate-500 dark:text-slate-400 font-mono text-xs">{c.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
          {customers.length} customers with phone numbers
        </div>
      </div>

      {/* Send button */}
      <div className="flex justify-end">
        <button
          disabled={sending || selected.size === 0 || !message.trim()}
          onClick={handleSend}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors">
          {sending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
          {sending ? 'Sending…' : `Send to ${selected.size || 0} recipient${selected.size !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SmsCenter() {
  const [active, setActive] = useState('config');

  return (
    <div className="flex h-full min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Inner sidebar */}
      <aside className="w-52 shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col pt-6">
        <div className="px-5 mb-6">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-bold text-slate-800 dark:text-white text-sm">SMS Center</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {NAV.map(item => (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full ${
                active === item.key
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              <span className={active === item.key ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            {NAV.find(n => n.key === active)?.label}
          </h1>
        </div>

        {active === 'config'  && <ConfigPanel />}
        {active === 'test'    && <TestPanel />}
        {active === 'bulk'    && <BulkPanel />}
        {active === 'account' && <AccountPanel />}
        {active === 'logs'    && <LogsPanel />}
      </main>
    </div>
  );
}
