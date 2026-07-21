import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const ConnectivityContext = createContext({
  isOnline: true,
  wasOffline: false,
  checkNow: () => {},
});

const API           = import.meta.env.VITE_API_URL;
const PING_INTERVAL = 15_000; // ms between background polls
const PING_TIMEOUT  = 5_000;  // ms before a ping is considered failed

async function pingServer() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT);
  try {
    await fetch(`${API}/api/ping`, { cache: 'no-store', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function ConnectivityProvider({ children }) {
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const intervalRef = useRef(null);

  const check = useCallback(async () => {
    if (!navigator.onLine) { setIsOnline(false); return; }
    const reachable = await pingServer();
    setIsOnline(reachable);
  }, []);

  useEffect(() => {
    const onOnline  = () => check();
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    intervalRef.current = setInterval(check, PING_INTERVAL);
    check();

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(intervalRef.current);
    };
  }, [check]);

  // Remember if we went offline at any point this session
  useEffect(() => {
    if (!isOnline) setWasOffline(true);
  }, [isOnline]);

  return (
    <ConnectivityContext.Provider value={{ isOnline, wasOffline, checkNow: check }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export const useConnectivity = () => useContext(ConnectivityContext);
