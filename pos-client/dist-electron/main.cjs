//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let electron = require("electron");
let path = require("path");
path = __toESM(path, 1);
let fs = require("fs");
fs = __toESM(fs, 1);
//#region electron/main.js
var __dirname$1 = __dirname;
var isDev = !electron.app.isPackaged;
var mainWindow;
function resolvePreloadPath() {
	const candidates = ["preload.js", "preload.mjs"];
	for (const name of candidates) {
		const candidate = path.default.join(__dirname$1, name);
		if (fs.default.existsSync(candidate)) return candidate;
	}
	return path.default.join(__dirname$1, candidates[0]);
}
var DEFAULT_CONFIG = {
	backendUrl: "",
	receiptPrinter: "",
	barcodePrinter: ""
};
var _configCache = null;
var _printerListCache = null;
var _printerListCacheAt = 0;
var PRINTER_LIST_CACHE_TTL = 3e4;
function getConfigPath() {
	return path.default.join(electron.app.getPath("userData"), "app-config.json");
}
function readConfig() {
	if (_configCache) return _configCache;
	const configPath = getConfigPath();
	try {
		if (fs.default.existsSync(configPath)) _configCache = {
			...DEFAULT_CONFIG,
			...JSON.parse(fs.default.readFileSync(configPath, "utf8"))
		};
		else _configCache = { ...DEFAULT_CONFIG };
	} catch {
		_configCache = { ...DEFAULT_CONFIG };
	}
	if (_configCache.printerName && !_configCache.receiptPrinter) _configCache.receiptPrinter = _configCache.printerName;
	return _configCache;
}
async function resolvePrinterName(configuredName) {
	if (!configuredName) return "";
	if (!_printerListCache || Date.now() - _printerListCacheAt > PRINTER_LIST_CACHE_TTL) {
		const wc = mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : null;
		_printerListCache = wc ? await wc.getPrintersAsync().catch(() => []) : [];
		_printerListCacheAt = Date.now();
	}
	const names = _printerListCache.map((p) => p.name);
	const lower = configuredName.toLowerCase();
	return names.find((n) => n === configuredName) || names.find((n) => n.toLowerCase() === lower) || names.find((n) => n.toLowerCase().includes(lower)) || "";
}
function printHtmlSilently(html, printOptions) {
	return new Promise((resolve) => {
		const win = new electron.BrowserWindow({
			show: false,
			webPreferences: { sandbox: false }
		});
		let settled = false;
		function finish(success, error) {
			if (settled) return;
			settled = true;
			if (!win.isDestroyed()) win.destroy();
			resolve({
				success,
				error: success ? void 0 : error || "Unknown print failure"
			});
		}
		const timeout = setTimeout(() => finish(false, "Print timed out"), 15e3);
		win.webContents.once("did-fail-load", (_e, code, desc) => {
			clearTimeout(timeout);
			finish(false, `Failed to load content (${code}: ${desc})`);
		});
		win.webContents.once("did-finish-load", () => {
			win.webContents.print(printOptions, (success, reason) => {
				clearTimeout(timeout);
				finish(success, reason);
			});
		});
		win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
	});
}
function writeConfig(config) {
	_configCache = {
		...DEFAULT_CONFIG,
		...config
	};
	fs.default.writeFileSync(getConfigPath(), JSON.stringify(_configCache, null, 2));
	return _configCache;
}
function buildSettingsOverlayScript(printers, config) {
	const printerOptions = (selected) => printers.map((name) => {
		return `<option value="${name}"${name === selected ? " selected" : ""}>${name}</option>`;
	}).join("");
	const c = JSON.stringify(config);
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
        <label style="display:block;margin-bottom:20px">
          <span style="display:block;font-size:12px;font-weight:500;color:#555;margin-bottom:4px">Backend API URL</span>
          <input id="ls-backend-url" type="text" value="${(config.backendUrl || "").replace(/"/g, "&quot;")}" placeholder="https://api.example.com"
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
`;
}
async function openSettingsOverlay() {
	if (!mainWindow || mainWindow.isDestroyed()) return;
	const script = buildSettingsOverlayScript((await mainWindow.webContents.getPrintersAsync().catch(() => [])).map((p) => p.name), readConfig());
	mainWindow.webContents.executeJavaScript(script).catch(() => {});
}
function createWindow() {
	mainWindow = new electron.BrowserWindow({
		width: 1280,
		height: 800,
		minWidth: 960,
		minHeight: 600,
		webPreferences: {
			preload: resolvePreloadPath(),
			contextIsolation: true,
			nodeIntegration: false
		},
		autoHideMenuBar: true
	});
	if (isDev) mainWindow.loadURL("http://localhost:5173");
	else mainWindow.loadFile(path.default.join(__dirname$1, "../dist/index.html"));
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		electron.shell.openExternal(url);
		return { action: "deny" };
	});
}
function buildAppMenu() {
	return electron.Menu.buildFromTemplate([{
		label: "Settings",
		submenu: [
			{
				label: "Backend && Printer Settings…",
				accelerator: "CmdOrCtrl+Shift+P",
				click: () => openSettingsOverlay()
			},
			{ type: "separator" },
			{ role: "reload" },
			{ role: "toggleDevTools" },
			{ role: "quit" }
		]
	}]);
}
electron.app.whenReady().then(() => {
	electron.Menu.setApplicationMenu(buildAppMenu());
	createWindow();
	electron.app.on("activate", () => {
		if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
electron.app.on("window-all-closed", () => {
	if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.handle("sync:trigger", () => {
	mainWindow?.webContents.send("sync:run");
});
electron.ipcMain.on("sync:status", (_, { pending }) => {
	if (!mainWindow) return;
	const title = pending > 0 ? `Lumac POS  •  ${pending} pending sync` : "Lumac POS";
	mainWindow.setTitle(title);
});
electron.ipcMain.on("config:get-sync", (event) => {
	event.returnValue = readConfig();
});
electron.ipcMain.handle("config:get", () => readConfig());
electron.ipcMain.handle("config:save", (_, config) => {
	const saved = writeConfig(config);
	mainWindow?.webContents.reload();
	return {
		success: true,
		config: saved
	};
});
electron.ipcMain.handle("printers:list", async (event) => {
	return (await (mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : event.sender).getPrintersAsync().catch(() => [])).map((p) => p.name);
});
electron.ipcMain.handle("settings:open", () => openSettingsOverlay());
electron.ipcMain.handle("printers:print-receipt-html", async (_event, html, options = {}) => {
	const configuredName = readConfig().receiptPrinter || "";
	const deviceName = await resolvePrinterName(configuredName);
	if (configuredName && !deviceName) return {
		success: false,
		error: `Receipt printer not found: ${configuredName}`
	};
	const is80 = options.paperSize !== "A4";
	return printHtmlSilently(html, {
		silent: true,
		printBackground: true,
		deviceName: deviceName || void 0,
		margins: { marginType: "none" },
		pageSize: is80 ? {
			width: 8e4,
			height: 297e3
		} : "A4"
	});
});
electron.ipcMain.handle("printers:print-barcode", async (_event, html, options = {}) => {
	const configuredName = readConfig().barcodePrinter || "";
	const deviceName = await resolvePrinterName(configuredName);
	if (configuredName && !deviceName) return {
		success: false,
		error: `Barcode printer not found: ${configuredName}`
	};
	return printHtmlSilently(html, {
		silent: true,
		printBackground: true,
		deviceName: deviceName || void 0,
		margins: { marginType: "none" },
		pageSize: {
			width: 3e4,
			height: 2e4
		},
		landscape: true,
		copies: Math.max(1, parseInt(options.copies, 10) || 1)
	});
});
//#endregion
