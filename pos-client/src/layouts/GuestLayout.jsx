import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// ── Tutorial videos ──────────────────────────────────────────────────────────
// Fill in the `id` field with the YouTube video ID when ready (e.g. 'dQw4w9WgXcQ')
const TUTORIALS = [
  { id: 'Pt5_gFnHugc', title: 'Login & Getting Started',  si_title: 'ලොගින් සහ ආරම්භය',              desc: 'How to sign in to the system',        si_desc: 'පද්ධතියට ඇතුල් වන ආකාරය'           },
  { id: 'H21_cwd4rnU', title: 'Settings',                 si_title: 'සැකසුම්',                        desc: 'Configure your POS settings',         si_desc: 'POS සැකසුම් සකස් කරන්න'            },
  { id: '6stflHu-kLc', title: 'Add Product & Category',   si_title: 'නිෂ්පාදන සහ වර්ගය එකතු කිරීම', desc: 'Add new products and categories',      si_desc: 'නව නිෂ්පාදන සහ වර්ග එකතු කරන්න'  },
  { id: '1ImnZkjY04A', title: 'Add Supplier & Goods',     si_title: 'සැපයුම්කරු සහ භාණ්ඩ එකතු කිරීම', desc: 'Manage suppliers and incoming goods',  si_desc: 'සැපයුම්කරුවන් සහ භාණ්ඩ කළමනාකරණය' },
  { id: 'Ld3AbVIbYpY', title: 'Billing',                  si_title: 'බිල්පත් කිරීම',                 desc: 'Process customer bills and payments',  si_desc: 'ගනුදෙනුකරු බිල්පත් සකසන්න'         },
  { id: 'TNT8UnF9Wtw', title: 'Sale History',             si_title: 'විකිණුම් ඉතිහාසය',              desc: 'View and manage past sales records',   si_desc: 'පසුගිය විකිණුම් වාර්තා බලන්න'       },
];

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

function VideoModal({ video, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div className="w-full max-w-6xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{video.title} <span className="text-blue-200/60 font-normal text-base">· {video.si_title}</span></h3>
            <p className="text-blue-300 text-sm mt-0.5">{video.desc} · {video.si_desc}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0 ml-4"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Video */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black" style={{ aspectRatio: '16/9' }}>
          {video.id ? (
            <iframe
              src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
              title={video.title}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Coming Soon</p>
                <p className="text-white/50 text-sm mt-1">This tutorial is being prepared</p>
              </div>
            </div>
          )}
        </div>

        {/* Close hint */}
        <p className="text-center text-white/30 text-xs mt-4">Press Esc or click outside to close</p>
      </div>
    </div>
  );
}

export default function GuestLayout({ children }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);

  const openVideo = useCallback(video => setActiveVideo(video), []);
  const closeVideo = useCallback(() => setActiveVideo(null), []);

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
      {activeVideo && <VideoModal video={activeVideo} onClose={closeVideo} />}
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
        <div className="relative z-10 flex flex-col items-center text-center px-10 w-full mt-10">
          <div className="mb-5">
            <img src="/icon-new.jpg" alt="LMUC POS"
              className="w-20 h-20 rounded-2xl object-cover shadow-2xl"
              style={{ boxShadow: '0 0 30px rgba(59,130,246,0.5), 0 8px 32px rgba(0,0,0,0.4)' }} />
          </div>

          <p className="text-blue-300 text-sm leading-relaxed max-w-xs mb-8 min-h-[40px]">
            <Typewriter />
          </p>

          {/* Tutorial Videos */}
          <div className="mt-6 w-full rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shrink-0 shadow-md">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">Video Tutorials <span className="text-blue-200/60 font-normal text-xs">· වීඩියෝ නිබන්ධන</span></p>
                <p className="text-blue-300/60 text-xs mt-0.5">Learn how to use the POS system · POS පද්ධතිය ඉගෙන ගන්න</p>
              </div>
            </div>
            {/* List */}
            <div className="px-3 pb-3 flex flex-col gap-1.5">
              {TUTORIALS.map((v, i) => (
                <button
                  key={i}
                  onClick={() => openVideo(v)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: v.id ? 'rgba(239,68,68,0.85)' : 'rgba(255,255,255,0.15)' }}>
                    <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{v.title}</p>
                    <p className="text-blue-200/50 text-xs truncate">{v.si_title}</p>
                    <p className="text-blue-300/40 text-[10px] truncate">{v.desc} · {v.si_desc}</p>
                  </div>
                  {!v.id && (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                      Soon
                    </span>
                  )}
                </button>
              ))}
            </div>
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

        <div className="w-full max-w-lg flex flex-col gap-4">
          {children}

          {/* Lumac footer */}
          <div className="flex flex-col items-center gap-1 pt-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Powered by</p>
            <p className="font-bold text-sm" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>Lumac Solutions</p>
            <a href="tel:0764643050"
              className="flex items-center gap-1.5 text-blue-500 font-semibold text-sm hover:text-blue-600 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              076 464 3050
            </a>
            <a href="https://www.lumac.lk" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 text-xs hover:text-blue-500 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>
              </svg>
              www.lumac.lk
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
