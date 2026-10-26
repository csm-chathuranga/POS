import { useState, useEffect, useMemo } from 'react';
import {
  useGetEmployeesQuery, useCreateEmployeeMutation, useUpdateEmployeeMutation,
  useDeleteEmployeeMutation, useGetSalaryHistoryQuery, usePaySalaryMutation,
  useGetAttendanceSettingsQuery, useUpdateAttendanceSettingsMutation,
  useSyncAttendanceMutation, useGetAttendanceRecordsQuery,
  useGetAttendanceSummaryQuery,
  useGetAdvancesQuery, useAddAdvanceMutation, useDeleteAdvanceMutation,
} from '../../features/employees/employeesApi';

const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

// ── Shared helpers ────────────────────────────────────────────────────────────

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

// ── Salary history ────────────────────────────────────────────────────────────

function SalaryHistoryModal({ employee, onClose }) {
  const { data, isLoading } = useGetSalaryHistoryQuery(employee.id, { refetchOnMountOrArgChange: true });
  const payments = data?.payments || [];
  const total = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{employee.name}</h2>
            <p className="text-xs text-slate-500">{employee.position} &middot; Salary History</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">&times;</button>
        </div>
        <div className="p-6">
          {isLoading ? <Spin /> : !payments.length ? (
            <p className="text-sm text-slate-400 text-center py-8">No salary payments recorded yet.</p>
          ) : (
            <div className="border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200" style={{ background: '#1e3a5f' }}>
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Period</th>
                    <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Details</th>
                    <th className="px-4 py-2.5 text-right font-semibold" style={{ color: '#fff' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{p.period}</p>
                        <p className="font-mono text-xs text-slate-400 mt-0.5">{p.ref_no}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-600 text-xs">{p.note || <span className="text-slate-300">—</span>}</p>
                        <p className="text-slate-400 text-xs mt-0.5">by {p.user?.name || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-slate-800">Rs. {fmt(p.amount)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t border-slate-200">
                    <td colSpan={2} className="px-4 py-2.5 font-bold text-slate-700 text-xs uppercase">Total Paid</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">Rs. {fmt(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cash Advance modals ───────────────────────────────────────────────────────

function AdvanceModal({ employee, onClose }) {
  const [addAdvance, { isLoading: saving }] = useAddAdvanceMutation();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ amount: '', given_date: today, note: '' });
  const [err,  setErr]  = useState('');
  const [ok,   setOk]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    try {
      await addAdvance({ id: employee.id, ...form }).unwrap();
      setOk('Advance recorded!');
      setForm({ amount: '', given_date: today, note: '' });
      setTimeout(() => { setOk(''); onClose(); }, 1200);
    } catch (ex) {
      setErr(ex?.data?.error || 'Failed to save');
    }
  }

  return (
    <Modal title={`Cash Advance — ${employee.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 mt-1">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount (Rs.)</label>
            <input type="number" min="1" step="0.01" value={form.amount} required
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="0.00" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date</label>
            <input type="date" value={form.given_date} required
              onChange={e => setForm(f => ({ ...f, given_date: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Note (optional)</label>
          <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="e.g. Emergency medical" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
        {ok  && <p className="text-xs text-green-600 font-semibold">{ok}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50">
            {saving ? 'Saving…' : 'Record Advance'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AdvanceHistoryModal({ employee, onClose }) {
  const { data, isLoading } = useGetAdvancesQuery(employee.id, { refetchOnMountOrArgChange: true });
  const [deleteAdvance]     = useDeleteAdvanceMutation();
  const advances    = data?.advances    || [];
  const outstanding = data?.outstanding || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div style={{ background: '#b45309' }} className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-200 text-xs font-semibold uppercase tracking-widest mb-1">Cash Advances</p>
              <h2 className="text-white text-xl font-bold">{employee.name}</h2>
            </div>
            <button onClick={onClose} className="text-orange-200 hover:text-white text-2xl leading-none">&times;</button>
          </div>
          <div className="mt-4 bg-white/15 rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-orange-100 text-sm font-medium">Outstanding Balance</span>
            <span className="text-white text-2xl font-bold">Rs. {fmt(outstanding)}</span>
          </div>
        </div>

        <div className="p-6 max-h-80 overflow-y-auto">
          {isLoading ? <Spin /> : !advances.length ? (
            <p className="text-sm text-slate-400 text-center py-8">No advances recorded.</p>
          ) : (
            <div className="space-y-2">
              {advances.map(a => (
                <div key={a.id} className={`flex items-center justify-between p-3 rounded-xl border ${a.deducted ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">Rs. {fmt(a.amount)}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.deducted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {a.deducted ? 'Settled' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(a.given_date).toLocaleDateString('en-LK')}
                      {a.note && <> &middot; {a.note}</>}
                      {a.givenBy && <> &middot; by {a.givenBy.name}</>}
                    </p>
                  </div>
                  {!a.deducted && (
                    <button onClick={async () => { if (confirm('Delete this advance?')) await deleteAdvance({ employeeId: employee.id, advId: a.id }); }}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Salary payment ────────────────────────────────────────────────────────────

function SalaryModal({ employee, onClose }) {
  const { data, isLoading }    = useGetSalaryHistoryQuery(employee.id, { refetchOnMountOrArgChange: true });
  const { data: advData }      = useGetAdvancesQuery(employee.id, { refetchOnMountOrArgChange: true });
  const [paySalary, { isLoading: paying }] = usePaySalaryMutation();
  const currentMonth           = new Date().toISOString().slice(0, 7);
  const [form, setForm]        = useState({ period: currentMonth, amount: '', note: '' });
  const [deductIds, setDeductIds] = useState([]);
  const [err, setErr]          = useState('');
  const [ok,  setOk]           = useState('');

  const method = employee.salary_calculation || 'manual';
  const skipSummary = method === 'manual';

  const { data: summaryData } = useGetAttendanceSummaryQuery(
    { month: form.period },
    { skip: skipSummary, refetchOnMountOrArgChange: true }
  );

  const attSummary = summaryData?.find(s => s.employee_id === employee.id) || null;

  const suggested = useMemo(() => {
    if (skipSummary || !attSummary) return null;
    const basic        = parseFloat(employee.basic_salary) || 0;
    const { present_days, working_days, absent_days } = attSummary;
    if (!working_days) return null;
    const dailyRate = basic / working_days;
    if (method === 'daily_rate') return { amount: +(dailyRate * present_days).toFixed(2), present_days, working_days, dailyRate, absent_days };
    if (method === 'deduction')  return { amount: +(basic - dailyRate * absent_days).toFixed(2), present_days, working_days, dailyRate, absent_days };
    return null;
  }, [attSummary, method, employee.basic_salary, skipSummary]);

  useEffect(() => {
    if (suggested) setForm(f => ({ ...f, amount: String(suggested.amount) }));
    else if (method === 'manual') setForm(f => ({ ...f, amount: f.amount || String(employee.basic_salary || '') }));
  }, [suggested, method, employee.basic_salary]);

  const pendingAdvances = advData?.advances?.filter(a => !a.deducted) || [];
  const totalDeduction  = pendingAdvances.filter(a => deductIds.includes(a.id)).reduce((s, a) => s + parseFloat(a.amount), 0);
  const netAmount       = Math.max(0, parseFloat(form.amount || 0) - totalDeduction);

  function toggleDeduct(id) {
    setDeductIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  async function handlePay(e) {
    e.preventDefault();
    setErr('');
    try {
      await paySalary({ id: employee.id, ...form, amount: netAmount || parseFloat(form.amount), deduct_advance_ids: deductIds }).unwrap();
      setOk('Salary paid and posted to journal!');
      setForm(f => ({ ...f, note: '' }));
      setDeductIds([]);
      setTimeout(() => setOk(''), 3000);
    } catch (ex) {
      setErr(ex?.data?.error || 'Failed to record payment');
    }
  }

  const payments = data?.payments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{employee.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{employee.position || 'No position'} &middot; Basic: <span className="font-semibold text-slate-600">Rs. {fmt(employee.basic_salary)}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        {/* 2-column body */}
        <div className="flex flex-1 min-h-0">

          {/* LEFT — Record Salary Payment */}
          <div className="w-2/5 border-r border-slate-100 p-6 overflow-y-auto">
            <form onSubmit={handlePay} className="space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Record Salary Payment</p>

              {/* Attendance breakdown */}
              {!skipSummary && (
                <div className={`rounded-lg p-3 border text-xs ${suggested ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                  {suggested ? (
                    <>
                      <p className="font-bold text-blue-700 mb-2 uppercase tracking-wide text-xs">
                        {method === 'daily_rate' ? 'Daily Rate' : 'Deduction'}
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 text-slate-700 mb-2">
                        <div className="text-center bg-white rounded p-1.5 border border-blue-100">
                          <p className="text-base font-bold text-green-600">{suggested.present_days}</p>
                          <p className="text-slate-500 text-xs">Present</p>
                        </div>
                        <div className="text-center bg-white rounded p-1.5 border border-blue-100">
                          <p className="text-base font-bold text-red-500">{suggested.absent_days}</p>
                          <p className="text-slate-500 text-xs">Absent</p>
                        </div>
                        <div className="text-center bg-white rounded p-1.5 border border-blue-100">
                          <p className="text-base font-bold text-slate-700">{suggested.working_days}</p>
                          <p className="text-slate-500 text-xs">Working</p>
                        </div>
                      </div>
                      <p className="text-slate-600 font-mono bg-white rounded p-1.5 border border-blue-100 text-xs leading-relaxed">
                        {method === 'daily_rate'
                          ? `${suggested.working_days} days ÷ basic × ${suggested.present_days} = `
                          : `basic − (${suggested.absent_days} absent) = `}
                        <span className="font-bold text-blue-700">Rs. {fmt(suggested.amount)}</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-700 font-medium">No attendance for {form.period}.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Period</label>
                <input type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Gross Amount (Rs.) {suggested && <span className="text-blue-500 font-normal">— auto</span>}
                </label>
                <input type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Note (optional)</label>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. October salary" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
              </div>

              {/* Cash advance deductions */}
              {pendingAdvances.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Cash Advance Deductions</p>
                  {pendingAdvances.map(a => (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={deductIds.includes(a.id)} onChange={() => toggleDeduct(a.id)}
                        className="w-4 h-4 text-orange-500 rounded flex-shrink-0" />
                      <span className="text-xs text-slate-700">
                        <span className="font-semibold">Rs. {fmt(a.amount)}</span>
                        <span className="text-slate-400"> · {new Date(a.given_date).toLocaleDateString('en-LK')}</span>
                        {a.note && <span className="text-slate-400"> · {a.note}</span>}
                      </span>
                    </label>
                  ))}
                  {deductIds.length > 0 && (
                    <div className="pt-2 border-t border-orange-200 grid grid-cols-3 gap-1 text-xs text-center">
                      <div><p className="text-slate-500">Gross</p><p className="font-bold text-slate-700">Rs. {fmt(form.amount)}</p></div>
                      <div><p className="text-slate-500">Advance</p><p className="font-bold text-orange-600">−Rs. {fmt(totalDeduction)}</p></div>
                      <div><p className="text-slate-500">Net</p><p className="font-bold text-green-700">Rs. {fmt(netAmount)}</p></div>
                    </div>
                  )}
                </div>
              )}

              {err && <p className="text-xs text-red-600">{err}</p>}
              {ok  && <p className="text-xs text-green-600 font-semibold">{ok}</p>}
              <button type="submit" disabled={paying}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                {paying ? 'Recording…' : deductIds.length ? `Pay Rs. ${fmt(netAmount)} (net)` : 'Pay Salary & Post to GL'}
              </button>
            </form>
          </div>

          {/* RIGHT — Payment History */}
          <div className="flex-1 p-6 overflow-y-auto">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Payment History</p>
            {isLoading ? <Spin /> : !payments.length ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <p className="text-sm">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider border-b border-slate-200" style={{ background: '#1e3a5f' }}>
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-white">Period</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-white">Details</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-white">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{p.period}</p>
                          <p className="font-mono text-xs text-slate-400 mt-0.5">{p.ref_no}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-600 text-xs">{p.note || <span className="text-slate-300">—</span>}</p>
                          <p className="text-slate-400 text-xs mt-0.5">by {p.user?.name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold text-slate-800">Rs. {fmt(p.amount)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Employee form modal ───────────────────────────────────────────────────────

const CALC_METHODS = [
  { value: 'manual',     label: 'Manual — manager enters amount each time' },
  { value: 'daily_rate', label: 'Daily Rate — basic ÷ working days × present days' },
  { value: 'deduction',  label: 'Deduction — basic − (absent days × daily rate)' },
];

const emptyEmp = { name: '', position: '', phone: '', address: '', basic_salary: '', hired_date: '', device_employee_id: '', salary_calculation: 'manual' };

function EmployeeModal({ initial, onClose, onSaved }) {
  const [createEmployee] = useCreateEmployeeMutation();
  const [updateEmployee] = useUpdateEmployeeMutation();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(initial ? {
    name:               initial.name || '',
    position:           initial.position || '',
    phone:              initial.phone || '',
    address:            initial.address || '',
    basic_salary:       initial.basic_salary || '',
    hired_date:         initial.hired_date || '',
    device_employee_id: initial.device_employee_id || '',
    salary_calculation: initial.salary_calculation || 'manual',
  } : emptyEmp);
  const [err, setErr]       = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setErr('Name is required');
    setSaving(true);
    try {
      if (isEdit) await updateEmployee({ id: initial.id, ...form }).unwrap();
      else        await createEmployee(form).unwrap();
      onSaved();
    } catch (ex) {
      setErr(ex?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  }

  const field = (label, key, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
    </div>
  );

  return (
    <Modal title={isEdit ? 'Edit Employee' : 'Add Employee'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {field('Name *', 'name')}
        {field('Position', 'position')}
        {field('Phone', 'phone')}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Basic Salary</label>
            <input type="number" min="0" step="0.01" value={form.basic_salary}
              onChange={e => setForm(f => ({ ...f, basic_salary: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Hired Date</label>
            <input type="date" value={form.hired_date}
              onChange={e => setForm(f => ({ ...f, hired_date: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Device Employee ID</label>
          <input value={form.device_employee_id}
            onChange={e => setForm(f => ({ ...f, device_employee_id: e.target.value }))}
            placeholder="Fingerprint scanner enroll number"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <p className="text-xs text-slate-400 mt-1">The employee number enrolled on the Hikvision device.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Salary Calculation Method</label>
          <select value={form.salary_calculation}
            onChange={e => setForm(f => ({ ...f, salary_calculation: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            {CALC_METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : (isEdit ? 'Update' : 'Add Employee')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Employees section ─────────────────────────────────────────────────────────

function EmployeesSection() {
  const { data: employees = [], isLoading } = useGetEmployeesQuery(undefined, { refetchOnMountOrArgChange: true });
  const [deleteEmployee] = useDeleteEmployeeMutation();
  const [modalEmp,      setModalEmp]      = useState(null);
  const [salaryEmp,     setSalaryEmp]     = useState(null);
  const [historyEmp,    setHistoryEmp]    = useState(null);
  const [advanceEmp,    setAdvanceEmp]    = useState(null);
  const [advHistoryEmp, setAdvHistoryEmp] = useState(null);
  const [confirmDel,    setConfirmDel]    = useState(null);

  if (isLoading) return <Spin />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Manage employees and record salary payments — each payment posts automatically to the General Ledger.</p>
        <button onClick={() => setModalEmp({})}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          + Add Employee
        </button>
      </div>

      <div className="bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Position</th>
              <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Phone</th>
              <th className="px-4 py-3 text-right font-semibold">Basic Salary</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!employees.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No employees yet. Add one to get started.</td></tr>
            )}
            {employees.map(emp => (
              <tr key={emp.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-800">{emp.name}</td>
                <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{emp.position || '—'}</td>
                <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{emp.phone || '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-700">Rs. {fmt(emp.basic_salary)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <button onClick={() => setSalaryEmp(emp)}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
                      Pay Salary
                    </button>
                    <button onClick={() => setAdvanceEmp(emp)}
                      className="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors">
                      + Advance
                    </button>
                    <button onClick={() => setAdvHistoryEmp(emp)}
                      className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-medium rounded-lg hover:bg-orange-100 transition-colors">
                      Advances
                    </button>
                    <button onClick={() => setHistoryEmp(emp)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors">
                      History
                    </button>
                    <button onClick={() => setModalEmp(emp)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => setConfirmDel(emp)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors">
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalEmp !== null && (
        <EmployeeModal initial={modalEmp?.id ? modalEmp : null} onClose={() => setModalEmp(null)} onSaved={() => setModalEmp(null)} />
      )}
      {salaryEmp     && <SalaryModal        employee={salaryEmp}     onClose={() => setSalaryEmp(null)}     />}
      {historyEmp    && <SalaryHistoryModal employee={historyEmp}    onClose={() => setHistoryEmp(null)}    />}
      {advanceEmp    && <AdvanceModal       employee={advanceEmp}    onClose={() => setAdvanceEmp(null)}    />}
      {advHistoryEmp && <AdvanceHistoryModal employee={advHistoryEmp} onClose={() => setAdvHistoryEmp(null)} />}
      {confirmDel && (
        <Modal title="Remove Employee" onClose={() => setConfirmDel(null)}>
          <p className="text-sm text-slate-600 mb-4">Deactivate <strong>{confirmDel.name}</strong>? Their salary history will be preserved.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50">Cancel</button>
            <button onClick={async () => { await deleteEmployee(confirmDel.id); setConfirmDel(null); }}
              className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Day punch-times modal ─────────────────────────────────────────────────────

function DayPunchModal({ employee, day, month, records, onClose }) {
  const [y, m] = month.split('-').map(Number);
  const dayRecords = records.filter(r => {
    const slt = new Date(r.punch_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
    const [ry, rm, rd] = slt.split('-').map(Number);
    return String(r.employee_id) === String(employee.id) && ry === y && rm === m && rd === day;
  }).sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

  const dateStr = new Date(y, m - 1, day).toLocaleDateString('en-LK', {
    timeZone: 'Asia/Colombo', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const fmtTime = pt => new Date(pt).toLocaleTimeString('en-LK', {
    timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  // Compute total hours from first-in to last-out
  const ins  = dayRecords.filter(r => r.direction === 'in');
  const outs = dayRecords.filter(r => r.direction === 'out');
  let totalHrs = null;
  if (ins.length && outs.length) {
    const firstIn  = new Date(ins[0].punch_time);
    const lastOut  = new Date(outs[outs.length - 1].punch_time);
    const diff     = (lastOut - firstIn) / 3600000;
    if (diff > 0) totalHrs = diff.toFixed(1);
  }

  const dirMeta = d => d === 'in'
    ? { label: 'Check In',  dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200', icon: '↓' }
    : d === 'out'
    ? { label: 'Check Out', dot: 'bg-red-400',   badge: 'bg-red-50 text-red-700 border-red-200',       icon: '↑' }
    : { label: 'Punch',     dot: 'bg-blue-400',  badge: 'bg-blue-50 text-blue-700 border-blue-200',    icon: '•' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div style={{ background: '#1e3a5f' }} className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Attendance Detail</p>
              <h2 className="text-white text-xl font-bold leading-tight">{employee.name}</h2>
              <p className="text-blue-300 text-sm mt-0.5">{dateStr}</p>
            </div>
            <button onClick={onClose}
              className="text-blue-300 hover:text-white text-2xl leading-none mt-0.5 transition-colors">&times;</button>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mt-4">
            <div className="bg-white/10 rounded-xl px-4 py-2.5 flex-1 text-center">
              <p className="text-blue-200 text-xs font-medium">Punches</p>
              <p className="text-white text-2xl font-bold">{dayRecords.length}</p>
            </div>
            {totalHrs && (
              <div className="bg-white/10 rounded-xl px-4 py-2.5 flex-1 text-center">
                <p className="text-blue-200 text-xs font-medium">Hours</p>
                <p className="text-white text-2xl font-bold">{totalHrs}h</p>
              </div>
            )}
            {ins.length > 0 && (
              <div className="bg-white/10 rounded-xl px-4 py-2.5 flex-1 text-center">
                <p className="text-blue-200 text-xs font-medium">First In</p>
                <p className="text-white text-sm font-bold mt-0.5">{fmtTime(ins[0].punch_time)}</p>
              </div>
            )}
            {outs.length > 0 && (
              <div className="bg-white/10 rounded-xl px-4 py-2.5 flex-1 text-center">
                <p className="text-blue-200 text-xs font-medium">Last Out</p>
                <p className="text-white text-sm font-bold mt-0.5">{fmtTime(outs[outs.length - 1].punch_time)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Punch list */}
        <div className="p-6">
          {!dayRecords.length ? (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm">No punch records for this day.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-slate-200" />
              <div className="space-y-3">
                {dayRecords.map((r, i) => {
                  const meta = dirMeta(r.direction);
                  return (
                    <div key={r.id} className="flex items-center gap-4 relative">
                      {/* Dot */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm ${meta.dot} bg-opacity-20 border-2`}
                        style={{ borderColor: 'currentColor' }}>
                        <span className={`w-3 h-3 rounded-full ${meta.dot}`} />
                      </div>
                      {/* Card */}
                      <div className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl border ${meta.badge}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold uppercase tracking-wide">{meta.label}</span>
                          <span className="text-base font-mono font-semibold">{fmtTime(r.punch_time)}</span>
                        </div>
                        <span className="text-xs opacity-60 font-medium">
                          {r.source === 'device' ? 'Scanner' : 'Manual'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-5">
          <button onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Attendance section ────────────────────────────────────────────────────────

function AttendanceSection() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth]         = useState(currentMonth);
  const [syncMsg, setSyncMsg]     = useState(null);
  const [dayDetail, setDayDetail] = useState(null); // { employee, day }

  const { data: employees = [] }  = useGetEmployeesQuery();
  const { data: records  = [], isLoading } = useGetAttendanceRecordsQuery({ month });
  const { data: settings }        = useGetAttendanceSettingsQuery();
  const [syncAttendance, { isLoading: syncing }] = useSyncAttendanceMutation();

  const [y, m]    = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days      = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const isSunday  = d => new Date(y, m - 1, d).getDay() === 0;

  // presence map: employee_id → Set<day>  (day in Sri Lanka time)
  const presence = {};
  for (const r of records) {
    const eid = String(r.employee_id);
    const day = parseInt(new Date(r.punch_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }).split('-')[2], 10);
    if (!presence[eid]) presence[eid] = new Set();
    presence[eid].add(day);
  }

  const workingDays = days.filter(d => !isSunday(d)).length;

  async function handleSync() {
    setSyncMsg(null);
    try {
      const res = await syncAttendance().unwrap();
      setSyncMsg({ ok: `Synced: ${res.saved} new records (${res.fetched} fetched from device)` });
    } catch (ex) {
      setSyncMsg({ err: ex?.data?.error || 'Sync failed. Check device settings.' });
    }
    setTimeout(() => setSyncMsg(null), 6000);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          {settings?.last_synced_at && (
            <span className="text-xs text-slate-400">
              Last sync: {new Date(settings.last_synced_at).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {syncMsg?.ok  && <span className="text-xs text-green-600 font-semibold">{syncMsg.ok}</span>}
          {syncMsg?.err && <span className="text-xs text-red-600">{syncMsg.err}</span>}
          <button onClick={handleSync} disabled={syncing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {syncing ? 'Syncing…' : '↻ Sync Device'}
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? <Spin /> : (
        <div className="bg-white border overflow-x-auto rounded-lg">
          <table className="text-sm" style={{ minWidth: `${140 + daysInMonth * 30 + 120}px` }}>
            <thead>
              <tr style={{ background: '#1e3a5f' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider sticky left-0"
                  style={{ background: '#1e3a5f', minWidth: 140 }}>
                  Employee
                </th>
                {days.map(d => (
                  <th key={d} className="py-3 text-center text-xs font-semibold uppercase tracking-wider"
                    style={{ minWidth: 28, color: isSunday(d) ? '#94a3b8' : '#fff' }}>
                    {d}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Present</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Absent</th>
              </tr>
            </thead>
            <tbody>
              {!employees.length && (
                <tr><td colSpan={days.length + 3} className="px-4 py-10 text-center text-slate-400">No employees.</td></tr>
              )}
              {employees.map(emp => {
                const p = presence[String(emp.id)] || new Set();
                const presentCount = days.filter(d => !isSunday(d) && p.has(d)).length;
                return (
                  <tr key={emp.id} className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50">
                    <td className="px-4 py-2 font-semibold text-slate-800 text-xs sticky left-0 bg-inherit">{emp.name}</td>
                    {days.map(d => (
                      <td key={d} className={`py-2 text-center ${isSunday(d) ? 'bg-slate-100' : ''}`}>
                        {isSunday(d) ? (
                          p.has(d) ? (
                            <button onClick={() => setDayDetail({ employee: emp, day: d })}
                              className="inline-block w-2.5 h-2.5 rounded-full bg-blue-300 hover:bg-blue-400 hover:scale-125 transition-transform cursor-pointer"
                              title="Sunday — not counted but has records, click to see" />
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )
                        ) : p.has(d) ? (
                          <button onClick={() => setDayDetail({ employee: emp, day: d })}
                            className="inline-block w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-600 hover:scale-125 transition-transform cursor-pointer"
                            title="Present — click to see times" />
                        ) : (
                          <button onClick={() => setDayDetail({ employee: emp, day: d })}
                            className="inline-block w-3.5 h-3.5 rounded-full bg-red-200 hover:bg-red-300 hover:scale-125 transition-transform cursor-pointer"
                            title="Absent — click to check" />
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold text-green-700 text-sm">{presentCount}</td>
                    <td className="px-3 py-2 text-center font-bold text-red-500 text-sm">
                      {Math.max(0, workingDays - presentCount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Working days</td>
                <td colSpan={days.length} />
                <td className="px-3 py-2 text-center text-xs font-bold text-slate-600">{workingDays}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Green = present (click for times) &nbsp;&bull;&nbsp; Red = absent &nbsp;&bull;&nbsp; Blue = Sunday with scan (not counted) &nbsp;&bull;&nbsp; Gray = Sunday
      </p>

      {dayDetail && (
        <DayPunchModal
          employee={dayDetail.employee}
          day={dayDetail.day}
          month={month}
          records={records}
          onClose={() => setDayDetail(null)}
        />
      )}
    </div>
  );
}

// ── Device settings section ───────────────────────────────────────────────────

function DeviceSettingsSection() {
  const { data: settings, isLoading } = useGetAttendanceSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateAttendanceSettingsMutation();
  const [form, setForm] = useState(null);
  const [ok,  setOk]   = useState('');
  const [err, setErr]  = useState('');

  useEffect(() => {
    if (settings && !form) {
      setForm({
        device_ip:         settings.device_ip        || '',
        port:              settings.port              || 80,
        username:          settings.username          || 'admin',
        password:          '',
        poll_interval_min: settings.poll_interval_min || 5,
        enabled:           !!settings.enabled,
      });
    }
  }, [settings, form]);

  if (isLoading || !form) return <Spin />;

  async function handleSave(e) {
    e.preventDefault();
    setErr('');
    try {
      await updateSettings(form).unwrap();
      setOk('Settings saved!');
      setTimeout(() => setOk(''), 3000);
    } catch (ex) {
      setErr(ex?.data?.error || 'Failed to save');
    }
  }

  const inp = (label, key, type = 'text', placeholder = '') => (
    <div key={key}>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <input type={type} value={form[key]} placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
    </div>
  );

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-slate-500">
        Configure the Hikvision fingerprint scanner (ISAPI / HTTP Digest Auth).
        The server polls the device on the set interval and imports punch events automatically.
      </p>
      <form onSubmit={handleSave} className="bg-white border rounded-xl p-6 space-y-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Device Connection</p>
        <div className="flex gap-4">
          <div className="flex-1">{inp('Device IP Address', 'device_ip', 'text', '192.168.1.100')}</div>
          <div style={{ width: 90 }}>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Port</label>
            <input type="number" min="1" max="65535" value={form.port}
              onChange={e => setForm(f => ({ ...f, port: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
          </div>
        </div>
        {inp('Username', 'username', 'text', 'admin')}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
          <input type="password" value={form.password} placeholder="Leave blank to keep current"
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sync Options</p>
          <div className="flex gap-4 items-end">
            <div style={{ width: 140 }}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Poll Interval (min)</label>
              <input type="number" min="1" max="60" value={form.poll_interval_min}
                onChange={e => setForm(f => ({ ...f, poll_interval_min: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
            </div>
            <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={!!form.enabled}
                onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm font-medium text-slate-700">Enable auto-sync</span>
            </label>
          </div>
        </div>

        {err && <p className="text-xs text-red-600">{err}</p>}
        {ok  && <p className="text-xs text-green-600 font-semibold">{ok}</p>}
        <button type="submit" disabled={saving}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">Setup steps</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Connect the Hikvision device to the same network as this server.</li>
          <li>Enter the device IP, port (default 80), and admin credentials above.</li>
          <li>On each employee record, set the <strong>Device Employee ID</strong> to match the enroll number on the scanner.</li>
          <li>Click &quot;Save Settings&quot; then use &quot;Sync Device&quot; on the Attendance tab to pull events.</li>
        </ol>
      </div>
    </div>
  );
}

// ── Sidebar layout ────────────────────────────────────────────────────────────

const NAV = [
  { key: 'employees', label: 'Employees',       icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0' },
  { key: 'attendance', label: 'Attendance',      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'device',    label: 'Device Settings',  icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function PayrollIndex() {
  const [section, setSection] = useState('employees');

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* Sidebar */}
      <aside className="w-48 shrink-0 bg-white border-r border-slate-200 pt-4">
        <p className="px-4 pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Payroll</p>
        <nav className="space-y-0.5">
          {NAV.map(item => (
            <button key={item.key} onClick={() => setSection(item.key)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors text-left
                ${section === item.key
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        {section === 'employees' && <EmployeesSection />}
        {section === 'attendance' && <AttendanceSection />}
        {section === 'device'    && <DeviceSettingsSection />}
      </main>
    </div>
  );
}
