import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const TAGLINES = [
  'Fast, reliable sales management for your business.',
  'Sell smarter — track stock, sales & customers in one place.',
  'Built for Sri Lankan businesses. Works offline too.',
  'From checkout to reports, everything in one screen.',
  'Real-time insights. Zero complexity. Full control.',
  'Your shop, your data — always at your fingertips.',
];

function Typewriter({ speed = 45, pause = 1800, eraseSpeed = 25 }) {
  const [displayed, setDisplayed] = useState('');
  const [idx, setIdx]             = useState(0);
  const [erasing, setErasing]     = useState(false);

  useEffect(() => {
    const text = TAGLINES[idx];
    if (!erasing) {
      if (displayed.length < text.length) {
        const id = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
        return () => clearTimeout(id);
      } else {
        const id = setTimeout(() => setErasing(true), pause);
        return () => clearTimeout(id);
      }
    } else {
      if (displayed.length > 0) {
        const id = setTimeout(() => setDisplayed(displayed.slice(0, -1)), eraseSpeed);
        return () => clearTimeout(id);
      } else {
        setErasing(false);
        setIdx(i => (i + 1) % TAGLINES.length);
      }
    }
  }, [displayed, erasing, idx, speed, pause, eraseSpeed]);

  return (
    <span>
      {displayed}
      <span className="inline-block w-0.5 h-4 bg-blue-300 ml-0.5 align-middle animate-pulse" />
    </span>
  );
}

export default function GuestLayout({ children }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstallPrompt(null); setInstalled(true); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setInstalled(true); }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden md:flex md:w-[45%] lg:w-[40%] flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%)' }}>

        <style>{`
          @keyframes blobFloat1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33%       { transform: translate(40px, -30px) scale(1.12); }
            66%       { transform: translate(-20px, 35px) scale(0.92); }
          }
          @keyframes blobFloat2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33%       { transform: translate(-35px, 30px) scale(1.15); }
            66%       { transform: translate(30px, -20px) scale(0.9); }
          }
          @keyframes blobFloat3 {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50%       { transform: scale(1.3); opacity: 0.9; }
          }
          @keyframes blobFloat4 {
            0%, 100% { transform: translate(0,0) scale(1); opacity:0.4; }
            50%       { transform: translate(20px,-20px) scale(1.2); opacity:0.7; }
          }
          @keyframes particleRise {
            0%        { opacity: 0; transform: translateY(0) scale(0.5); }
            20%       { opacity: 0.9; }
            80%       { opacity: 0.6; }
            100%      { opacity: 0; transform: translateY(-80px) scale(1.2); }
          }
          @keyframes shimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
        `}</style>

        {/* Large vivid blobs */}
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 420, height: 420, top: '-120px', left: '-120px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0.15) 50%, transparent 70%)',
            animation: 'blobFloat1 7s ease-in-out infinite', filter: 'blur(2px)' }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 380, height: 380, bottom: '-100px', right: '-100px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(99,102,241,0.15) 50%, transparent 70%)',
            animation: 'blobFloat2 9s ease-in-out infinite', filter: 'blur(2px)' }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 260, height: 260, top: '45%', left: '55%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.45) 0%, transparent 65%)',
            animation: 'blobFloat3 11s ease-in-out infinite' }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 200, height: 200, top: '15%', right: '5%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 65%)',
            animation: 'blobFloat4 8s ease-in-out infinite' }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 180, height: 180, bottom: '25%', left: '5%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 65%)',
            animation: 'blobFloat2 13s ease-in-out infinite reverse' }} />


        {/* Floating particles */}
        {[
          { size: 6,  top: '12%', left: '18%', delay: '0s',   dur: '4s'  },
          { size: 4,  top: '75%', left: '12%', delay: '0.8s', dur: '5s'  },
          { size: 7,  top: '38%', left: '82%', delay: '1.6s', dur: '4.5s'},
          { size: 5,  top: '82%', left: '68%', delay: '0.3s', dur: '6s'  },
          { size: 5,  top: '22%', left: '65%', delay: '2.2s', dur: '4s'  },
          { size: 3,  top: '58%', left: '38%', delay: '1.1s', dur: '5.5s'},
          { size: 8,  top: '90%', left: '35%', delay: '0.6s', dur: '5s'  },
          { size: 4,  top: '5%',  left: '50%', delay: '3s',   dur: '4s'  },
          { size: 6,  top: '50%', left: '5%',  delay: '1.8s', dur: '6s'  },
        ].map((p, i) => (
          <div key={i} className="absolute rounded-full bg-white pointer-events-none"
            style={{ width: p.size, height: p.size, top: p.top, left: p.left,
              boxShadow: '0 0 6px 2px rgba(255,255,255,0.6)',
              animation: `particleRise ${p.dur} ease-in-out ${p.delay} infinite` }} />
        ))}

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ opacity: 0.07,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '40px 40px' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-10 w-full">
          <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center mb-5 shadow-2xl"
            style={{ boxShadow: '0 0 30px rgba(59,130,246,0.5), 0 8px 32px rgba(0,0,0,0.4)' }}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4H9m0 0a2 2 0 000 4h6a2 2 0 000-4M9 3h6"/>
            </svg>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1"
            style={{ textShadow: '0 0 30px rgba(147,197,253,0.6)' }}>
            Point of Sale
          </h1>
          <p className="text-blue-300 text-sm leading-relaxed max-w-xs mb-8 min-h-[40px]">
            <Typewriter />
          </p>

          <div className="flex flex-col gap-2.5 w-full max-w-[230px]">
            {[
              { icon: '⚡', text: 'Fast checkout',      color: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.3)'  },
              { icon: '📊', text: 'Real-time reports',  color: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)'  },
              { icon: '🔒', text: 'Offline capable',    color: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)'  },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3 rounded-xl px-4 py-3 backdrop-blur-sm"
                style={{ backgroundColor: f.color, border: `1px solid ${f.border}` }}>
                <span className="text-xl">{f.icon}</span>
                <span className="text-white text-sm font-semibold">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Lumac Solutions footer */}
          <div className="mt-10 pt-6 border-t border-white/10 w-full max-w-[230px] flex flex-col items-center gap-1.5">
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Powered by</p>
            <p className="text-white font-bold text-base tracking-wide"
              style={{ textShadow: '0 0 20px rgba(147,197,253,0.5)' }}>
              Lumac Solutions
            </p>
            <a href="tel:0764643050"
              className="flex items-center gap-1.5 text-blue-200 font-bold hover:text-white transition-colors"
              style={{ fontSize: '1.05rem' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              076 464 3050
            </a>
            <a href="https://www.lumac.lk" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold hover:text-white transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>
              </svg>
              www.lumac.lk
            </a>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative transition-colors duration-300"
        style={{ backgroundColor: isDark ? '#111827' : '#e5e7eb' }}>

        {/* Top-right controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* PWA install button — always visible unless already installed */}
          {!installed && (
            <button onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all"
              style={isDark
                ? { backgroundColor: '#1f2937', borderColor: '#374151', color: '#60a5fa' }
                : { backgroundColor: '#fff', borderColor: '#bfdbfe', color: '#2563eb' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Install App
            </button>
          )}

          {/* Theme toggle */}
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all"
            style={isDark
              ? { backgroundColor: '#1f2937', borderColor: '#374151', color: '#d1d5db' }
              : { backgroundColor: '#fff', borderColor: '#d1d5db', color: '#475569' }}>
            {isDark ? (
              <>
                <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm7-5a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM3 11a1 1 0 110 2H2a1 1 0 110-2h1zm15.657-6.243a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM6.757 17.657a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM20 19.071a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707A1 1 0 0120 19.07zM5.05 6.464a1 1 0 01-1.414 1.414l-.707-.707A1 1 0 014.343 5.757l.707.707zM12 20a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"/>
                </svg>
                Light mode
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/>
                </svg>
                Dark mode
              </>
            )}
          </button>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
          {children}

          {/* Watch Tutorial */}
          <div className="rounded-2xl border p-4 flex items-center gap-4 transition-colors"
            style={isDark ? { backgroundColor: '#1f2937', borderColor: '#374151' } : { backgroundColor: '#fff', borderColor: '#e2e8f0' }}>
            <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center shrink-0 shadow-md">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>Watch System Tutorial</p>
              <p className="text-xs text-slate-400 mt-0.5">Learn how to use the POS system</p>
            </div>
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-600 border border-amber-200">
              Coming Soon
            </span>
          </div>

          {/* Store buttons */}
          <div className="flex gap-2 justify-center">
            <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 opacity-50 cursor-not-allowed"
              style={isDark ? { borderColor: '#374151', backgroundColor: '#1f2937' } : { borderColor: '#e2e8f0', backgroundColor: '#fff' }}>
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                <path d="M3.18 23.76c.3.17.64.24.99.19l12.6-12.6-3.18-3.18L3.18 23.76zm16.29-13.77l-2.32-1.35L14 11.79l3.5 3.5 2.0-1.16c.67-.39.67-1.36-.03-1.74zM3.01.55C2.7.87 2.5 1.37 2.5 2.01v19.98c0 .64.2 1.14.51 1.46l.08.07 11.2-11.2v-.26L3.09.48.01.55zm8.49 8.49l-8-8 .08-.07c.3-.17.64-.24.99-.19l12.6 12.6-3.18 3.18-2.49-7.52z"/>
              </svg>
              <span className="text-xs font-semibold" style={{ color: isDark ? '#94a3b8' : '#475569' }}>Google Play</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 opacity-50 cursor-not-allowed"
              style={isDark ? { borderColor: '#374151', backgroundColor: '#1f2937' } : { borderColor: '#e2e8f0', backgroundColor: '#fff' }}>
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span className="text-xs font-semibold" style={{ color: isDark ? '#94a3b8' : '#475569' }}>App Store</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
