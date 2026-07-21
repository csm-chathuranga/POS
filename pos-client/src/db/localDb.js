import Dexie from 'dexie';

export const db = new Dexie('POS_OfflineDB');

db.version(1).stores({
  // Reference data — synced from server when online
  products:     'id, category_id, barcode, sku, name, is_fast_moving, active',
  customers:    'id, name, phone',
  settings:     'key',

  // Offline transaction queue
  offlineQueue: '++id, &client_id, type, status, created_at',

  // client_id → server_id mapping after sync
  syncMap:      'client_id, server_id, type',
});

export default db;
