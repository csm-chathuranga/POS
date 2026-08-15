/**
 * offlineQueue — saves sales to IndexedDB when the server is unreachable.
 * Each entry gets a client_id (UUID) used as an idempotency key when syncing.
 */
import db from '../db/localDb';

export const OFFLINE_LIMIT = 5;

function generateClientId() {
  return 'offline_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

/**
 * Save a completed sale to the offline queue.
 * Returns a receipt-shaped object so the POS can show a receipt immediately.
 */
export async function enqueueOfflineSale(saleData) {
  const client_id  = generateClientId();
  const created_at = new Date().toISOString();

  await db.offlineQueue.add({
    client_id,
    type:       'sale',
    status:     'pending',
    created_at,
    payload:    { ...saleData, client_id },
  });

  return {
    id:         null,
    client_id,
    invoice_no: 'OFFLINE-' + client_id.slice(8).toUpperCase(),
    total:      saleData.total,
    paid:       saleData.paid,
    balance:    saleData.balance,
    status:     'pending_sync',
    created_at,
    _offline:   true,
  };
}

/** Counts only pending sales — used for the SyncBlocker / POS limit. */
export async function getPendingCount() {
  const items = await db.offlineQueue.where('status').equals('pending').toArray();
  return items.filter(i => i.type === 'sale').length;
}

/** Returns only pending sale items. */
export async function getPendingItems() {
  const items = await db.offlineQueue.where('status').equals('pending').toArray();
  return items.filter(i => i.type === 'sale');
}

/** Returns every offline invoice (pending, synced, failed), newest first. */
export async function getAllOfflineItems() {
  const items = await db.offlineQueue.toArray();
  return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function markSynced(localId, serverId) {
  await db.offlineQueue.update(localId, {
    status:    'synced',
    server_id: serverId,
    synced_at: new Date().toISOString(),
  });
}

export async function markFailed(localId, error) {
  await db.offlineQueue.update(localId, { status: 'failed', error });
}

/**
 * Queue a new product for sync when back online.
 * Inserts a temporary entry into local Dexie so it appears in the offline list immediately.
 */
export async function enqueueProductCreate(data) {
  const client_id = generateClientId();
  await db.offlineQueue.add({
    client_id,
    type:       'product_create',
    status:     'pending',
    created_at: new Date().toISOString(),
    payload:    { ...data, client_id },
  });
  return client_id;
}

/**
 * Queue a product edit for sync when back online.
 * Also patches the local Dexie products table immediately so offline reads stay fresh.
 */
export async function enqueueProductEdit(id, data) {
  await db.offlineQueue.add({
    client_id:  generateClientId(),
    type:       'product_edit',
    status:     'pending',
    created_at: new Date().toISOString(),
    payload:    { id, ...data },
  });
  try { await db.products.update(id, data); } catch (e) { /* local cache best-effort */ }
}

export async function enqueueCategoryCreate(data) {
  const client_id = generateClientId();
  await db.offlineQueue.add({
    client_id,
    type:       'category_create',
    status:     'pending',
    created_at: new Date().toISOString(),
    payload:    { ...data, client_id },
  });
  return client_id;
}

export async function enqueueCategoryEdit(id, data) {
  await db.offlineQueue.add({
    client_id:  generateClientId(),
    type:       'category_edit',
    status:     'pending',
    created_at: new Date().toISOString(),
    payload:    { id, ...data },
  });
  await db.categories.update(id, data);
}

export async function enqueueCustomerCreate(data) {
  const client_id = generateClientId();
  await db.offlineQueue.add({
    client_id,
    type:       'customer_create',
    status:     'pending',
    created_at: new Date().toISOString(),
    payload:    { ...data, client_id },
  });
  return client_id;
}

export async function enqueueCustomerEdit(id, data) {
  await db.offlineQueue.add({
    client_id:  generateClientId(),
    type:       'customer_edit',
    status:     'pending',
    created_at: new Date().toISOString(),
    payload:    { id, ...data },
  });
  await db.customers.update(id, data);
}

export async function enqueueSupplierCreate(data) {
  const client_id = generateClientId();
  await db.offlineQueue.add({
    client_id,
    type:       'supplier_create',
    status:     'pending',
    created_at: new Date().toISOString(),
    payload:    { ...data, client_id },
  });
  return client_id;
}

export async function enqueueSupplierEdit(id, data) {
  await db.offlineQueue.add({
    client_id:  generateClientId(),
    type:       'supplier_edit',
    status:     'pending',
    created_at: new Date().toISOString(),
    payload:    { id, ...data },
  });
  await db.suppliers.update(id, data);
}

/**
 * Returns pending queue items whose type is in the given array.
 * Edit entries are deduplicated by their target ID (latest wins).
 * For creates: id = client_id (no server record yet).
 * For edits:   id = payload.id (server record ID, enables dedup with base list).
 */
const EDIT_TYPES = new Set(['product_edit', 'category_edit', 'customer_edit', 'supplier_edit']);

export async function getPendingQueueByTypes(types) {
  const items = await db.offlineQueue.where('status').equals('pending').toArray();
  const filtered = items.filter(i => types.includes(i.type));

  // Deduplicate edit entries for the same target — keep the latest
  const editMap = new Map();
  const creates = [];
  for (const item of filtered) {
    if (EDIT_TYPES.has(item.type)) {
      editMap.set(item.payload.id, item);
    } else {
      creates.push(item);
    }
  }

  return [...creates, ...editMap.values()].map(i => ({
    ...i.payload,
    _queueId:   i.id,
    _queueType: i.type,
    _pending:   true,
    id: EDIT_TYPES.has(i.type) ? i.payload.id : i.client_id,
  }));
}

/** Deletes every item from the offline queue. Use to clear stuck/corrupt entries. */
export async function clearOfflineQueue() {
  await db.offlineQueue.clear();
}

/** Deletes only non-sale pending/failed items (category, product, customer, supplier). */
export async function clearNonSalePending() {
  const items = await db.offlineQueue.toArray();
  const ids = items.filter(i => i.type !== 'sale').map(i => i.id);
  await db.offlineQueue.bulkDelete(ids);
}

export async function requeueFailed() {
  const failed = await db.offlineQueue.where('status').equals('failed').toArray();
  for (const item of failed) {
    await db.offlineQueue.update(item.id, { status: 'pending', error: null });
  }
  return failed.length;
}
