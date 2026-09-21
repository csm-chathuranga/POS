import { useState, useEffect } from 'react';

export default function InstallPWA() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    const handler = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setPrompt(null); setInstalled(true); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (installed || !prompt) return null;

  return (
    <button
      onClick={async () => { prompt.prompt(); const { outcome } = await prompt.userChoice; if (outcome === 'accepted') setPrompt(null); }}
      title="Install app"
      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"/>
      </svg>
    </button>
  );
}
