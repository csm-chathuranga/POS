import { useState } from 'react';
import {
  useGetEmployeesQuery, useCreateEmployeeMutation, useUpdateEmployeeMutation,
  useDeleteEmployeeMutation, useGetSalaryHistoryQuery, usePaySalaryMutation,
} from '../../features/employees/employeesApi';

const fmt = n => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

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
// ── Payroll ───────────────────────────────────────────────────────────────────

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
                    <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Ref</th>
                    <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Note</th>
                    <th className="px-4 py-2.5 text-right font-semibold" style={{ color: '#fff' }}>Amount</th>
                    <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Paid by</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{p.period}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{p.ref_no}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{p.note || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">Rs. {fmt(p.amount)}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{p.user?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t border-slate-200">
                    <td colSpan={3} className="px-4 py-2.5 font-bold text-slate-700 text-xs uppercase">Total Paid</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">Rs. {fmt(total)}</td>
                    <td></td>
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

const emptyEmp = { name: '', position: '', phone: '', address: '', basic_salary: '', hired_date: '' };

function SalaryModal({ employee, onClose }) {
  const { data, isLoading } = useGetSalaryHistoryQuery(employee.id, { refetchOnMountOrArgChange: true });
  const [paySalary, { isLoading: paying }] = usePaySalaryMutation();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({ period: currentMonth, amount: employee.basic_salary || '', note: '' });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function handlePay(e) {
    e.preventDefault();
    setErr('');
    try {
      await paySalary({ id: employee.id, ...form }).unwrap();
      setOk('Salary paid and posted to journal!');
      setForm(f => ({ ...f, note: '' }));
      setTimeout(() => setOk(''), 3000);
    } catch (ex) {
      setErr(ex?.data?.error || 'Failed to record payment');
    }
  }

  const payments = data?.payments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{employee.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{employee.position || 'No position'} &middot; Basic Salary: <span className="font-semibold text-slate-600">Rs. {fmt(employee.basic_salary)}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Pay form */}
          <form onSubmit={handlePay} className="space-y-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Record Salary Payment</p>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Period</label>
                <input type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount (Rs.)</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Note (optional)</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="e.g. October salary" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
            {ok  && <p className="text-xs text-green-600 font-semibold">{ok}</p>}
            <button type="submit" disabled={paying}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
              {paying ? 'Recording…' : 'Pay Salary & Post to GL'}
            </button>
          </form>

          {/* History */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Payment History</p>
            {isLoading ? <Spin /> : !payments.length ? (
              <p className="text-sm text-slate-400 text-center py-6">No payments recorded yet.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold">Period</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Ref</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Note</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Paid by</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700 font-semibold">{p.period}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{p.ref_no}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{p.note || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">Rs. {fmt(p.amount)}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{p.user?.name || '—'}</td>
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

function EmployeeModal({ initial, onClose, onSaved }) {
  const [createEmployee] = useCreateEmployeeMutation();
  const [updateEmployee] = useUpdateEmployeeMutation();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(initial ? {
    name: initial.name || '', position: initial.position || '',
    phone: initial.phone || '', address: initial.address || '',
    basic_salary: initial.basic_salary || '', hired_date: initial.hired_date || '',
  } : emptyEmp);
  const [err, setErr] = useState('');
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

  return (
    <Modal title={isEdit ? 'Edit Employee' : 'Add Employee'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {[['Name *', 'name', 'text'], ['Position', 'position', 'text'], ['Phone', 'phone', 'text']].map(([label, key, type]) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
            <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        ))}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Basic Salary</label>
            <input type="number" min="0" step="0.01" value={form.basic_salary} onChange={e => setForm(f => ({ ...f, basic_salary: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Hired Date</label>
            <input type="date" value={form.hired_date} onChange={e => setForm(f => ({ ...f, hired_date: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : (isEdit ? 'Update' : 'Add Employee')}</button>
        </div>
      </form>
    </Modal>
  );
}

function PayrollTab() {
  const { data: employees = [], isLoading } = useGetEmployeesQuery(undefined, { refetchOnMountOrArgChange: true });
  const [deleteEmployee] = useDeleteEmployeeMutation();
  const [modalEmp,    setModalEmp]    = useState(null); // employee form modal
  const [salaryEmp,   setSalaryEmp]   = useState(null); // salary modal
  const [historyEmp,  setHistoryEmp]  = useState(null); // history modal
  const [confirmDel,  setConfirmDel]  = useState(null);

  if (isLoading) return <Spin />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Manage employees and record salary payments — each payment posts automatically to the General Ledger.</p>
        </div>
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
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setSalaryEmp(emp)}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
                      Pay Salary
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

      {/* Modals */}
      {modalEmp !== null && (
        <EmployeeModal
          initial={modalEmp?.id ? modalEmp : null}
          onClose={() => setModalEmp(null)}
          onSaved={() => setModalEmp(null)}
        />
      )}
      {salaryEmp   && <SalaryModal        employee={salaryEmp}  onClose={() => setSalaryEmp(null)}  />}
      {historyEmp  && <SalaryHistoryModal employee={historyEmp} onClose={() => setHistoryEmp(null)} />}
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


export default function PayrollIndex() {
  return (
    <div className="p-3 sm:p-6">
      <PayrollTab />
    </div>
  );
}
