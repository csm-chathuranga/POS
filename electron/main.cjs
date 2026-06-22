const { app, BrowserWindow, shell, Menu, ipcMain, globalShortcut, dialog } = require('electron');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs   = require('fs');

const APP_PORT = 8000;
const APP_URL  = `http://127.0.0.1:${APP_PORT}`;

// Live URL: --live-url=https://... arg, or LIVE_URL env var, or empty (use local PHP)
const LIVE_URL = (
  process.argv.find(a => a.startsWith('--live-url='))?.slice('--live-url='.length) ||
  process.env.LIVE_URL ||
  ''
).trim();

// ── Paths ──────────────────────────────────────────────────────────────────────
const IS_PACKAGED   = app.isPackaged;
const RESOURCES_DIR = IS_PACKAGED ? process.resourcesPath : path.join(__dirname, '..');
const PROJECT_DIR   = IS_PACKAGED ? path.join(RESOURCES_DIR, 'app') : path.join(__dirname, '..');
const PHP_EXE       = path.join(RESOURCES_DIR, 'resources', 'php-8.1.33', 'php.exe');

let mainWindow;
let phpProcess;

// ── Auto-setup .env on first run ───────────────────────────────────────────────
function ensureEnv() {
  const envPath    = path.join(PROJECT_DIR, '.env');
  const envExample = path.join(PROJECT_DIR, '.env.example');
  if (fs.existsSync(envPath)) return;

  let content = fs.existsSync(envExample)
    ? fs.readFileSync(envExample, 'utf8')
    : `APP_NAME="Lumac POS"\nAPP_ENV=production\nAPP_KEY=\nAPP_DEBUG=false\nAPP_URL=http://127.0.0.1:${APP_PORT}\n\nDB_CONNECTION=sqlite\n`;

  content = content.replace(/^DB_CONNECTION=.*/m, 'DB_CONNECTION=sqlite');
  content = content.replace(/^APP_URL=.*/m, `APP_URL=http://127.0.0.1:${APP_PORT}`);
  fs.writeFileSync(envPath, content, 'utf8');

  try {
    execFileSync(PHP_EXE, ['artisan', 'key:generate', '--force'], { cwd: PROJECT_DIR, windowsHide: true });
  } catch (e) {
    console.error('[setup] key:generate failed:', e.message);
  }
}

// ── Run migrations on every start ─────────────────────────────────────────────
function runMigrations() {
  try {
    execFileSync(PHP_EXE, ['artisan', 'migrate', '--force'], { cwd: PROJECT_DIR, windowsHide: true });
    console.log('[setup] Migrations OK');
  } catch (e) {
    console.error('[setup] migrate failed:', e.message);
  }
}

// ── Cache Laravel config/routes/views ─────────────────────────────────────────
function runLaravelCache() {
  for (const cmd of ['config:cache', 'route:cache', 'view:cache']) {
    try {
      execFileSync(PHP_EXE, ['artisan', cmd], { cwd: PROJECT_DIR, windowsHide: true });
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
      const req = http.get(APP_URL, () => resolve());
      req.on('error', () => {
        if (attempts >= maxAttempts) reject(new Error('PHP server did not start in time'));
        else setTimeout(check, 1000);
      });
      req.setTimeout(800, () => {
        req.destroy();
        if (attempts >= maxAttempts) reject(new Error('PHP server timed out'));
        else setTimeout(check, 500);
      });
    };
    setTimeout(check, 1500);
  });
}

function startPhpServer() {
  phpProcess = spawn(PHP_EXE, ['artisan', 'serve', `--host=127.0.0.1`, `--port=${APP_PORT}`], {
    cwd:         PROJECT_DIR,
    shell:       false,
    windowsHide: true,
  });
  phpProcess.stdout.on('data', d => console.log(`[PHP] ${d.toString().trim()}`));
  phpProcess.stderr.on('data', d => { const m = d.toString().trim(); if (m) console.log(`[PHP] ${m}`); });
  phpProcess.on('error', err => console.error('Failed to start PHP:', err));
}

function stopPhpServer() {
  if (!phpProcess) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', phpProcess.pid, '/f', '/t'], { shell: true });
  } else {
    phpProcess.kill('SIGTERM');
  }
  phpProcess = null;
}

function createSplash() {
  const imgPath = IS_PACKAGED
    ? path.join(process.resourcesPath, 'app', 'public', 'lumac-load.jpeg')
    : path.join(__dirname, '..', 'public', 'lumac-load.jpeg');

  const splash = new BrowserWindow({
    width:          420,
    height:         260,
    frame:          false,
    transparent:    true,
    resizable:      false,
    center:         true,
    alwaysOnTop:    true,
    skipTaskbar:    true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
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
    width:     1440,
    height:    900,
    minWidth:  900,
    minHeight: 600,
    webPreferences: {
      preload:              path.join(__dirname, 'preload.cjs'),
      nodeIntegration:      false,
      contextIsolation:     true,
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

    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        if (!splash.isDestroyed()) splash.close();
        mainWindow.show();
        mainWindow.focus();
      }, 300);
    });
  } catch (err) {
    if (!splash.isDestroyed()) splash.close();
    mainWindow.loadURL(
      'data:text/html,' +
      encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{background:#0f172a;color:#fff;font-family:'Segoe UI',sans-serif;
       display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
  .box{text-align:center;max-width:480px;padding:2rem;}
  h1{color:#f87171;margin-bottom:1rem;}p{color:#cbd5e1;margin-bottom:.5rem;}
  code{background:#1e293b;padding:.2rem .5rem;border-radius:4px;font-size:.85rem;}
</style></head><body><div class="box">
  <h1>සේවාදායකය ආරම්භ නොවීය</h1>
  <p>PHP ස්ථාපිත ද, MySQL ධාවනය වේ ද යන්න පරීක්ෂා කරන්න.</p>
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
    if (!mainWindow) return resolve({ cancelled: true });

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
    }, (success, failureReason) => resolve({ success, failureReason }));
  });
  if (result.success) return { success: true };
  console.error('[print-receipt] failed:', result.failureReason);
  return { success: false, error: result.failureReason };
});

// ─── IPC: barcode label print ─────────────────────────────────────────────────
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
    title:       'Export Database Backup',
    defaultPath: `lmuc-pos-backup-${new Date().toISOString().slice(0, 10)}.sqlite`,
    filters:     [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
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
    title:      'Import Database Backup',
    filters:    [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
    properties: ['openFile'],
  });

  if (canceled || !filePaths?.length) return { success: false, cancelled: true };
  try {
    fs.copyFileSync(filePaths[0], dbPath);
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

app.whenReady().then(() => {
  if (!LIVE_URL) {
    ensureEnv();
    runMigrations();
    runLaravelCache();
    startPhpServer();
  }

  createWindow();

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

app.on('before-quit', () => stopPhpServer());
app.on('activate', () => { if (!mainWindow) createWindow(); });
