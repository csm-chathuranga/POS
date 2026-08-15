/**
 * cacheSync — pulls reference data from the live server into IndexedDB (Dexie).
 * Called on startup (if online) and whenever connectivity is restored.
 * Reads the auth token directly from the Redux store so it works outside React.
 */
import db from '../db/localDb';
import { store } from '../app/store';
import { logout } from '../features/auth/authSlice';
import { markSynced, markFailed } from './offlineQueue';
import { getApiUrl } from '../config/runtimeConfig';

const API = getApiUrl();

function headers() {
  const token = store.getState().auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchJSON(path) {
  const res = await fetch(`${API}/api${path}`, { headers: headers(), cache: 'no-store' });
  if (res.status === 401) {
    store.dispatch(logout());
    const err = new Error('Session expired');
    err.isAuthError = true;
    throw err;
  }
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

export async function syncProducts() {
  const data = await fetchJSON('/products/all');
  if (Array.isArray(data) && data.length) {
    await db.products.clear();
    await db.products.bulkPut(data);
    await db.settings.put({ key: '__products_synced_at', value: Date.now() });
  }
}

export async function syncCustomers() {
  const data = await fetchJSON('/customers');
  const list = Array.isArray(data) ? data : (data.customers ?? data.data ?? []);
  if (list.length) {
    await db.customers.clear();
    await db.customers.bulkPut(list);
    await db.settings.put({ key: '__customers_synced_at', value: Date.now() });
  }
}

export async function syncSettings() {
  const data = await fetchJSON('/settings');
  const entries = Object.entries(data).map(([key, value]) => ({ key, value }));
  if (entries.length) {
    // Merge — don't wipe internal __* keys
    await db.settings.bulkPut(entries);
    await db.settings.put({ key: '__settings_synced_at', value: Date.now() });
  }
}

export async function syncCategories() {
  const data = await fetchJSON('/categories');
  if (Array.isArray(data) && data.length) {
    await db.categories.clear();
    await db.categories.bulkPut(data);
  }
}

export async function syncSuppliers() {
  const data = await fetchJSON('/suppliers');
  if (Array.isArray(data) && data.length) {
    await db.suppliers.clear();
    await db.suppliers.bulkPut(data);
  }
}

export async function syncSales() {
  const data = await fetchJSON('/sales?limit=100');
  const list = Array.isArray(data) ? data : (data.data ?? []);
  if (list.length) {
    await db.sales.clear();
    await db.sales.bulkPut(list);
  }
}

export async function syncPurchases() {
  const data = await fetchJSON('/purchases?limit=100');
  const list = Array.isArray(data) ? data : (data.data ?? []);
  if (list.length) {
    await db.purchases.clear();
    await db.purchases.bulkPut(list);
  }
}

/** Sync everything. Resolves to { ok: true } or { ok: false, error }. */
export async function syncAll() {
  try {
    await Promise.all([
      syncProducts(), syncCustomers(), syncSettings(),
      syncCategories(), syncSuppliers(), syncSales(), syncPurchases(),
    ]);
    await db.settings.put({ key: '__last_full_sync', value: Date.now() });
    return { ok: true };
  } catch (err) {
    console.warn('[cacheSync] syncAll failed:', err.message);
    return { ok: false, error: err.message };
  }
}

/** Returns ms since last full sync, or null if never synced. */
export async function lastSyncAge() {
  const row = await db.settings.get('__last_full_sync');
  return row ? Date.now() - row.value : null;
}

/** Returns products from IndexedDB (offline fallback). */
export async function getLocalProducts() {
  return db.products.toArray();
}

/** Returns customers from IndexedDB (offline fallback). */
export async function getLocalCustomers() {
  return db.customers.toArray();
}

export async function getLocalCategories() {
  return db.categories.toArray();
}

export async function getLocalSuppliers() {
  return db.suppliers.toArray();
}

export async function getLocalSales() {
  return db.sales.orderBy('id').reverse().toArray();
}

export async function getLocalPurchases() {
  return db.purchases.orderBy('id').reverse().toArray();
}

function resolveEndpoint(item) {
  switch (item.type) {
    case 'product_edit':    return { method: 'PUT',  url: `${API}/api/products/${item.payload.id}` };
    case 'product_create':  return { method: 'POST', url: `${API}/api/products` };
    case 'category_edit':   return { method: 'PUT',  url: `${API}/api/categories/${item.payload.id}` };
    case 'category_create': return { method: 'POST', url: `${API}/api/categories` };
    case 'customer_edit':   return { method: 'PUT',  url: `${API}/api/customers/${item.payload.id}` };
    case 'customer_create': return { method: 'POST', url: `${API}/api/customers` };
    case 'supplier_edit':   return { method: 'PUT',  url: `${API}/api/suppliers/${item.payload.id}` };
    case 'supplier_create': return { method: 'POST', url: `${API}/api/suppliers` };
    default:                return { method: 'POST', url: `${API}/api/sales` };
  }
}

/**
 * Drains the offline sale queue by POSTing each pending item to the server.
 * Processes sequentially to preserve invoice order.
 * Stops on first network error so items remain pending for the next sync attempt.
 */
export async function syncOfflineQueue() {
  // Non-sale items (categories, customers, etc.) don't need strict ordering —
  // reset any previous failures so they are retried every sync attempt.
  await db.offlineQueue
    .where('status').equals('failed')
    .filter(i => i.type !== 'sale')
    .modify({ status: 'pending', error: null });

  const pending = await db.offlineQueue.where('status').equals('pending').sortBy('id');
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    const isSale = item.type === 'sale';
    try {
      const { method, url } = resolveEndpoint(item);
      const res = await fetch(url, {
        method,
        headers: headers(),
        body:    JSON.stringify(item.payload),
      });
      if (res.status === 401) {
        store.dispatch(logout());
        break; // session expired — abort entire sync, items stay pending
      }
      if (!res.ok) {
        const errText = await res.text();
        await markFailed(item.id, `HTTP ${res.status}: ${errText}`);
        failed++;
        if (isSale) break; // preserve sale order — stop on first sale failure
        continue;
      }
      const data = await res.json();
      await markSynced(item.id, data.id);
      // Replace temp offline entries with real server records
      if (item.type === 'product_create' && item.payload.client_id) {
        await db.products.delete(item.payload.client_id);
        if (data.id) await db.products.put({ ...data });
      }
      if (item.type === 'category_create' && item.payload.client_id) {
        await db.categories.delete(item.payload.client_id);
        if (data.id) await db.categories.put({ ...data });
      }
      if (item.type === 'customer_create' && item.payload.client_id) {
        await db.customers.delete(item.payload.client_id);
        if (data.id) await db.customers.put({ ...data });
      }
      if (item.type === 'supplier_create' && item.payload.client_id) {
        await db.suppliers.delete(item.payload.client_id);
        if (data.id) await db.suppliers.put({ ...data });
      }
      synced++;
    } catch (err) {
      // Network error
      await markFailed(item.id, err.message);
      failed++;
      if (isSale) break; // stop sale queue; non-sale items continue next iteration
      continue;
    }
  }

  return { synced, failed, remaining: pending.length - synced };
}
