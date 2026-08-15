import Dexie from 'dexie';

export const db = new Dexie('POS_OfflineDB');

db.version(1).stores({
  products:     'id, category_id, barcode, sku, name, is_fast_moving, active',
  customers:    'id, name, phone',
  settings:     'key',
  offlineQueue: '++id, &client_id, type, status, created_at',
  syncMap:      'client_id, server_id, type',
});

db.version(2).stores({
  categories: 'id, name',
  suppliers:  'id, name, phone',
  sales:      'id, invoice_no, created_at, status',
  purchases:  'id, grn_no, purchase_date, status',
});

export default db;
