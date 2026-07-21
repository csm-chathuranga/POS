import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LOCALES = ['si', 'en', 'ta'];

const LocaleContext = createContext(null);

function getStoredLocale() {
  const stored = localStorage.getItem('locale');
  return LOCALES.includes(stored) ? stored : 'en';
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(getStoredLocale);

  // Sync from DB on mount — sets the locale to whatever is saved in settings
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    fetch(`${apiUrl}/api/settings/public`)
      .then(r => r.json())
      .then(data => {
        const lang = data?.interface_language;
        if (lang && LOCALES.includes(lang)) {
          setLocaleState(lang);
          localStorage.setItem('locale', lang);
        }
      })
      .catch(() => {});
  }, []);

  function t(key) {
    return translations[locale]?.[key]
      ?? translations['en']?.[key]
      ?? key;
  }

  function setLocale(lang) {
    if (!LOCALES.includes(lang)) return;
    setLocaleState(lang);
    localStorage.setItem('locale', lang);
  }

  return (
    <LocaleContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
