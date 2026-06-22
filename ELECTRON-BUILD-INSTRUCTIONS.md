# Electron Build Instructions

## Prerequisites

- Node.js 18+
- PHP 8.1 (for Vite frontend build only)
- `php-bundle/` folder at project root — contains the bundled PHP 8.1.33 runtime
- `build-resources/` folder containing:
  - `icon.ico`
  - `installer-header.bmp`
  - `license.txt`

---

## Step 1 — Install Dependencies

```bash
npm install
composer install
```

---

## Step 2 — Build Frontend Assets

Must be done before packaging:

```bash
npm run build
```

---

## Step 3 — Package

### Option A: Standard Build (offline, bundled PHP + Laravel)

Full desktop app — ships with PHP, Laravel, and SQLite. No internet required on the customer machine.

```bash
npm run dist
```

Output → `dist-electron/Lumac POS Setup x.x.x.exe`

---

### Option B: Live URL Build (thin client, no backend)

Use when the Laravel backend is hosted on a server. No PHP or Laravel files are bundled — much smaller installer.

```bash
npm run dist:live
```

Output → `dist-electron-live/Lumac POS Live Setup x.x.x.exe`

**The live URL is passed at runtime:**

```bash
# Via CLI argument (recommended)
"Lumac POS Live.exe" --live-url=https://pos.myshop.lk

# Via environment variable
set LIVE_URL=https://pos.myshop.lk
```

URL priority: `--live-url` arg → `LIVE_URL` env var → fallback to local PHP on port 8000

---

## Build Comparison

| | Standard | Live URL |
|---|---|---|
| Command | `npm run dist` | `npm run dist:live` |
| Output folder | `dist-electron/` | `dist-electron-live/` |
| Includes PHP | Yes (bundled) | No |
| Includes Laravel | Yes | No |
| Requires internet | No | Yes (to reach server) |
| Installer size | ~150 MB | ~5 MB |

---

## Development (no build needed)

```bash
# Laravel + Electron together
npm run electron:dev

# Test with a live URL locally
set LIVE_URL=https://pos.myshop.lk
npm run electron:live
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| White screen on launch | Check `php-bundle/` exists and PHP is not blocked by antivirus |
| `php artisan migrate` fails | Delete `database/database.sqlite` and restart — migrations run fresh |
| Build fails on icon | Ensure `build-resources/icon.ico` is 256×256 ICO format |
| Live URL not loading | Check `LIVE_URL` is set and the server is reachable |
| Installer not created | Run `npm run build` first before `npm run dist` |
