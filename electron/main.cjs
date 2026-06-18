const { app, BrowserWindow, shell, Menu, ipcMain, globalShortcut, dialog } = require('electron');
const { spawn, execFileSync }  = require('child_process');
const path    = require('path');
const http    = require('http');
const https   = require('https');
const fs      = require('fs');
const os      = require('os');
const crypto  = require('crypto');

const APP_PORT = 8000;
const APP_URL  = `http://127.0.0.1:${APP_PORT}`;
const LIVE_URL = ''; // set to '' to use local PHP server
// const LIVE_URL = 'https://pos.lumac.lk'; // set to '' to use local PHP server

// ── Paths ──────────────────────────────────────────────────────────────────────
// In packaged build:  resources are under process.resourcesPath
// In development:     resources sit beside the electron/ folder
const IS_PACKAGED   = app.isPackaged;
const RESOURCES_DIR = IS_PACKAGED ? process.resourcesPath : path.join(__dirname, '..');
const PROJECT_DIR   = IS_PACKAGED ? path.join(RESOURCES_DIR, 'app') : path.join(__dirname, '..');
const PHP_EXE       = path.join(RESOURCES_DIR, 'resources', 'php-8.1.33', 'php.exe');

// ── License config ─────────────────────────────────────────────────────────────
const LICENSE_FILE   = path.join(app.getPath('userData'), 'license.dat');
const LICENSE_SECRET = 'lumac-pos-offline-k3y-s3cr3t-2025'; // must match scripts/keygen.cjs
const KEY_CHARS      = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // shared with keygen.cjs

let mainWindow;
let phpProcess;
let activationWindow;

// ── Auto-setup .env on first run ───────────────────────────────────────────────
function ensureEnv() {
  const envPath  = path.join(PROJECT_DIR, '.env');
  const envExample = path.join(PROJECT_DIR, '.env.example');
  if (fs.existsSync(envPath)) return;

  // Copy from .env.example if available, else write minimal defaults
  let content = fs.existsSync(envExample)
    ? fs.readFileSync(envExample, 'utf8')
    : `APP_NAME="Lumac POS"\nAPP_ENV=production\nAPP_KEY=\nAPP_DEBUG=false\nAPP_URL=http://127.0.0.1:${APP_PORT}\n\nDB_CONNECTION=sqlite\n`;

  // Make sure DB_CONNECTION is sqlite
  content = content.replace(/^DB_CONNECTION=.*/m, 'DB_CONNECTION=sqlite');
  content = content.replace(/^APP_URL=.*/m, `APP_URL=http://127.0.0.1:${APP_PORT}`);

  fs.writeFileSync(envPath, content, 'utf8');

  // Generate app key
  try {
    execFileSync(PHP_EXE, ['artisan', 'key:generate', '--force'], { cwd: PROJECT_DIR, windowsHide: true });
  } catch (e) {
    console.error('[setup] key:generate failed:', e.message);
  }
}

// ── Run migrations on every start (safe — skips already-run migrations) ────────
function runMigrations() {
  try {
    execFileSync(PHP_EXE, ['artisan', 'migrate', '--force'], { cwd: PROJECT_DIR, windowsHide: true });
    console.log('[setup] Migrations OK');
  } catch (e) {
    console.error('[setup] migrate failed:', e.message);
  }
}

// ── Cache Laravel config/routes/views for faster requests ────────────────────
function runLaravelCache() {
  const cmds = ['config:cache', 'route:cache', 'view:cache'];
  for (const cmd of cmds) {
    try {
      execFileSync(PHP_EXE, ['artisan', cmd], { cwd: PROJECT_DIR, windowsHide: true });
      console.log(`[setup] ${cmd} OK`);
    } catch (e) {
      console.error(`[setup] ${cmd} failed:`, e.message);
    }
  }
}

function waitForServer(maxAttempts = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(APP_URL, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error('PHP server did not start in time'));
        } else {
          setTimeout(check, 1000);
        }
      });
      req.setTimeout(800, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error('PHP server timed out'));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    setTimeout(check, 1500); // give PHP a head start
  });
}

// ── MAC address ────────────────────────────────────────────────────────────────
function getMacAddress() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        return iface.mac.toLowerCase();
      }
    }
  }
  return 'unknown';
}

// ── Encrypt / decrypt license file ────────────────────────────────────────────
function encryptLicense(data) {
  const iv  = crypto.randomBytes(16);
  const key = crypto.scryptSync(LICENSE_SECRET, 'lumac', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decryptLicense(raw) {
  try {
    const [ivHex, encHex] = raw.split(':');
    const key    = crypto.scryptSync(LICENSE_SECRET, 'lumac', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
    return JSON.parse(dec.toString('utf8'));
  } catch {
    return null;
  }
}

// ── Read stored license ────────────────────────────────────────────────────────
function readLicense() {
  if (!fs.existsSync(LICENSE_FILE)) return null;
  return decryptLicense(fs.readFileSync(LICENSE_FILE, 'utf8'));
}

// ── Save license after successful activation ───────────────────────────────────
function saveLicense(key, mac, customer, token, type, expiresAt) {
  fs.writeFileSync(LICENSE_FILE, encryptLicense({ key, mac, customer, token, type, expiresAt }), 'utf8');
}

// ── Offline key verification ───────────────────────────────────────────────────
// Key format: XXXX-XXXX-XXXX-XXXX (16 chars without dashes)
//   Trial: [T][9 random][6 HMAC]          → activate any time
//   Paid:  [P][4 date][5 random][6 HMAC]  → activate today only
const KEY_EPOCH = new Date(2025, 0, 1).getTime(); // local midnight — matches keygen.cjs

function decodeDateFromKey(encoded4) {
  let days = 0;
  for (let i = 0; i < 4; i++) {
    days = days * 32 + KEY_CHARS.indexOf(encoded4[i]);
  }
  // Reconstruct as local midnight to match how keygen encoded it
  const d = new Date(KEY_EPOCH + days * 86400000);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function verifyKey(formattedKey) {
  const raw = formattedKey.replace(/-/g, '').toUpperCase();
  if (raw.length !== 16) return { valid: false, error: 'bad_format' };

  const typeChar = raw[0];
  if (typeChar !== 'T' && typeChar !== 'P') return { valid: false, error: 'bad_format' };

  const payload      = raw.slice(0, 10);
  const providedHmac = raw.slice(10, 16);
  const expectedHmac = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(payload)
    .digest('hex')
    .toUpperCase()
    .slice(0, 6);

  if (providedHmac !== expectedHmac) return { valid: false, error: 'invalid_key' };

  // Paid keys: must be activated on the day they were generated
  if (typeChar === 'P') {
    const keyDate = decodeDateFromKey(raw.slice(1, 5));
    const today   = new Date();
    const sameDay = keyDate.getFullYear() === today.getFullYear()
                 && keyDate.getMonth()    === today.getMonth()
                 && keyDate.getDate()     === today.getDate();
    if (!sameDay) return { valid: false, error: 'key_expired' };
  }

  return { valid: true, type: typeChar === 'P' ? 'paid' : 'trial' };
}

// ── Check license on startup (100% offline) ────────────────────────────────────
function checkLicense() {
  const mac    = getMacAddress();
  const stored = readLicense();

  if (!stored)            return { ok: false, reason: 'not_activated' };
  if (stored.mac !== mac) return { ok: false, reason: 'not_activated' };

  // Verify the stored key is still cryptographically valid
  const result = verifyKey(stored.key);
  if (!result.valid)      return { ok: false, reason: 'not_activated' };

  // Check expiry (trial only — paid keys have no expiry)
  if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
    return { ok: false, reason: 'expired' };
  }

  const daysRemaining = stored.expiresAt
    ? Math.max(0, Math.ceil((new Date(stored.expiresAt) - new Date()) / 86400000))
    : 9999;

  return { ok: true, type: stored.type, daysRemaining };
}

// ── Activation window ──────────────────────────────────────────────────────────
function showActivationWindow(isExpired = false) {
  activationWindow = new BrowserWindow({
    width:           480,
    height:          440,
    resizable:       false,
    center:          true,
    frame:           true,
    title:           isExpired ? 'Trial Expired — Enter New Key' : 'Activate Lumac POS',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload:          path.join(__dirname, 'activation-preload.cjs'),
      nodeIntegration:  false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '..', 'public', 'lumac-load.jpeg'),
  });

  activationWindow.setMenu(null);
  activationWindow.loadFile(path.join(__dirname, 'activation.html'), {
    query: { expired: isExpired ? '1' : '0' },
  });

  // Prevent closing without activation
  activationWindow.on('close', (e) => {
    e.preventDefault();
    app.quit();
  });

  return activationWindow;
}

// IPC: get MAC for display in activation window
ipcMain.handle('activation:get-mac', () => getMacAddress());

// IPC: expose license key to renderer for axios device header
ipcMain.handle('get-license-key', () => readLicense()?.key ?? null);

// IPC: called from within the running app to change license key
ipcMain.handle('activation:change-key', () => {
  if (activationWindow && !activationWindow.isDestroyed()) return;
  const win = showActivationWindow();
  // When done, close activation window but keep main window open
  win.removeAllListeners('close');
  win.on('close', (e) => e.preventDefault()); // still prevent raw close
  ipcMain.once('activation:done', () => {
    if (win && !win.isDestroyed()) win.destroy();
  });
});

// IPC: activation window submits license key — verified fully offline
ipcMain.handle('activation:activate', (event, key) => {
  const mac    = getMacAddress();
  const result = verifyKey(key.trim());

  if (!result.valid) return { success: false, error: result.error || 'invalid_key' };

  const expiresAt = result.type === 'trial'
    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  saveLicense(key.trim().toUpperCase(), mac, '', '', result.type, expiresAt);

  return {
    success:       true,
    type:          result.type,
    daysRemaining: result.type === 'trial' ? 14 : 9999,
  };
});

// IPC: activation succeeded — close activation window and launch app
ipcMain.on('activation:done', () => {
  if (activationWindow && !activationWindow.isDestroyed()) {
    activationWindow.destroy();
    activationWindow = null;
  }
  createWindow();
});

function startPhpServer() {
  phpProcess = spawn(PHP_EXE, ['artisan', 'serve', `--host=127.0.0.1`, `--port=${APP_PORT}`], {
    cwd:         PROJECT_DIR,
    shell:       false,
    windowsHide: true,
  });

  phpProcess.stdout.on('data', (data) => {
    console.log(`[PHP] ${data.toString().trim()}`);
  });

  phpProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[PHP] ${msg}`);
  });

  phpProcess.on('error', (err) => {
    console.error('Failed to start PHP:', err);
  });
}

function stopPhpServer() {
  if (phpProcess) {
    // Kill the process tree on Windows
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', phpProcess.pid, '/f', '/t'], { shell: true });
    } else {
      phpProcess.kill('SIGTERM');
    }
    phpProcess = null;
  }
}

function createSplash() {
  const imgPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'public', 'lumac-load.jpeg')
    : path.join(__dirname, '..', 'public', 'lumac-load.jpeg');

  const splash = new BrowserWindow({
    width:           420,
    height:          260,
    frame:           false,
    transparent:     true,
    resizable:       false,
    center:          true,
    alwaysOnTop:     true,
    skipTaskbar:     true,
    webPreferences:  { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, '..', 'public', 'lumac-load.jpeg'),
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
  splash.webContents.once('did-finish-load', () => {
    const fileUrl = 'file:///' + imgPath.replace(/\\/g, '/');
    splash.webContents.executeJavaScript(
      `const img = document.querySelector('.logo-ring img'); if (img) img.src = ${JSON.stringify(fileUrl)};`
    ).catch(() => {});
  });
  return splash;
}

async function createWindow() {
  Menu.setApplicationMenu(null);

  const splash = createSplash();

  mainWindow = new BrowserWindow({
    width:    1440,
    height:   900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload:             path.join(__dirname, 'preload.cjs'),
      nodeIntegration:     false,
      contextIsolation:    true,
      backgroundThrottling: false,
    },
    title:           'LMUC POS',
    show:            false,
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, '..', 'public', 'lumac-load.jpeg'),
  });

  try {
    if (!LIVE_URL) await waitForServer();
    mainWindow.loadURL(LIVE_URL || APP_URL);

    // Once the app page finishes loading, close splash and show main window
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        if (!splash.isDestroyed()) splash.close();
        mainWindow.show();
        mainWindow.focus();
      }, 300); // brief pause so first paint completes
    });

  } catch (err) {
    if (!splash.isDestroyed()) splash.close();
    mainWindow.loadURL(
      'data:text/html,' +
      encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { background:#0f172a; color:#fff; font-family:'Segoe UI',sans-serif;
         display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
  .box { text-align:center; max-width:480px; padding:2rem; }
  h1 { color:#f87171; margin-bottom:1rem; }
  p  { color:#cbd5e1; margin-bottom:.5rem; }
  code { background:#1e293b; padding:.2rem .5rem; border-radius:4px; font-size:.85rem; }
</style></head>
<body><div class="box">
  <h1>සේවාදායකය ආරම්භ නොවීය</h1>
  <p>PHP සේවාදායකය ආරම්භ කිරීමට නොහැකි විය.</p>
  <p>PHP ස්ථාපිත ද, MySQL ධාවනය වේ ද යන්න පරීක්ෂා කරන්න.</p>
  <br>
  <p>Error: <code>${err.message}</code></p>
</div></body></html>`)
    );
    mainWindow.show();
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─── IPC: printer-selection modal ─────────────────────────────────────────────
ipcMain.handle('open-printer-dialog', (event) => {
  return new Promise((resolve) => {
    if (!mainWindow) return resolve({ success: false, cancelled: true });

    const printerWin = new BrowserWindow({
      width:       440,
      height:      420,
      parent:      mainWindow,
      modal:       true,
      resizable:   false,
      minimizable: false,
      maximizable: false,
      title:       'Select Printer',
      backgroundColor: '#0f172a',
      webPreferences: {
        preload:          path.join(__dirname, 'printer-select-preload.cjs'),
        nodeIntegration:  false,
        contextIsolation: true,
      },
    });

    printerWin.setMenu(null);
    printerWin.loadFile(path.join(__dirname, 'printer-select.html'));

    let settled = false;

    function settle(printerName) {
      if (settled) return;
      settled = true;
      ipcMain.removeListener('printer-confirmed', onConfirmed);
      if (!printerWin.isDestroyed()) printerWin.close();
      // Return selected name to renderer — caller saves and decides when to print
      resolve(printerName ? { name: printerName } : { cancelled: true });
    }

    function onConfirmed(e, printerName) { settle(printerName); }

    ipcMain.on('printer-confirmed', onConfirmed);
    printerWin.on('closed', () => settle(null));
  });
});

// ─── IPC: list printers ───────────────────────────────────────────────────────
ipcMain.handle('get-printers', async (event) => {
  try {
    const printers = await event.sender.getPrintersAsync();
    return printers.map(p => ({
      name:        p.name,
      displayName: p.displayName || p.name,
      isDefault:   p.isDefault,
      status:      p.status,
    }));
  } catch (err) {
    console.error('[get-printers]', err);
    return [];
  }
});

// ─── IPC: silent print ────────────────────────────────────────────────────────
// Uses printableArea margins (no custom pageSize) so the XP-80C driver handles
// paper positioning exactly as it does for window.print() — no top gap.
ipcMain.handle('print-receipt', async (event, printerName, options = {}) => {
  const wc = event.sender;

  const result = await new Promise((resolve) => {
    wc.print({
      silent:          true,
      printBackground: false,
      deviceName:      printerName || '',
      margins:         { marginType: 'printableArea' },
      copies:          1,
      ...options,
    }, (success, failureReason) => {
      resolve({ success, failureReason });
    });
  });

  if (result.success) {
    return { success: true };
  } else {
    console.error('[print-receipt] failed:', result.failureReason);
    return { success: false, error: result.failureReason };
  }
});

// ─── IPC: barcode label print (30mm × 20mm) ───────────────────────────────────
ipcMain.handle('print-barcode', async (event, printerName) => {
  const wc = event.sender;

  const cssKey = await wc.insertCSS(`
    @media print {
      body > * { display: none !important; }
      #barcode-print-area {
        display: flex !important;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 30mm; height: 20mm;
        padding: 1mm;
        font-family: sans-serif;
        overflow: hidden;
      }
      #barcode-print-area svg { display: block; width: 18mm !important; height: auto !important; }
      #barcode-print-area .barcode-name { margin: 1mm 0 0; font-size: 7pt; font-weight: bold; text-align: center; line-height: 1.1; }
      #barcode-print-area .barcode-name-si { margin: 0.5mm 0 0; font-size: 5.5pt; font-weight: bold; text-align: center; line-height: 1.1; }
    }
  `).catch(() => null);

  const result = await new Promise((resolve) => {
    wc.print({
      silent:          true,
      printBackground: false,
      deviceName:      printerName || '',
      margins:         { marginType: 'none' },
      pageSize:        { width: 30000, height: 20000 },
      copies:          1,
    }, (success, failureReason) => resolve({ success, failureReason }));
  });

  if (cssKey) wc.removeInsertedCSS(cssKey).catch(() => null);

  return result.success ? { success: true } : { success: false, error: result.failureReason };
});

// ─── IPC: database export ─────────────────────────────────────────────────────
ipcMain.handle('db:export', async () => {
  const dbPath = path.join(PROJECT_DIR, 'database', 'database.sqlite');
  if (!fs.existsSync(dbPath)) return { success: false, error: 'Database file not found' };

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Database Backup',
    defaultPath: `lmuc-pos-backup-${new Date().toISOString().slice(0, 10)}.sqlite`,
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
  });

  if (canceled || !filePath) return { success: false, cancelled: true };

  try {
    fs.copyFileSync(dbPath, filePath);
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: database import ─────────────────────────────────────────────────────
ipcMain.handle('db:import', async () => {
  const dbPath = path.join(PROJECT_DIR, 'database', 'database.sqlite');

  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Database Backup',
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
    properties: ['openFile'],
  });

  if (canceled || !filePaths?.length) return { success: false, cancelled: true };

  try {
    fs.copyFileSync(filePaths[0], dbPath);
    // Run migrations so any new tables are created on the restored DB
    try {
      execFileSync(PHP_EXE, ['artisan', 'migrate', '--force'], { cwd: PROJECT_DIR, windowsHide: true });
    } catch (e) {
      console.error('[db:import] migrate failed:', e.message);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: run migrations ──────────────────────────────────────────────────────
ipcMain.handle('db:migrate', () => {
  try {
    execFileSync(PHP_EXE, ['artisan', 'migrate', '--force'], { cwd: PROJECT_DIR, windowsHide: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(async () => {
  if (!LIVE_URL) {
    ensureEnv();
    runMigrations();
    runLaravelCache();
    startPhpServer();
  }

  const license = checkLicense();

  if (license.ok) {
    createWindow();
    // Show trial warning after window loads
    if (license.type === 'trial' && license.daysRemaining <= 3) {
      setTimeout(() => {
        if (mainWindow) {
          const msg = license.daysRemaining === 0
            ? 'Your trial expires TODAY.\n\nOnce you receive your new license key, go to Settings → Enter New Key.'
            : `Your trial expires in ${license.daysRemaining} day(s).\n\nOnce you receive your new license key, go to Settings → Enter New Key.`;
          mainWindow.webContents.executeJavaScript(`alert(${JSON.stringify(msg)})`);
        }
      }, 3000);
    }
  } else if (license.reason === 'expired') {
    // Trial expired — show activation window so customer can enter their new paid key
    showActivationWindow(true);
  } else {
    showActivationWindow();
  }

  // F12 / Ctrl+Shift+I → toggle DevTools on the main window
  globalShortcut.register('F12', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  stopPhpServer();
  app.quit();
});

app.on('before-quit', () => {
  stopPhpServer();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
