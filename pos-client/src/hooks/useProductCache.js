import { useState, useEffect, useCallback } from 'react';
import { api } from '../app/baseApi';
import { store } from '../app/store';
import { db } from '../db/localDb';

const allApi = api.injectEndpoints({
  endpoints: build => ({
    getAllProducts: build.query({ query: () => '/products/all' }),
    getProductVersion: build.query({ query: () => '/products/version' }),
  }),
  overrideExisting: false,
});

const LS_KEY   = 'pos_products_v2';
const LS_VER   = 'pos_products_version';

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  } catch { return null; }
}

export default function useProductCache() {
  const [products, setProducts] = useState(() => loadFromStorage() || []);
  const [ready, setReady]       = useState(() => loadFromStorage()?.length > 0);

  const { data: serverVersion } = allApi.useGetProductVersionQuery(undefined, { pollingInterval: 60000 });

  const fetchAll = useCallback(async () => {
    const result = await store.dispatch(
      allApi.endpoints.getAllProducts.initiate(undefined, { forceRefetch: true })
    );
    if (result.data) {
      setProducts(result.data);
      setReady(true);
      localStorage.setItem(LS_KEY, JSON.stringify(result.data));
      localStorage.setItem(LS_VER, serverVersion?.version || '');
    } else {
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
        p.id === productId ? { ...p, stock_qty: Math.max(0, (p.stock_qty || 0) - qty) } : p
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
