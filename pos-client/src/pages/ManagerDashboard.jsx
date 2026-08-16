import { Link } from 'react-router-dom';
import { api } from '../app/baseApi';

const mgApi = api.injectEndpoints({
  endpoints: b => ({
    getManagerDashboard: b.query({ query: () => '/dashboard/manager', providesTags: ['Dashboard'] }),
  }),
  overrideExisting: false,
});

const fmtRs = n => 'Rs. ' + parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const fmtDate = s => new Date(s).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });

function StatCard({ label, value, sub, color = 'text-blue-600', bg = 'bg-blue-50', icon }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-semibold">{label}</p>
        <p className={`text-xl font-extrabold mt-0.5 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const { data, isLoading } = mgApi.useGetManagerDashboardQuery(undefined, { pollingInterval: 60000 });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
  );

  const d = data || {};

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Manager Dashboard</h1>
        <p className="text-xs text-slate-400 mt-0.5">Invoice & credit overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Invoices"
          value={d.todayInvoices ?? 0}
          sub={fmtRs(d.todayTotal)}
          color="text-blue-600" bg="bg-blue-50"
          icon={<svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
        />
        <StatCard
          label="This Month"
          value={d.monthInvoices ?? 0}
          sub={fmtRs(d.monthTotal)}
          color="text-green-600" bg="bg-green-50"
          icon={<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
        />
        <StatCard
          label="Credit Invoices"
          value={d.creditCount ?? 0}
          sub="Unpaid"
          color="text-red-600" bg="bg-red-50"
          icon={<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 10h20M6 15h4"/></svg>}
        />
        <StatCard
          label="Credit Outstanding"
          value={fmtRs(d.creditOutstanding)}
          sub="Total unpaid amount"
          color="text-orange-600" bg="bg-orange-50"
          icon={<svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
      </div>

      {/* Outstanding credit invoices */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Outstanding Credit Invoices</h2>
            <p className="text-xs text-slate-400 mt-0.5">Invoices with unpaid credit balance</p>
          </div>
          <Link to="/invoices" className="text-xs text-blue-600 font-semibold hover:text-blue-800">View All →</Link>
        </div>

        {!d.creditInvoices?.length ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No outstanding credit invoices</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                  <th className="px-4 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d.creditInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-600 font-semibold text-xs">{inv.invoice_no}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{inv.customer_name || <span className="text-slate-400">—</span>}</p>
                      {inv.customer_phone && <p className="text-xs text-slate-400">{inv.customer_phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(inv.created_at)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmtRs(inv.total)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{fmtRs(inv.balance)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/invoices/${inv.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Recent Invoices</h2>
        </div>
        {!d.recentInvoices?.length ? (
          <div className="px-5 py-8 text-center text-slate-400 text-sm">No invoices yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-center font-semibold">Method</th>
                  <th className="px-4 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d.recentInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-600 font-semibold text-xs">{inv.invoice_no}</td>
                    <td className="px-4 py-3 text-slate-700">{inv.customer_name || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(inv.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtRs(inv.total)}</td>
                    <td className="px-4 py-3 text-center">
                      {inv.method && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize
                          ${inv.method === 'cash' ? 'bg-green-100 text-green-700' :
                            inv.method === 'card' ? 'bg-blue-100 text-blue-700' :
                            inv.method === 'credit' ? 'bg-red-100 text-red-600' :
                            'bg-slate-100 text-slate-600'}`}>
                          {inv.method}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/invoices/${inv.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
