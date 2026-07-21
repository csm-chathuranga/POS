/**
 * offlineQueue — saves sales to IndexedDB when the server is unreachable.
 * Each entry gets a client_id (UUID) used as an idempotency key when syncing.
 */
import db from '../db/localDb';

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

export async function getPendingCount() {
  return db.offlineQueue.where('status').equals('pending').count();
}

export async function getPendingItems() {
  return db.offlineQueue.where('status').equals('pending').toArray();
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
