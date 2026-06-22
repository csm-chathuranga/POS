# Lumac POS

A Sinhala-first Point of Sale system built with Laravel + Vue (Inertia.js), packaged as a desktop app via Electron. Works fully offline — no internet required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Laravel (PHP 8.1) |
| Frontend | Vue 3 + Inertia.js + Tailwind CSS |
| Database | SQLite |
| Desktop | Electron (bundled PHP 8.1.33) |
| Auth | Laravel Breeze + Spatie Permissions |

---

## Default Logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | password |
| Manager | manager@example.com | password |
| Cashier | cashier@example.com | password |

---

## Development Setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed

# Run web + Electron together
npm run electron:dev
```

---

## Building the Electron App

### Prerequisites

- Node.js 18+
- PHP 8.1 (for Vite build only — bundled PHP is used at runtime)
- A `php-bundle/` folder containing the bundled PHP 8.1.33 runtime (placed at project root)
- `build-resources/` folder containing `icon.ico`, `installer-header.bmp`, `license.txt`

---

### 1. Standard Build (offline, bundled PHP + Laravel backend)

This is the full desktop app — ships with PHP, Laravel, and SQLite. No internet required.

```bash
# 1. Build frontend assets
npm run build

# 2. Package as Windows installer
electron-builder --win --x64

# Or both in one command:
npm run dist
```

Output: `dist-electron/Lumac POS Setup x.x.x.exe`

---

### 2. Live URL Build (thin client — no backend bundled)

Use this when the Laravel backend is hosted on a server. The Electron app simply loads the remote URL — no PHP or backend files are bundled. The installer is much smaller.

```bash
# Package (no backend, no PHP)
npm run dist:live
```

Output: `dist-electron-live/Lumac POS Live Setup x.x.x.exe`

**Passing the live URL at runtime:**

The URL is read in this priority order:

| Source | Example |
|---|---|
| CLI argument | `"Lumac POS Live.exe" --live-url=https://pos.myshop.lk` |
| Environment variable | `set LIVE_URL=https://pos.myshop.lk` |
| Fallback | Local PHP server on port 8000 |

To test locally before building:
```bash
# Windows
set LIVE_URL=https://pos.myshop.lk
npm run electron:live

# Or pass directly
electron electron/main.cjs --live-url=https://pos.myshop.lk
```

---

### Build Output Comparison

| Build | Command | Includes | Size (approx) |
|---|---|---|---|
| Standard | `npm run dist` | PHP + Laravel + SQLite | ~150 MB |
| Live URL | `npm run dist:live` | Electron only | ~5 MB |

---

### Development (no build)

```bash
# Start Laravel dev server + Electron together
npm run electron:dev

# Or separately
php artisan serve
electron electron/main.cjs
```

---

## License Key System

The app uses an **offline cryptographic license system** — no internet or server required at any point.

### How It Works

Each key is a 16-character string (`XXXX-XXXX-XXXX-XXXX`) containing:
- **Type** — `T` (trial) or `P` (paid) as the first character
- **Payload** — random data (trial) or encoded date + random (paid)
- **HMAC signature** — 6-char SHA-256 signature proving the key is genuine

The Electron app verifies the signature locally using a shared secret. No network call is made.

---

### Key Types

#### Trial Key
- Valid for **14 days** from first activation
- Can be activated **any time** after generation
- After 14 days: app shows expired screen, customer must enter paid key

#### Paid Key
- **No expiry** once activated — works forever
- Can only be activated **on the day it was generated**
- If not used today, the key is dead — generate a new one tomorrow

---

### Generating Keys

Run from the project root on **your machine** (not the customer's):

```bash
# Generate a 14-day trial key
node scripts/keygen.cjs trial "Shop Name"

# Generate a paid key (valid today only for activation)
node scripts/keygen.cjs paid "Shop Name"
```

Example output:
```
─────────────────────────────────────
  Key      : PAAS-RJ79-4ACA-8E54
  Type     : Paid — valid TODAY only to activate (then works forever)
  Customer : ABC Shop
  Valid on : 2026-06-12
─────────────────────────────────────
```

> **Keep `scripts/keygen.cjs` private.** Anyone with it can generate unlimited keys.

---

### Supplier Workflow

```
1. Customer enquires
        ↓
2. Run: node scripts/keygen.cjs trial "Shop Name"
        ↓
3. Send trial key to customer → they activate → 14 days starts
        ↓
4. Customer pays
        ↓
5. Run: node scripts/keygen.cjs paid "Shop Name"
        ↓
6. Email paid key to customer SAME DAY
        ↓
7. Customer opens app → Settings → "Enter New Key" → enters paid key
        ↓
8. App activates → works forever, no internet needed
```

---

### Customer Experience

| Day | What the customer sees |
|---|---|
| Day 0 | Activation window → enters trial key → app opens |
| Day 1–11 | App opens normally |
| Day 12–13 | Alert on startup: "Trial expires in X days. Go to Settings → Enter New Key" |
| Day 14 | Activation window with "Trial Expired" header → enter paid key |
| After paid key | App opens normally, forever |

---

### Changing License Key (customer side)

After receiving the paid key, the customer goes to:

**Settings → Enter New Key → types paid key → done**

Or on the expired activation screen, enter the new paid key directly.

---

### Security Notes

- Keys are verified by HMAC-SHA256 — cannot be forged without the secret
- Paid keys embed the generation date — cannot be reused the next day
- License is stored in an AES-256 encrypted file tied to the machine's MAC address
- Copying `license.dat` to another machine will fail (MAC mismatch)
- The shared secret in `electron/main.cjs` and `scripts/keygen.cjs` must stay identical and private

---

## File Structure (key files)

```
electron/
  main.cjs                  ← Electron main process, license check, PHP server
  preload.cjs               ← Exposes APIs to renderer
  activation.html           ← License key entry screen
  activation-preload.cjs    ← Preload for activation window

scripts/
  keygen.cjs                ← Key generator (run on your machine only)

resources/
  php-8.1.33/               ← Bundled PHP (no system PHP needed)
  js/Pages/                 ← Vue pages
  js/Layouts/               ← AuthenticatedLayout etc.
```
