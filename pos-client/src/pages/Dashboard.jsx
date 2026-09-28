import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api } from '../app/baseApi';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import { selectRole } from '../features/auth/authSlice';
import ManagerDashboard from './ManagerDashboard';

const dashboardApi = api.injectEndpoints({
  endpoints: build => ({
    getDashboard: build.query({ query: () => '/dashboard', providesTags: ['Dashboard'] }),
  }),
  overrideExisting: false,
});

function fmtRs(n) {
  return 'Rs. ' + parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtShort(n) {
  const v = parseFloat(n || 0);
  if (v >= 1_000_000) return 'Rs. ' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return 'Rs. ' + (v / 1_000).toFixed(1) + 'k';
  return 'Rs. ' + v.toFixed(2);
}
function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yest  = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString())  return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}
function timeStr(s) {
  return new Date(s).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}
function isoDate(d) { return d.toISOString().slice(0, 10); }

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, gradient, valueColor = 'text-white', trend, isDark }) {
  return (
    <div className={`h-full rounded-2xl p-3 sm:p-4 flex items-start gap-3 relative overflow-hidden shadow-lg ${gradient}`}>
      <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white/10" />
      <div className="absolute -top-4 -left-4 w-14 h-14 rounded-full bg-white/10" />
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 z-10">
        {icon}
      </div>
      <div className="min-w-0 z-10 flex-1">
        <p className="text-[10px] sm:text-xs text-white/70 font-semibold uppercase tracking-wide leading-tight">{label}</p>
        <p className={`text-xl sm:text-2xl font-extrabold mt-0.5 leading-tight truncate ${valueColor}`}>
          {typeof value === 'string' && value.startsWith('Rs. ')
            ? <><span className="text-xs sm:text-sm font-semibold">Rs. </span>{value.slice(4)}</>
            : value}
        </p>
        <p className="text-[10px] text-white/60 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}

// ─── Hourly Chart ─────────────────────────────────────────────────────────────
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];
const HOUR_LABELS = { 6:'6a', 8:'8a', 10:'10a', 12:'12p', 14:'2p', 16:'4p', 18:'6p', 20:'8p', 22:'10p' };

function HourlyChart({ hourlySales, dates, isDark }) {
  const [activeDay, setActiveDay] = useState(0);

  const byDate = useMemo(() => {
    const map = {};
    (hourlySales || []).forEach(r => {
      if (!map[r.date]) map[r.date] = {};
      map[r.date][parseInt(r.hour)] = parseFloat(r.total);
    });
    return map;
  }, [hourlySales]);

  const dateKey = dates[activeDay];
  const dayData = byDate[dateKey] || {};

  const points  = Array.from({ length: 24 }, (_, h) => ({ h, v: dayData[h] ?? 0 }));
  const visible = points.filter(p => p.h >= 6 && p.h <= 22);
  const maxVal  = Math.max(...visible.map(p => p.v), 1);

  const W = 520, H = 100, PAD_X = 0, PAD_Y = 8;
  const xPos = h => PAD_X + ((h - 6) / 16) * W;
  const yPos = v => H - PAD_Y - ((v / maxVal) * (H - PAD_Y * 2));

  const pathPts = visible.map(p => `${xPos(p.h)},${yPos(p.v)}`).join(' ');
  const areaPath = `M${xPos(6)},${H - PAD_Y} ` +
    visible.map(p => `L${xPos(p.h)},${yPos(p.v)}`).join(' ') +
    ` L${xPos(22)},${H - PAD_Y} Z`;

  const totalDay   = Object.values(dayData).reduce((a, b) => a + b, 0);
  const billsToday = (hourlySales || []).filter(r => r.date === dateKey).reduce((a, r) => a + parseInt(r.bills), 0);
  const gridStroke = isDark ? '#2a2a2a' : '#f1f5f9';

  return (
    <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">

      {/* Thin accent top bar */}
      <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500 rounded-t-2xl" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <div>
          <p className="font-bold text-slate-800 text-sm">Sales — Last 3 Days</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Hourly breakdown (6am – 10pm)</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {dates.map((d, i) => (
            <button key={d} onClick={() => setActiveDay(i)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                i === activeDay ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'
              }`}>
              {dayLabel(d)}
            </button>
          ))}
        </div>
      </div>

      {/* Stat numbers row */}
      <div className="flex gap-1 px-4 pb-2">
        {dates.map((d, i) => {
          const dData  = byDate[d] || {};
          const dTotal = Object.values(dData).reduce((a, b) => a + b, 0);
          const bills  = (hourlySales || []).filter(r => r.date === d).reduce((a, r) => a + parseInt(r.bills), 0);
          const active = i === activeDay;
          return (
            <button key={d} onClick={() => setActiveDay(i)}
              className={`flex-1 text-left px-3 py-2 rounded-xl border transition-all ${
                active ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:bg-slate-50'
              }`}>
              <p className={`text-base font-extrabold leading-none ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                {fmtShort(dTotal)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{dayLabel(d)} · {bills} bills</p>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="flex-1 px-4 pb-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 85 }}>
          <defs>
            <linearGradient id="cgBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.33, 0.66, 1].map(f => (
            <line key={f}
              x1={0} y1={PAD_Y + (1 - f) * (H - PAD_Y * 2)}
              x2={W} y2={PAD_Y + (1 - f) * (H - PAD_Y * 2)}
              stroke="#f1f5f9" strokeWidth="1" />
          ))}
          <path d={areaPath} fill="url(#cgBlue)" />
          <polyline points={pathPts} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {visible.filter(p => p.v > 0).map(p => (
            <circle key={p.h} cx={xPos(p.h)} cy={yPos(p.v)} r="3.5" fill="#3b82f6" stroke="white" strokeWidth="2" />
          ))}
        </svg>
      </div>

      {/* Hour labels */}
      <div className="flex justify-between px-4 pb-3">
        {HOURS.map(h => (
          <span key={h} className="text-[10px] text-slate-400">{HOUR_LABELS[h]}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────
function QuickBtn({ label, icon, color, iconBg, onClick }) {
  return (
    <button onClick={onClick}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl border text-left hover:-translate-y-0.5 active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md ${color}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <span className="font-semibold text-sm leading-tight">{label}</span>
      <svg className="w-4 h-4 ml-auto opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Heatmap({ heatmap, isDark }) {
  const map = useMemo(() => {
    const m = {};
    (heatmap || []).forEach(r => { m[r.date] = parseFloat(r.total); });
    return m;
  }, [heatmap]);

  const maxVal = Math.max(...Object.values(map), 1);

  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - mondayOffset - 69);

  const weeks = [];
  let cur = new Date(gridStart);
  const gridEnd = new Date(today);
  while (cur <= gridEnd) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(isoDate(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  function cellColor(val) {
    if (!val) return isDark ? 'bg-[#2a2a2a]' : 'bg-slate-200';
    const ratio = val / maxVal;
    if (ratio > 0.8) return 'bg-green-700';
    if (ratio > 0.6) return 'bg-green-600';
    if (ratio > 0.4) return 'bg-green-500';
    if (ratio > 0.2) return 'bg-green-400';
    return isDark ? 'bg-green-800' : 'bg-green-200';
  }

  const weekLabels = weeks.map(w => new Date(w[0]).getDate());

  return (
    <div className="bg-white rounded-2xl border p-5"
      style={isDark ? { backgroundColor: '#141414', borderColor: '#2a2a2a', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' } : {}}>
      <p className="font-bold text-slate-800 dark:text-white text-sm">Peak Days</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">Sales heatmap — last 10 weeks</p>

      <div className="flex gap-2">
        <div className="flex flex-col gap-1 pt-5">
          {DOW_LABELS.map(d => (
            <div key={d} className="h-4 flex items-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 w-7">{d}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-1 mb-1">
            {weekLabels.map((lbl, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{lbl}</span>
              </div>
            ))}
          </div>
          {DOW_LABELS.map((_, rowIdx) => (
            <div key={rowIdx} className="flex gap-1 mb-1">
              {weeks.map((week, wIdx) => {
                const dateKey = week[rowIdx];
                const val     = map[dateKey] ?? 0;
                return (
                  <div key={wIdx} title={dateKey + (val ? ` · Rs. ${val.toFixed(0)}` : '')}
                    className={`flex-1 h-4 rounded-sm cursor-default transition-opacity hover:opacity-80 ${cellColor(val)}`} />
                );
              })}
            </div>
          ))}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Less</span>
            {[isDark?'bg-[#2a2a2a]':'bg-slate-200', isDark?'bg-green-800':'bg-green-200','bg-green-400','bg-green-500','bg-green-700'].map(c => (
              <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
            <span className="text-[10px] text-slate-500 dark:text-slate-400">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const METHOD_BADGE = {
  cash:   'bg-emerald-100 text-emerald-700',
  card:   'bg-blue-100 text-blue-700',
  credit: 'bg-red-100 text-red-600',
  split:  'bg-purple-100 text-purple-700',
  qr:     'bg-indigo-100 text-indigo-700',
};
const METHOD_TOTAL = {
  cash:   'text-emerald-600',
  card:   'text-blue-600',
  credit: 'text-red-500',
  split:  'text-purple-600',
  qr:     'text-indigo-600',
};
const todayStr = new Date().toDateString();

// ─── Recent Sales ─────────────────────────────────────────────────────────────
function RecentSales({ sales, onView, isDark }) {
  const { t } = useLocale();
  return (
    <div className="min-h-[220px] bg-white rounded-2xl border p-5"
      style={isDark ? { backgroundColor: '#141414', borderColor: '#2a2a2a', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' } : {}}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-slate-800 text-sm">{t('dash.recent_sales')}</p>
        <button onClick={onView} className="text-xs font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1">
          {t('dash.view_all')}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      {!sales?.length ? (
        <p className="text-sm text-slate-500 text-center py-6">{t('dash.no_sales')}</p>
      ) : (
        <div className="space-y-1.5">
          {(sales.slice(0, 5)).map(s => {
            const isToday = new Date(s.created_at).toDateString() === todayStr;
            const method  = s.payment_method || s.method || 'cash';
            const totalCls = METHOD_TOTAL[method] || 'text-green-600';
            const badgeCls = METHOD_BADGE[method] || 'bg-slate-100 text-slate-600';
            return (
              <div key={s.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${isToday ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${isToday ? 'bg-blue-600' : 'bg-slate-400'}`}>
                  {s.user_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-blue-600 truncate">{s.invoice_no}</p>
                    {isToday && <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full shrink-0">TODAY</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-500">{s.user_name}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${badgeCls}`}>{method}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${totalCls}`}>{fmtRs(s.total)}</p>
                  <p className="text-xs text-slate-400">{timeStr(s.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Fast Moving ──────────────────────────────────────────────────────────────
const BAR_COLORS = [
  { bar: '#f97316', sold: 'text-orange-500', rank: 'bg-orange-500' },
  { bar: '#3b82f6', sold: 'text-blue-500',   rank: 'bg-blue-500' },
  { bar: '#8b5cf6', sold: 'text-violet-500', rank: 'bg-violet-500' },
  { bar: '#10b981', sold: 'text-emerald-500',rank: 'bg-emerald-500' },
  { bar: '#ec4899', sold: 'text-pink-500',   rank: 'bg-pink-500' },
];
const getColor = i => BAR_COLORS[i % BAR_COLORS.length];

function FastMoving({ items, isDark }) {
  const { t } = useLocale();
  const max = Math.max(...(items || []).map(i => parseInt(i.total_qty)), 1);
  return (
    <div className="min-h-[350px] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-base">🔥</div>
          <p className="font-bold text-slate-800 text-sm">{t('pos.fast_moving')}</p>
        </div>
        <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{t('lbl.this_month')}</span>
      </div>

      {!items?.length ? (
        <p className="text-sm text-slate-400 text-center py-10">{t('lbl.no_data')}</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {items.map((item, i) => {
            const c = getColor(i);
            const pct = Math.round((parseInt(item.total_qty) / max) * 100);
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors">
                {/* Rank badge */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i < 3 ? c.rank : 'bg-slate-200'}`}>
                  <span className="text-[10px] font-black text-white">{i + 1}</span>
                </div>

                {/* Product image/icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-slate-100">
                  {item.image
                    ? <img src={item.image} alt="" className="w-full h-full object-cover" />
                    : <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  }
                </div>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate leading-tight">{item.product_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 shrink-0">{item.bill_count} bills</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: c.bar }} />
                    </div>
                  </div>
                </div>

                {/* Sold count */}
                <span className={`text-xs font-extrabold shrink-0 ${c.sold}`}>{item.total_qty}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const role = useSelector(selectRole);
  if (role === 'manager') return <ManagerDashboard />;

  const { data, isLoading } = dashboardApi.useGetDashboardQuery();
  const navigate = useNavigate();
  const { t } = useLocale();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">{t('lbl.loading')}</div>
  );

  const today = new Date();
  const dates = [2, 1, 0].map(n => {
    const d = new Date(today); d.setDate(today.getDate() - n); return isoDate(d);
  });

  const icons = {
    dollar: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    chart:  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    box:    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
    alert:  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
    pos:      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4H9m0 0a2 2 0 000 4h6a2 2 0 000-4M9 3h6"/></svg>,
    product:  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
    purchase: <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>,
    report:   <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5 min-h-screen" style={{ backgroundColor: isDark ? '#1c1c1c' : '#e5e7eb' }}>

      {/* Row 1: Stats + Chart */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-4 items-stretch">
        <div className="md:col-span-2 grid grid-cols-2 gap-2 sm:gap-3 auto-rows-fr">
          <StatCard label={t('dash.today_sales')} icon={icons.dollar}
            gradient="bg-gradient-to-br from-emerald-500 to-green-700"
            value={fmtRs(data?.todaySales)} sub={`${data?.todayBills || 0} bills today`} isDark={isDark} />
          <StatCard label={t('dash.month_sales')} icon={icons.chart}
            gradient="bg-gradient-to-br from-blue-500 to-blue-700"
            value={fmtRs(data?.monthSales)} sub={`${data?.monthBills || 0} bills this month`} isDark={isDark} />
          <StatCard label={t('dash.total_products')} icon={icons.box}
            gradient="bg-gradient-to-br from-violet-500 to-purple-700"
            value={data?.totalProducts ?? 0} sub="active products" isDark={isDark} />
          <StatCard label={t('dash.low_stock')} icon={icons.alert}
            gradient="bg-gradient-to-br from-rose-500 to-red-700"
            value={data?.lowStockCount ?? 0} sub="needs attention" isDark={isDark} />
        </div>
        <div className="md:col-span-3 h-full">
          <HourlyChart hourlySales={data?.hourlySales || []} dates={dates} isDark={isDark} />
        </div>
      </div>

      {/* Recent Sales + Quick Actions (left) | Fast Moving (right) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-4 items-start">
        <div className="md:col-span-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <QuickBtn label={t('btn.new_sale')}     icon={icons.pos}      color="bg-white border-blue-100 text-blue-700 hover:bg-blue-50"      iconBg="bg-blue-600"    onClick={() => navigate('/sales/create')} />
            <QuickBtn label={t('btn.new_product')}  icon={icons.product}  color="bg-white border-purple-100 text-purple-700 hover:bg-purple-50" iconBg="bg-purple-600"  onClick={() => navigate('/products/create')} />
            <QuickBtn label={t('btn.new_purchase')} icon={icons.purchase} color="bg-white border-emerald-100 text-emerald-700 hover:bg-emerald-50" iconBg="bg-emerald-600" onClick={() => navigate('/purchases/create')} />
            <QuickBtn label={t('btn.report')}       icon={icons.report}   color="bg-white border-orange-100 text-orange-700 hover:bg-orange-50" iconBg="bg-orange-500"  onClick={() => navigate('/reports')} />
          </div>
          <RecentSales sales={data?.recentSales} onView={() => navigate('/sales')} isDark={isDark} />
        </div>
        <div className="md:col-span-2">
          <FastMoving items={data?.fastMoving} isDark={isDark} />
        </div>
      </div>

    </div>
  );
}
