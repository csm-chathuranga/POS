# SMS Module Implementation Plan

## Design Principles

- **Pluggable** — zero changes to existing sale/purchase flow logic; SMS fires as fire-and-forget after sale commits
- **Table migration on enable only** — `ensureSmsTables()` runs once when admin toggles ON; no destructive action on toggle OFF
- **Own config table** — API credentials stored in `sms_config` table (not the generic `settings` table)
- **`insertsFeature: true`** — module toggle adds "SMS Center" to the sidebar nav; removing the feature row on disable is already handled by the existing toggle machinery
- **SMS Center page** — single page in sidebar that contains config, logs, and manual send

---

## Module Registry Change

**`pos-api/src/config/modules.js`** — update the existing `sms` entry:

```js
{
  key: 'sms',
  label: 'SMS Receipts',
  description: 'Send SMS receipts to customers after each sale (SMSGenz)',
  insertsFeature: true,                  // was false
  feature: {
    key: 'sms',
    label: 'SMS Center',
    path: '/sms',
    group: 'finance',
    sort_order: 50,
    icon: 'message-square',
    offline_ok: false,
  },
},
```

---

## Database — New Tables (created on module enable)

### `sms_config`
Stores API credentials and message templates. One row per tenant.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `api_user` | VARCHAR(191) | SMSGenz username |
| `api_password` | VARCHAR(191) | SMSGenz password |
| `sender_id` | VARCHAR(50) | Approved sender name |
| `receipt_template` | TEXT | e.g. `Dear {customer}, receipt {invoice_no} total Rs.{total}. Thank you!` |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP |

**Template variables:** `{customer}` `{invoice_no}` `{total}` `{date}` `{store_name}`

### `sms_logs`
Immutable audit log of every SMS attempt.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `sale_id` | BIGINT UNSIGNED NULL | FK to sales (NULL for manual sends) |
| `phone` | VARCHAR(50) | Destination number |
| `message` | TEXT | Full message sent |
| `status` | ENUM('sent','failed') | |
| `error` | TEXT NULL | Provider error message if failed |
| `sent_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

## Backend Files

### `pos-api/src/lib/sms.js` *(new)*

Three exports:

1. **`ensureSmsTables(sequelize)`** — `CREATE TABLE IF NOT EXISTS` for both tables above. Safe to re-run.
2. **`sendSms(config, phone, message)`** — HTTP POST to SMSGenz endpoint. Returns `{ ok, error }`. Never throws — caller decides what to do with failure.
3. **`getConfig(models)`** — reads one row from `sms_config`; returns null if not configured.

### `pos-api/src/routes/sms.js` *(new)*

Gated by `requireModule('sms')` middleware (same pattern as `coop-city.js`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sms/config` | Return current `sms_config` row (password masked) |
| `POST` | `/api/sms/config` | Upsert `sms_config` row |
| `POST` | `/api/sms/test` | Send test SMS; log to `sms_logs` |
| `GET` | `/api/sms/logs` | Paginated `sms_logs` list |

### `pos-api/src/routes/admin-modules.js` — EDIT line ~45

Add alongside existing `coop_city` block:

```js
if (newValue && mod.key === 'sms') {
  await require('../lib/sms').ensureSmsTables(req.db);
}
// Nothing extra on disable — feature row removal is handled by insertsFeature machinery below
```

### `pos-api/src/models/index.js` — EDIT

Add two Sequelize model definitions and export them:
- `SmsConfig` → `sms_config`
- `SmsLog` → `sms_logs`

### `pos-api/src/app.js` — EDIT

```js
app.use('/api/sms', require('./routes/sms'));
```

### Sale route — EDIT (fire-and-forget, non-breaking)

After the sale transaction commits, append:

```js
// SMS receipt — pluggable, never blocks the response
Setting.findOne({ where: { key: 'module.sms.enabled' } }).then(async s => {
  if (s?.value !== 'true') return;
  const cfg = await sms.getConfig(req.models);
  if (!cfg || !sale.customer?.phone) return;
  const msg = `Receipt ${sale.invoice_no} | Total: ${sale.total}. Thank you!`;
  const { ok, error } = await sms.sendSms(cfg, sale.customer.phone, msg);
  await req.models.SmsLog.create({
    sale_id: sale.id, phone: sale.customer.phone,
    message: msg, status: ok ? 'sent' : 'failed', error: error || null,
  });
}).catch(() => {}); // fire-and-forget

res.status(201).json(sale); // already sent, SMS runs in background
```

---

## Frontend Files

### `pos-client/src/features/sms/smsApi.js` *(new)*

RTK Query endpoints:
- `useGetSmsConfigQuery`
- `useSaveSmsConfigMutation`
- `useTestSmsMutation`
- `useGetSmsLogsQuery`

### `pos-client/src/pages/sms/Index.jsx` *(new)*

Single "SMS Center" page with two sections:

**Section 1 — Configuration** (visible always while on this page)
- API User field
- API Password field (masked)
- Sender ID field
- Save button
- Test SMS sub-section: phone input + "Send Test" button with result feedback

**Section 2 — SMS Logs**
- Table: Date | Phone | Invoice | Status | Error
- Pagination

### POS Checkout — "Save & Send SMS" button *(EDIT existing checkout component)*

When SMS module is enabled, a second action button appears beside "Print Bill & Complete Sale":

```
[ Clear ] [ Hold Bill ] [ F11 ] [ Save & Send SMS ]  [ Print Bill & Complete Sale F10 ]
```

**Behaviour:**
- Completes the sale identically to the print button (same API call)
- Instead of triggering `printReceipt`, fires `POST /api/sms/send-receipt` with `{ sale_id, phone }`
- If the selected customer has no phone on record, shows an inline phone input prompt before sending
- Shows a brief toast: "SMS sent to 07XXXXXXXX" or "SMS failed — saved anyway"
- Button only renders when `module.sms.enabled === true` (checked from the features/modules state already loaded in the app)

**Backend addition** — `POST /api/sms/send-receipt` in `pos-api/src/routes/sms.js`:
- Accepts `{ sale_id, phone }`, loads the sale, builds the message, calls `sendSms()`, writes to `sms_logs`
- Sale completion itself is NOT re-done here — the sale was already committed by the checkout flow

### `pos-client/src/pages/admin/Modules.jsx` — EDIT

No inline config fields needed in the module card — config lives in SMS Center. The sidebar nav link handles navigation once enabled.

### `pos-client/src/router/index.jsx` — EDIT

```js
{ path: '/sms', element: <SmsIndex /> }
```

---

## File Checklist

```
pos-api/src/lib/sms.js                       NEW
pos-api/src/routes/sms.js                    NEW
pos-api/src/models/index.js                  EDIT  (add SmsConfig, SmsLog)
pos-api/src/routes/admin-modules.js          EDIT  (add sms ensureTables block)
pos-api/src/app.js                           EDIT  (mount /api/sms)
pos-api/src/routes/sales.js                  EDIT  (fire-and-forget SMS after commit)
pos-client/src/features/sms/smsApi.js        NEW
pos-client/src/pages/sms/Index.jsx           NEW
pos-client/src/router/index.jsx              EDIT  (add /sms route)
pos-api/src/config/modules.js                EDIT  (insertsFeature true + feature obj)
pos-client/src/pages/pos/Checkout.jsx        EDIT  (add "Save & Send SMS" button)
pos-api/src/routes/sms.js                    EDIT  (add POST /send-receipt endpoint)
```

---

## What Does NOT Change

- Sale route response timing — SMS is fully async after `res.json()` is called
- Settings table — not used for SMS config at all
- Any existing module's toggle/migrate behavior
- `Modules.jsx` module card UI — no inline fields added there

---

## Open Question

Confirm SMSGenz API details before coding `sendSms()`:
- Endpoint URL (e.g. `https://app.smsgenz.lk/api/sendsms`)
- Auth fields: `user` + `password`, or a single bearer token?
- Is it GET or POST, and what format (form-data, JSON, query params)?
