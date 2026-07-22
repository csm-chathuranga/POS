import { useState } from 'react';
import {
  useGetUsersQuery, useCreateUserMutation,
  useUpdateUserMutation, useDeleteUserMutation,
} from '../../features/users/usersApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { useLocale } from '../../contexts/LocaleContext';

const ROLES = ['admin', 'manager', 'cashier'];
const empty = { name: '', email: '', password: '', role: 'cashier' };

export default function UsersIndex() {
  const { t } = useLocale();
  const me = useSelector(selectCurrentUser);
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState(empty);
  const [err, setErr]     = useState('');

  const { data: users = [], isLoading } = useGetUsersQuery();
  const [create, { isLoading: creating }] = useCreateUserMutation();
  const [update, { isLoading: updating }] = useUpdateUserMutation();
  const [del] = useDeleteUserMutation();

  function openCreate() { setForm(empty); setErr(''); setModal('new'); }
  function openEdit(u)  { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setErr(''); setModal({ edit: u }); }
  function close()      { setModal(null); }

  async function handleSave(e) {
    e.preventDefault(); setErr('');
    try {
      if (modal?.edit) await update({ id: modal.edit.id, ...form }).unwrap();
      else await create(form).unwrap();
      close();
    } catch (e) { setErr(e?.data?.error || 'Failed'); }
  }

  async function handleDelete(u) {
    if (u.id === me?.id) return;
    if (!window.confirm(`Delete "${u.name}"?`)) return;
    await del(u.id);
  }

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const roleBadge = role => {
    const cls = { admin: 'bg-red-100 text-red-700', manager: 'bg-blue-100 text-blue-700', cashier: 'bg-green-100 text-green-700' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${cls[role] || 'bg-slate-100 text-slate-600'}`}>{role}</span>;
  };

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('page.users')}</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          + {t('btn.add')} {t('nav.users')}
        </button>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('lbl.loading')}</div>}
        {!isLoading && users.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">{t('usr.no_users')}</div>
        )}
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-semibold text-slate-800">
                  {u.name} {u.id === me?.id && <span className="text-xs text-slate-400 font-normal">(you)</span>}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
              </div>
              {roleBadge(u.role)}
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-50 mt-3">
              <button onClick={() => openEdit(u)}
                className="flex-1 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                {t('btn.edit')}
              </button>
              {u.id !== me?.id && (
                <button onClick={() => handleDelete(u)}
                  className="flex-1 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                  {t('btn.delete')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400 text-sm">{t('lbl.loading')}</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t('usr.name')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('usr.email')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('usr.role')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('th.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {u.name} {u.id === me?.id && <span className="text-xs text-slate-400">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 text-center">{roleBadge(u.role)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800 font-medium">{t('btn.edit')}</button>
                    {u.id !== me?.id && (
                      <button onClick={() => handleDelete(u)} className="text-red-500 hover:text-red-700 font-medium">{t('btn.delete')}</button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t('usr.no_users')}</td></tr>
              )}
            </tbody>
          </table></div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">{modal?.edit ? `${t('btn.edit')} ${t('nav.users')}` : `${t('btn.add')} ${t('nav.users')}`}</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              {err && <p className="text-sm text-red-600">{err}</p>}
              {[[`${t('usr.name')} *`, 'name', 'text', { required: true }], [`${t('usr.email')} *`, 'email', 'email', { required: true }]].map(([label, field, type, props = {}]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input type={type} value={form[field]} onChange={set(field)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" {...props} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('usr.password')} {modal?.edit && `(${t('usr.password_note')})`}</label>
                <input type="password" value={form.password} onChange={set('password')}
                  required={!modal?.edit}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('usr.role')}</label>
                <select value={form.role} onChange={set('role')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r} value={r}>{t(`usr.${r}`)}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">{t('btn.cancel')}</button>
                <button type="submit" disabled={creating || updating}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-blue-700">
                  {creating || updating ? t('lbl.loading') : t('btn.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
