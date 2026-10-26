# Van Sales Module Plan

Ice cream van daily operations — from warehouse loading through daily cash handover to final settlement.

---

## Overview

| | |
|---|---|
| **Module key** | `van_sales` |
| **Nav group** | finance |
| **Icon** | truck |
| **Depends on** | none |

**What it replaces:** handwritten grid sheets where the warehouse manually tracks stock loaded per variant, daily cash handovers, and end-of-trip settlement math.

---

## Trip Workflow

```
Monday            Days 1–N           Unload Day
──────────────    ───────────────    ──────────────────
Open trip         Daily record       Record returned
Initial load  →   advance given  →   stock per variant
per variant       cash handover      → Settlement
                  (repeat each day)
                  
                  + Refills
                  (mid-trip, as needed)
```

### Steps

**1. Open Trip & Initial Load**
Manager opens a new van trip. Warehouse records initial load — each ice cream variant with quantity and unit price. Sets opening stock for the cycle.

**2. Daily Driver Record** *(every active day)*
Each evening: record Rs. 5,000 advance given + actual cash handed over by driver.

**3. Mid-trip Refill** *(optional, every 3–4 days)*
When stock runs low, warehouse records a partial refill — date and quantities per variant — adding to the total loaded.

**4. Unload Day**
Driver returns van. Warehouse counts remaining stock per variant and records it. System calculates: **sold = loaded − returned**.

**5. Settlement & Close**
System shows: total sales value, total advances paid, total cash received, and the final balance. Manager confirms and closes trip.

---

## Database Schema

### `van_trips`
| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| driver_name | VARCHAR | |
| vehicle_no | VARCHAR | |
| start_date | DATE | |
| end_date | DATE | nullable |
| status | ENUM | `active` / `closed` |
| notes | TEXT | nullable |

### `van_loads`
| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| trip_id | INT | FK → van_trips |
| date | DATE | |
| type | ENUM | `initial` / `refill` |
| notes | TEXT | nullable |

### `van_load_items`
| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| load_id | INT | FK → van_loads |
| variant_name | VARCHAR | e.g. "Choc 50", "Vanilla 25" |
| quantity | INT | |
| unit_price | DECIMAL | selling price |
| unit_cost | DECIMAL | warehouse cost |

### `van_daily_records`
| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| trip_id | INT | FK → van_trips |
| date | DATE | |
| advance_given | DECIMAL | default 5000 |
| cash_handover | DECIMAL | |
| notes | TEXT | nullable |

### `van_unload_items`
| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| trip_id | INT | FK → van_trips |
| date | DATE | |
| variant_name | VARCHAR | |
| qty_returned | INT | |

> **Note on variants:** `variant_name` is stored as free text (not FK to products) so the module works independently. Can link to `product_id` later for tighter integration.

---

## API Routes

New file: `pos-api/src/routes/van-sales.js`

| Method | Path | Description |
|---|---|---|
| GET | `/api/van-sales` | List all trips, newest first |
| POST | `/api/van-sales` | Create trip + initial load (items[] in body) |
| GET | `/api/van-sales/:id` | Full trip detail: loads, daily records, unload items |
| POST | `/api/van-sales/:id/daily` | Add or update a daily handover record |
| POST | `/api/van-sales/:id/refill` | Add a refill load with items array |
| POST | `/api/van-sales/:id/unload` | Record returned items, compute sold, close trip |
| GET | `/api/van-sales/:id/settlement` | Settlement breakdown: per variant + financial summary |
| DELETE | `/api/van-sales/:id` | Delete trip (only if status = active, no daily records) |

---

## Frontend Pages

New folder: `pos-client/src/pages/van-sales/`  
RTK Query API: `pos-client/src/features/van-sales/vanSalesApi.js`

### `Index.jsx` → `/van-sales`
- List all trips with status badge (active / closed)
- Driver name, vehicle, date range
- "New Trip" button → opens modal

### `Show.jsx` → `/van-sales/:id`
Three-tab layout:

| Tab | Content | Actions |
|---|---|---|
| **Stock** | Table by variant: initial loaded, refills, total loaded, returned, **sold**. Running balance visible live. | Add Refill |
| **Daily** | One row per day: date, advance given (Rs. 5,000 default), cash handover, running total. Editable until trip closes. | Add / Edit row |
| **Settlement** | Full financial breakdown. Locked until van is unloaded. Shows balance due. | Confirm & Close Trip |

---

## Settlement Formula

### Per Variant
```
Total Loaded   = initial_qty + Σ refill_qty
Sold Qty       = total_loaded − qty_returned
Sales Value    = sold_qty × unit_price
```

### Trip Financial Summary
```
Gross Sales Value   = Σ (sold_qty × unit_price) across all variants
Total Advances Paid = Σ advance_given across daily records
Total Cash Received = Σ cash_handover across daily records
─────────────────────────────────────────────────────────────
Balance Driver Owes = Gross Sales − Total Advances − Cash Received
```

### Example — 4-day trip

| Variant | Loaded | Returned | Sold | Value |
|---|---|---|---|---|
| Choc 50 | 125 | 12 | 113 | Rs. 5,650 |
| Vanilla 25 | 84 | 7 | 77 | Rs. 1,925 |
| Mango 40 | 60 | 5 | 55 | Rs. 2,200 |
| **Total** | | | | **Rs. 9,775** |

```
Gross Sales          Rs.  9,775
Total Advances       Rs. 20,000  (4 days × 5,000)
Total Cash Received  Rs.  8,500
─────────────────────────────────
Balance Due          Rs. (18,725)  ← company owes driver
```

*(Negative means company owes driver more than they've sold — adjust advance policy as needed.)*

---

## Build Phases

### Phase 1 — Backend Foundation
- Sequelize models for all 5 tables (with `sync` or migrations)
- Register module in `pos-api/src/config/modules.js`
- Route file skeleton with auth middleware
- `GET /api/van-sales` + `POST /api/van-sales` (create trip with initial load)
- `GET /api/van-sales/:id` (full detail)

### Phase 2 — Daily & Refill Operations
- `POST /api/van-sales/:id/daily`
- `POST /api/van-sales/:id/refill`
- Extend trip detail response to include all nested data

### Phase 3 — Unload & Settlement
- `POST /api/van-sales/:id/unload` — record returned items, mark trip closed
- `GET /api/van-sales/:id/settlement` — computed breakdown
- Guard: settlement endpoint only works after unload

### Phase 4 — Frontend Index & Trip Detail
- `vanSalesApi.js` — RTK Query endpoints
- `Index.jsx` — trip list + New Trip modal
- `Show.jsx` — 3-tab layout (Stock / Daily / Settlement)
- Add Refill modal, Add Daily modal

### Phase 5 — Unload Flow & Settlement UI
- Unload modal — enter returned qty per variant
- Settlement tab with full breakdown table
- Confirm & Close button with balance summary
- Register routes in `pos-client/src/router/index.jsx`
- Add nav entry via modules system

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `pos-api/src/models/VanTrip.js` | CREATE | Sequelize model |
| `pos-api/src/models/VanLoad.js` | CREATE | |
| `pos-api/src/models/VanLoadItem.js` | CREATE | |
| `pos-api/src/models/VanDailyRecord.js` | CREATE | |
| `pos-api/src/models/VanUnloadItem.js` | CREATE | |
| `pos-api/src/models/index.js` | MODIFY | Register 5 models + associations |
| `pos-api/src/routes/van-sales.js` | CREATE | All 8 endpoints |
| `pos-api/src/app.js` | MODIFY | Register route + module guard |
| `pos-api/src/config/modules.js` | MODIFY | Add `van_sales` entry |
| `pos-client/src/features/van-sales/vanSalesApi.js` | CREATE | RTK Query endpoints |
| `pos-client/src/pages/van-sales/Index.jsx` | CREATE | Trip list + New Trip modal |
| `pos-client/src/pages/van-sales/Show.jsx` | CREATE | 3-tab detail page |
| `pos-client/src/router/index.jsx` | MODIFY | Add `/van-sales` routes |
| `pos-client/src/layouts/AppLayout.jsx` | MODIFY | Nav entry (module-gated) |
