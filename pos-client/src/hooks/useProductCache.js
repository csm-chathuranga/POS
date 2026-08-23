import { useState, useEffect, useCallback } from 'react';
import { api } from '../app/baseApi';
import { store } from '../app/store';
import { db } from '../db/localDb';
import { getApiUrl } from '../config/runtimeConfig';

const allApi = api.injectEndpoints({
  endpoints: build => ({
    getAllProducts: build.query({ query: () => '/products/all' }),
    getProductVersion: build.query({ query: () => '/products/version' }),
  }),
  overrideExisting: false,
});

const LS_KEY        = 'pos_products_v2';
const LS_VER        = 'pos_products_version';
const DEDUCT_EVENT  = 'pos-stock-deducted';

export function deductStockFromCache(items) {
  try {
    const stored = loadFromStorage();
    if (!stored || !Array.isArray(items) || !items.length) return;
    const updated = stored.map(p => {
      const sold = items.find(i => Number(i.product_id) === Number(p.id));
      if (!sold) return p;
      return { ...p, stock_qty: Math.max(0, parseFloat(p.stock_qty || 0) - parseFloat(sold.qty || 0)) };
    });
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(DEDUCT_EVENT));
  } catch {}
}

export function restoreStockToCache(items) {
  try {
    const stored = loadFromStorage();
    if (!stored || !Array.isArray(items) || !items.length) return;
    const updated = stored.map(p => {
      const ret = items.find(i => Number(i.product_id) === Number(p.id));
      if (!ret) return p;
      return { ...p, stock_qty: parseFloat(p.stock_qty || 0) + parseFloat(ret.qty || 0) };
    });
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(DEDUCT_EVENT));
  } catch {}
}

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  } catch { return null; }
}

export default function useProductCache() {
  const [products, setProducts] = useState(() => loadFromStorage() || []);
  const [ready, setReady]       = useState(() => loadFromStorage()?.length > 0);

  const { data: serverVersion } = allApi.useGetProductVersionQuery(undefined, {
    pollingInterval: 60000,
    refetchOnMountOrArgChange: true,
  });

  const fetchAll = useCallback(async () => {
    try {
      const token = store.getState().auth?.token;
      const resp  = await fetch(`${getApiUrl()}/api/products/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error('not ok');
      const data = await resp.json();
      setProducts(data);
      setReady(true);
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      localStorage.setItem(LS_VER, serverVersion?.version || '');
    } catch {
      // API unreachable (offline) — fall back to Dexie cache
      const local = await db.products.toArray();
      if (local.length > 0) {
        setProducts(local);
        setReady(true);
        localStorage.setItem(LS_KEY, JSON.stringify(local));
      }
    }
  }, [serverVersion]);

  useEffect(() => {
    const handler = () => {
      const fresh = loadFromStorage();
      if (fresh) setProducts(fresh);
    };
    window.addEventListener(DEDUCT_EVENT, handler);
    return () => window.removeEventListener(DEDUCT_EVENT, handler);
  }, []);

  useEffect(() => {
    const stored     = loadFromStorage();
    const storedVer  = localStorage.getItem(LS_VER) || '';
    const currentVer = serverVersion?.version || '';

    if (!stored || stored.length === 0) {
      fetchAll();
      return;
    }
    if (currentVer && storedVer !== currentVer) {
      fetchAll();
      return;
    }
    if (stored.length > 0 && !ready) {
      setProducts(stored);
      setReady(true);
    }
  }, [serverVersion, ready, fetchAll]);

  function deductStock(productId, qty) {
    setProducts(prev => {
      const updated = prev.map(p =>
        p.id === productId ? { ...p, stock_qty: Math.max(0, parseFloat(p.stock_qty || 0) - parseFloat(qty)) } : p
      );
      localStorage.setItem(LS_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  function invalidate() {
    localStorage.removeItem(LS_VER);
    fetchAll();
  }

  return { products, ready, deductStock, invalidate };
}

/** Call after a sync to bust the version stamp and force an immediate refetch. */
export function refreshProductCache() {
  localStorage.removeItem(LS_VER);
  store.dispatch(
    allApi.endpoints.getProductVersion.initiate(undefined, { forceRefetch: true })
  );
}
