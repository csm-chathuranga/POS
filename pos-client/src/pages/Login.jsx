import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from '../features/auth/authApi';
import { setCredentials } from '../features/auth/authSlice';

const API = import.meta.env.VITE_API_URL;

const DEMO = [
  {
    role: 'Admin',
    email: 'admin@lmucpos.lk',
    badge: 'සියලු අයිතිවාසිකම්',
    bg: 'bg-blue-600',
    cardBg: 'bg-blue-50',
    badgeBg: 'bg-purple-100 text-purple-700',
  },
  {
    role: 'Manager',
    email: 'manager@lmucpos.lk',
    badge: 'කළමනාකරණ',
    bg: 'bg-purple-500',
    cardBg: 'bg-purple-50',
    badgeBg: 'bg-pink-100 text-pink-700',
  },
  {
    role: 'Cashier',
    email: 'cashier@lmucpos.lk',
    badge: 'බිල්පත් කිරීම',
    bg: 'bg-teal-500',
    cardBg: 'bg-teal-50',
    badgeBg: 'bg-teal-100 text-teal-700',
  },
];

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [appInfo, setAppInfo] = useState({ shop_name: 'LMUC POS', shop_logo: '' });

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/settings/public`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setAppInfo(d))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await login(form).unwrap();
      dispatch(setCredentials(res));
      navigate('/dashboard');
    } catch (err) {
      setError(err?.data?.error || 'Login failed');
    }
  }

  function fillDemo(email) {
    setForm({ email, password: 'password' });
  }

  return (
    <div>
      {/* Logo + brand */}
      <div className="flex flex-col items-center mb-5">
        {appInfo.shop_logo ? (
          <img
            src={appInfo.shop_logo}
            alt="logo"
            className="w-20 h-20 rounded-full object-cover shadow-md border-4 border-white mb-3"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-white shadow-md border-4 border-white mb-3 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
              <circle cx="40" cy="40" r="40" fill="#1e4d8c" />
              <circle cx="40" cy="28" r="12" fill="#fff" opacity=".9" />
              <ellipse cx="40" cy="62" rx="20" ry="14" fill="#fff" opacity=".9" />
            </svg>
          </div>
        )}
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          {appInfo.shop_name || 'LMUC POS'}
        </h1>
        <p className="text-sm text-slate-500">Point of Sale System</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-5">Sign In</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email" required autoFocus
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password" required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit" disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm disabled:opacity-60 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-400 tracking-widest mb-3">
            DEMO ACCOUNTS (CLICK TO FILL)
          </p>
          <div className="space-y-2">
            {DEMO.map(d => (
              <button
                key={d.email}
                type="button"
                onClick={() => fillDemo(d.email)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-slate-200 transition-all text-left ${d.cardBg}`}
              >
                <div className={`w-9 h-9 rounded-full ${d.bg} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {d.role[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{d.role}</p>
                  <p className="text-xs text-slate-500 truncate">{d.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${d.badgeBg}`}>
                  {d.badge}
                </span>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-3">
            Password: <span className="font-semibold text-slate-500">password</span>
          </p>
        </div>
      </div>
    </div>
  );
}
