import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import path from 'path'
import fs from 'fs'

const __dirname = import.meta.dirname

const isDev = !app.isPackaged

let mainWindow

// The build (vite-plugin-electron) emits the preload bundle as `preload.mjs`
// instead of `preload.js` when the project's package.json has "type": "module".
// Resolve whichever one actually exists so packaged builds don't silently
// fail to load the preload script.
function resolvePreloadPath() {
  const candidates = ['preload.js', 'preload.mjs']
  for (const name of candidates) {
    const candidate = path.join(__dirname, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return path.join(__dirname, candidates[0])
}

// ── App config (backend URL + receipt/barcode printers) ───────────────────
// Stored outside the app bundle so it survives updates/reinstalls and can be
// changed at runtime without rebuilding.
const DEFAULT_CONFIG = { backendUrl: '', frontendUrl: 'https://chandana-pos.lumac.cc/', receiptPrinter: '', barcodePrinter: '' }
let _configCache = null
let _printerListCache = null
let _printerListCacheAt = 0
const PRINTER_LIST_CACHE_TTL = 30_000

function getConfigPath() {
  return path.join(app.getPath('userData'), 'app-config.json')
}

function readConfig() {
  if (_configCache) return _configCache
  const configPath = getConfigPath()
  try {
    if (fs.existsSync(configPath)) {
      _configCache = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) }
    } else {
      _configCache = { ...DEFAULT_CONFIG }
    }
  } catch {
    _configCache = { ...DEFAULT_CONFIG }
  }
  // Migrate the old single `printerName` field (pre receipt/barcode split)
  // to `receiptPrinter` so existing installs keep working.
  if (_configCache.printerName && !_configCache.receiptPrinter) {
    _configCache.receiptPrinter = _configCache.printerName
  }
  return _configCache
}

// Resolve a configured printer name against the actual list of installed
// printers (case-insensitive / partial match), similar to how the shared
// Electron shell resolves printers.
async function resolvePrinterName(configuredName) {
  if (!configuredName) return ''
  if (!_printerListCache || Date.now() - _printerListCacheAt > PRINTER_LIST_CACHE_TTL) {
    const wc = mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : null
    _printerListCache = wc ? await wc.getPrintersAsync().catch(() => []) : []
    _printerListCacheAt = Date.now()
  }
  const names = _printerListCache.map((p) => p.name)
  const lower = configuredName.toLowerCase()
  return (
    names.find((n) => n === configuredName) ||
    names.find((n) => n.toLowerCase() === lower) ||
    names.find((n) => n.toLowerCase().includes(lower)) ||
    ''
  )
}

// Loads arbitrary HTML into a hidden window and prints it silently to the
// given printer, resolving once printing finishes (or fails).
function printHtmlSilently(html, printOptions) {
  return new Promise((resolve) => {
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })
    let settled = false
    function finish(success, error) {
      if (settled) return
      settled = true
      if (!win.isDestroyed()) win.destroy()
      resolve({ success, error: success ? undefined : (error || 'Unknown print failure') })
    }
    const timeout = setTimeout(() => finish(false, 'Print timed out'), 15_000)
    win.webContents.once('did-fail-load', (_e, code, desc) => {
      clearTimeout(timeout)
      finish(false, `Failed to load content (${code}: ${desc})`)
    })
    win.webContents.once('did-finish-load', () => {
      win.webContents.print(printOptions, (success, reason) => {
        clearTimeout(timeout)
        finish(success, reason)
      })
    })
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  })
}

function writeConfig(config) {
  _configCache = { ...DEFAULT_CONFIG, ...config }
  fs.writeFileSync(getConfigPath(), JSON.stringify(_configCache, null, 2))
  return _configCache
}

// Injects a self-contained settings overlay (Backend URL + Receipt Printer +
// Barcode Printer) into the current page. Works without depending on the
// React app's own UI/auth state.
function buildSettingsOverlayScript(printers, config) {
  const printerOptions = (selected) => printers.map((name) => {
    const sel = name === selected ? ' selected' : ''
    return `<option value="${name}"${sel}>${name}</option>`
  }).join('')
  const c = JSON.stringify(config)

  return `
(function() {
  if (document.getElementById('__lumac-settings-overlay')) return;
  const backdrop = document.createElement('div');
  backdrop.id = '__lumac-settings-overlay';
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif';
  backdrop.innerHTML = \`
    <div style="background:#fff;border-radius:12px;width:420px;max-width:94vw;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,.3)">
      <div style="padding:20px 24px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1">
        <span style="font-size:16px;font-weight:600;color:#111">App Settings</span>
        <button id="__ls-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888">&#x2715;</button>
      </div>
      <div style="padding:20px 24px">
        <label style="display:block;margin-bottom:16px">
          <span style="display:block;font-size:12px;font-weight:500;color:#555;margin-bottom:4px">Frontend URL</span>
          <input id="ls-frontend-url" type="text" value="${(config.frontendUrl || '').replace(/"/g, '&quot;')}" placeholder="https://your-app.example.com (leave blank for local)"
            style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;box-sizing:border-box">
          <span style="font-size:11px;color:#999;margin-top:3px;display:block">Leave blank to use the locally bundled app</span>
        </label>
        <label style="display:block;margin-bottom:20px">
          <span style="display:block;font-size:12px;font-weight:500;color:#555;margin-bottom:4px">Backend API URL</span>
          <input id="ls-backend-url" type="text" value="${(config.backendUrl || '').replace(/"/g, '&quot;')}" placeholder="https://api.example.com"
            style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;box-sizing:border-box">
        </label>
        <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px">Printers</div>
        <label style="display:block;margin-bottom:16px">
          <span style="display:block;font-size:12px;font-weight:500;color:#555;margin-bottom:4px">Receipt Printer</span>
          <select id="ls-receipt-printer" style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;background:#fff">
            <option value="">— system default —</option>
            ${printerOptions(config.receiptPrinter)}
          </select>
        </label>
        <label style="display:block;margin-bottom:24px">
          <span style="display:block;font-size:12px;font-weight:500;color:#555;margin-bottom:4px">Barcode Printer</span>
          <select id="ls-barcode-printer" style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;background:#fff">
            <option value="">— system default —</option>
            ${printerOptions(config.barcodePrinter)}
          </select>
        </label>
        <div id="__ls-msg" style="font-size:13px;min-height:18px;margin-bottom:12px;color:green;text-align:center"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="__ls-cancel" style="padding:8px 18px;border:1px solid #ddd;border-radius:7px;background:#f5f5f5;cursor:pointer;font-size:14px">Cancel</button>
          <button id="__ls-save" style="padding:8px 22px;border:none;border-radius:7px;background:#2563eb;color:#fff;cursor:pointer;font-size:14px;font-weight:500">Save & Reload</button>
        </div>
      </div>
    </div>
  \`;

  function close() { backdrop.remove(); }
  backdrop.querySelector('#__ls-close').onclick = close;
  backdrop.querySelector('#__ls-cancel').onclick = close;
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });

  backdrop.querySelector('#__ls-save').onclick = async function() {
    const config = ${c};
    config.frontendUrl = document.getElementById('ls-frontend-url').value.trim();
    config.backendUrl = document.getElementById('ls-backend-url').value.trim();
    config.receiptPrinter = document.getElementById('ls-receipt-printer').value;
    config.barcodePrinter = document.getElementById('ls-barcode-printer').value;
    delete config.printerName;
    const btn = backdrop.querySelector('#__ls-save');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await window.electronAPI.saveConfig(config);
      document.getElementById('__ls-msg').textContent = 'Saved! Reloading…';
    } catch (err) {
      document.getElementById('__ls-msg').style.color = 'red';
      document.getElementById('__ls-msg').textContent = 'Error: ' + err.message;
      btn.disabled = false; btn.textContent = 'Save & Reload';
    }
  };
  document.body.appendChild(backdrop);
})();
`
}

async function openSettingsOverlay() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const printerList = await mainWindow.webContents.getPrintersAsync().catch(() => [])
  const script = buildSettingsOverlayScript(printerList.map((p) => p.name), readConfig())
  mainWindow.webContents.executeJavaScript(script).catch(() => {})
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    const config = readConfig()
    if (config.frontendUrl) {
      mainWindow.loadURL(config.frontendUrl)
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }
  }

  // Open external links in the system browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function buildAppMenu() {
  const template = [
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Backend && Printer Settings…',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => openSettingsOverlay(),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { role: 'quit' },
      ],
    },
  ]
  return Menu.buildFromTemplate(template)
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(buildAppMenu())
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Let renderer trigger a manual sync
ipcMain.handle('sync:trigger', () => {
  mainWindow?.webContents.send('sync:run')
})

// Receive sync status from renderer to show in title bar
ipcMain.on('sync:status', (_, { pending }) => {
  if (!mainWindow) return
  const title = pending > 0 ? `Lumac POS  •  ${pending} pending sync` : 'Lumac POS'
  mainWindow.setTitle(title)
})

// Synchronous config read so the preload script can expose it to the
// renderer before any React code runs (available as window.electronConfig).
ipcMain.on('config:get-sync', (event) => {
  event.returnValue = readConfig()
})

ipcMain.handle('config:get', () => readConfig())

ipcMain.handle('config:save', (_, config) => {
  const saved = writeConfig(config)
  mainWindow?.webContents.reload()
  return { success: true, config: saved }
})

ipcMain.handle('printers:list', async (event) => {
  const wc = mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : event.sender
  const list = await wc.getPrintersAsync().catch(() => [])
  return list.map((p) => p.name)
})

ipcMain.handle('settings:open', () => openSettingsOverlay())

// Print a fully-formed receipt HTML string silently to the configured
// receipt printer (falls back to the system default if none is set).
ipcMain.handle('printers:print-receipt-html', async (_event, html, options = {}) => {
  const config = readConfig()
  const configuredName = config.receiptPrinter || ''
  const deviceName = await resolvePrinterName(configuredName)
  if (configuredName && !deviceName) {
    return { success: false, error: `Receipt printer not found: ${configuredName}` }
  }
  const is80 = options.paperSize !== 'A4'
  return printHtmlSilently(html, {
    silent: true,
    printBackground: true,
    deviceName: deviceName || undefined,
    margins: { marginType: 'none' },
    pageSize: is80 ? { width: 80000, height: 297000 } : 'A4',
    scaleFactor: 90,
  })
})

// Print a barcode/label HTML string silently to the configured barcode
// printer (falls back to the system default if none is set).
ipcMain.handle('printers:print-barcode', async (_event, html, options = {}) => {
  const config = readConfig()
  const configuredName = config.barcodePrinter || ''
  const deviceName = await resolvePrinterName(configuredName)
  if (configuredName && !deviceName) {
    return { success: false, error: `Barcode printer not found: ${configuredName}` }
  }
  return printHtmlSilently(html, {
    silent: true,
    printBackground: true,
    deviceName: deviceName || undefined,
    margins: { marginType: 'none' },
    pageSize: { width: 30000, height: 20000 },
    landscape: true,
    copies: Math.max(1, parseInt(options.copies, 10) || 1),
  })
})

