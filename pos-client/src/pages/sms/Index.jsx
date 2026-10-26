import { useState } from 'react';
import {
  useGetSmsConfigQuery,
  useSaveSmsConfigMutation,
  useTestSmsMutation,
  useGetSmsLogsQuery,
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

        {active === 'config' && <ConfigPanel />}
        {active === 'test'   && <TestPanel />}
        {active === 'logs'   && <LogsPanel />}
      </main>
    </div>
  );
}
