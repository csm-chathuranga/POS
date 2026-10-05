# Plan: Multi-Batch Support for Same-Barcode Items

## Problem

Some physical stock items share the **same barcode** but arrive at different times with:
- Different **selling prices** (e.g., cost went up, new price sticker)
- Different **expiry dates** (older and newer batch both on the shelf)

The current system enforces one product row per barcode, with a single `expiry_date` and single price set. Receiving new stock overwrites both values, losing the previous batch's data.

---

## Goal

Support multiple active batches per barcode — each with its own price and expiry date — **without restructuring the existing products table or breaking any current workflow**.

---

## Approach: Add a `product_batches` Table

Introduce a lightweight `product_batches` table that sits *alongside* the existing `products` table. The product row continues to hold the canonical/default values. Batches are optional; most products will never use them.

### No breaking changes to existing behaviour:
- Products that never receive duplicate-barcode stock work exactly as today.
- The existing `products` table columns (`selling_price`, `expiry_date`, etc.) are untouched.
- No existing API contract changes — new endpoints are *additions*.

---

## New Table: `product_batches`

```
product_batches
────────────────────────────────────────────────────────
id              BIGINT UNSIGNED PK AUTO_INCREMENT
product_id      BIGINT UNSIGNED  FK → products.id
batch_label     VARCHAR(100)     e.g. "Batch 2025-10" or GRN ref
qty             DECIMAL(10,3)    remaining qty in this batch
cost_price      DECIMAL(10,2)
selling_price   DECIMAL(10,2)
expiry_date     DATE             nullable
received_at     DATE             when this batch was stocked in
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**Key rules:**
- A product has zero or more batches.
- Stock deduction at sale time hits the **oldest batch first** (FIFO by `received_at`).
- When all batch rows reach qty = 0, the system falls back to the product-level stock.
- `products.stock_qty` remains the total (sum of all batch qtys for products that use batches).

---

## Workflow Changes (Minimal)

### 1. Intake Page — receiving new stock

**Current flow:** scan barcode → fill qty / price / expiry → save (overwrites product row).

**New flow (when a batch with a different price/expiry is detected):**
1. Scan barcode → system finds the product as usual.
2. If the incoming `selling_price` or `expiry_date` differs from the current product values (or from any open batch), prompt: **"Different price/expiry detected — save as new batch?"**
3. If yes → create a new `product_batches` row; **do not overwrite** `products.selling_price` / `products.expiry_date`.
4. If no → overwrite the product row as today (existing behaviour preserved).

### 2. POS Scan — selling

**Current flow:** scan barcode → find product → add to cart with `selling_price`.

**New flow:**
1. Scan barcode → find product.
2. Check if the product has **more than one active batch** (qty > 0).
3. **One batch (or no batches):** add to cart exactly as today — zero UI change.
4. **Multiple batches:** show a small picker dialog:
   - Lists each batch with its label, price, expiry, and remaining qty.
   - Cashier selects the correct one (or the system auto-selects oldest by FIFO).
   - Selected batch price is used for the cart line.

### 3. Stock Deduction at Sale

When a sale is saved:
- If the product has active batches, deduct from the **oldest batch first** (FIFO).
- Update `products.stock_qty` as before (keep it as the running total).
- Record the `batch_id` on the sale line item for traceability.

---

## File-by-File Changes

### Backend (`pos-api`)

| File | Change |
|---|---|
| `src/models/index.js` | Add `ProductBatch` model definition (new table, no changes to existing models) |
| `src/migrations/` | Add a new migration file creating `product_batches` |
| `src/routes/products.js` | Add `GET /api/products/:id/batches` and `POST /api/products/:id/batches`; modify intake endpoint to accept optional batch creation |
| `src/routes/sales.js` | When saving a sale line, deduct from batch qty if applicable; store `batch_id` on sale item |

### Frontend (`pos-client`)

| File | Change |
|---|---|
| `src/pages/products/Intake.jsx` | Show "Save as new batch?" prompt when price/expiry differs |
| `src/features/products/productsApi.js` | Add `getBatches` and `createBatch` RTK Query endpoints |
| `src/pages/pos/` (cart/scan logic) | After barcode lookup, if multiple batches exist → show batch picker; otherwise no change |
| `src/hooks/useProductCache.js` | Optionally cache batch data alongside product data |

---

## What Does NOT Change

- `products` table schema — no new columns, no altered columns.
- Existing barcode uniqueness check — still enforced per product (a barcode maps to one product; multiple batches live *under* that product).
- All existing product CRUD pages — Create, Edit, Index work exactly as before.
- Reporting / stock movement history — existing `stock_movements` table unchanged.
- ProductVariant logic — untouched.

---

## Migration Path

1. Run the new migration → `product_batches` table created (empty). All existing products unaffected.
2. Deploy backend with new model + new routes. No existing routes change.
3. Deploy frontend. Intake and POS behave identically until a product gains its first batch.
4. The next time stock arrives with a new price/expiry for a shared barcode, choose "Save as new batch" → system switches to batch mode for that product.

---

## Edge Cases to Handle

| Case | Resolution |
|---|---|
| All batches depleted | Fall back to product-level qty / price |
| Single batch (no conflict) | Behave exactly as today — no picker shown |
| Batch expiry passed | Mark batch inactive; warn on intake and exclude from sale picker |
| CSV import of products | Unchanged — batches are created only through intake |
| Refund / return | Return qty goes back to the batch the item was sold from (using `batch_id` on sale line) |

---

## Implementation Order

1. `product_batches` migration + model
2. Backend batch routes (GET + POST)
3. Intake page — "save as batch" prompt
4. POS scan — multi-batch picker (can default to auto-FIFO to skip picker if preferred)
5. Sale deduction from batch qty
6. (Optional) Batch expiry warning on dashboard / low-stock alerts

---

## Decision Needed Before Starting

**Batch selection at POS:** Should the cashier always be prompted to pick a batch, or should the system silently use FIFO (oldest first)?

- **FIFO auto-select** — zero cashier friction; works well when prices are close and staff don't need to choose.
- **Manual picker** — cashier can match the physical item to the correct batch (useful when price differs and the receipt must show the right price).

Recommend: **FIFO auto-select** with an override button for cashiers who want to pick manually.
