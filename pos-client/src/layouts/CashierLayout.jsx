import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser, selectRole, selectToken } from '../features/auth/authSlice';
import { useLocale } from '../contexts/LocaleContext';
import { useConnectivity } from '../contexts/ConnectivityContext';
import { syncAll, syncOfflineQueue } from '../services/cacheSync';
import { api } from '../app/baseApi';

const settingsApi = api.injectEndpoints({
  endpoints: b => ({
    getCashierSettings: b.query({ query: () => '/settings', providesTags: ['Settings'] }),
  }),
  overrideExisting: false,
});

const API = import.meta.env.VITE_API_URL;

const IcoPos = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3m-1-4H9m0 0a2 2 0 0 0 0 4h6a2 2 0 0 0 0-4M9 3h6"/></svg>;
const IcoSales = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4"/></svg>;
const IcoCustomers = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoLogout = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1"/></svg>;

export default function CashierLayout() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useSelector(selectCurrentUser);
  const role      = useSelector(selectRole);
  const token     = useSelector(selectToken);
  const { t }     = useLocale();

  const { isOnline, wasOffline } = useConnectivity();
  const [syncing, setSyncing]   = useState(false);
  const syncedOnceRef           = useRef(false);

  const { data: layoutSettings } = settingsApi.useGetCashierSettingsQuery(undefined, { skip: !token });

  const [shopInfo, setShopInfo] = useState({ shop_name: '', shop_logo: '' });

  useEffect(() => {
    fetch(`${API}/api/settings/public`)
      .then(r => r.json())
      .then(d => setShopInfo(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOnline || !token) return;
    if (syncedOnceRef.current && !wasOffline) return;
    const firstSync = !syncedOnceRef.current;
    syncedOnceRef.current = true;
    setSyncing(true);
    const work = firstSync
      ? syncAll()
      : syncOfflineQueue().then(() => syncAll());
    work.finally(() => setSyncing(false));
  }, [isOnline, wasOffline, token]);

  // Redirect cashier away from dashboard/admin pages
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/dashboard') {
      navigate('/sales/create', { replace: true });
    }
  }, [location.pathname, navigate]);

  const [zoomScale, setZoomScale] = useState(1);
  useEffect(() => {
    if (!layoutSettings) return;
    const autoScale = layoutSettings.pos_auto_scale !== '0' && layoutSettings.pos_auto_scale !== false;
    let scale = 1;
    if (autoScale) {
      scale = window.screen.width < 1500 ? 0.8 : 1;
    } else {
      scale = parseInt(layoutSettings.pos_scale_value || '100', 10) / 100;
    }
    setZoomScale(scale);
  }, [layoutSettings]);

  const zoomStyle = zoomScale !== 1 ? {
    zoom: zoomScale,
    width:  `${100 / zoomScale}vw`,
    height: `${100 / zoomScale}vh`,
  } : {};

  const isPOS = location.pathname === '/sales/create';

  function handleLogout() {
    dispatch(logout());
    navigate('/login');
  }

  function navCls({ isActive }) {
    const base = 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150';
    return isActive
      ? `${base} bg-white/15 text-white`
      : `${base} text-slate-300 hover:text-white hover:bg-white/10`;
  }

  return (
    <div style={zoomStyle} className="flex flex-col h-screen bg-slate-100 overflow-hidden">

      {/* ── Top Navbar ─────────────────────────────────────────────────────── */}
      {!isPOS && (
        <header className="bg-slate-900 shrink-0 px-4 h-14 flex items-center justify-between shadow-md">

          {/* Left: shop brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
              {shopInfo.shop_logo
                ? <img src={shopInfo.shop_logo} alt="logo" className="w-full h-full object-cover" />
                : <span>{(shopInfo.shop_name || 'P')[0].toUpperCase()}</span>
              }
            </div>
            <span className="text-white font-bold text-sm hidden sm:block">
              {shopInfo.shop_name || 'POS'}
            </span>
          </div>

          {/* Center: nav links */}
          <nav className="flex items-center gap-1">
            <NavLink to="/sales/create" className={navCls}>
              {IcoPos}
              <span>New Sale</span>
            </NavLink>
            <NavLink to="/sales" end className={navCls}>
              {IcoSales}
              <span>Sales</span>
            </NavLink>
            <NavLink to="/customers" className={navCls}>
              {IcoCustomers}
              <span>Customers</span>
            </NavLink>
          </nav>

          {/* Right: status + user + logout */}
          <div className="flex items-center gap-3">
            {!isOnline && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-xs font-semibold text-red-300">Offline</span>
              </div>
            )}
            {isOnline && syncing && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
                <svg className="w-3 h-3 text-blue-300 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span className="text-xs font-semibold text-blue-300">Syncing…</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'C'}
              </div>
              <div className="text-xs leading-tight hidden sm:block">
                <p className="font-semibold text-white">{user?.name}</p>
                <p className="text-slate-400 capitalize">{role}</p>
              </div>
            </div>

            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-red-600/30 transition-colors">
              {IcoLogout}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main className={`flex-1 min-h-0 flex flex-col relative ${isPOS ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {isPOS && !isOnline && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Offline Mode
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
