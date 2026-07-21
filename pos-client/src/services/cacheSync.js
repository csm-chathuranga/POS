/**
 * cacheSync — pulls reference data from the live server into IndexedDB.
 * Called on startup (if online) and whenever connectivity is restored.
 * Reads the auth token directly from the Redux store so it works outside React.
 */
import db from '../db/localDb';
import { store } from '../app/store';
import { markSynced, markFailed } from './offlineQueue';

const API = import.meta.env.VITE_API_URL;

function headers() {
  const token = store.getState().auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchJSON(path) {
  const res = await fetch(`${API}/api${path}`, { headers: headers(), cache: 'no-store' });
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

/** Sync everything. Resolves to { ok: true } or { ok: false, error }. */
export async function syncAll() {
  try {
    await Promise.all([syncProducts(), syncCustomers(), syncSettings()]);
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

/**
 * Drains the offline sale queue by POSTing each pending item to the server.
 * Processes sequentially to preserve invoice order.
 * Stops on first network error so items remain pending for the next sync attempt.
 */
export async function syncOfflineQueue() {
  const pending = await db.offlineQueue.where('status').equals('pending').sortBy('id');
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const res = await fetch(`${API}/api/sales`, {
        method:  'POST',
        headers: headers(),
        body:    JSON.stringify(item.payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        await markFailed(item.id, `HTTP ${res.status}: ${errText}`);
        failed++;
        break; // stop on server error — preserve order
      }
      const data = await res.json();
      await markSynced(item.id, data.id);
      synced++;
    } catch (err) {
      // Network error — stop and retry later
      await markFailed(item.id, err.message);
      failed++;
      break;
    }
  }

  return { synced, failed, remaining: pending.length - synced };
}
