//#region electron/preload.js
var { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronConfig", ipcRenderer.sendSync("config:get-sync"));
contextBridge.exposeInMainWorld("electronAPI", {
	isElectron: true,
	triggerSync: () => ipcRenderer.invoke("sync:trigger"),
	reportSyncStatus: (status) => ipcRenderer.send("sync:status", status),
	onSyncRun: (cb) => {
		ipcRenderer.on("sync:run", cb);
		return () => ipcRenderer.removeListener("sync:run", cb);
	},
	getConfig: () => ipcRenderer.invoke("config:get"),
	saveConfig: (config) => ipcRenderer.invoke("config:save", config),
	listPrinters: () => ipcRenderer.invoke("printers:list"),
	openSettings: () => ipcRenderer.invoke("settings:open"),
	printReceiptHtml: (html, options) => ipcRenderer.invoke("printers:print-receipt-html", html, options),
	printBarcode: (html, options) => ipcRenderer.invoke("printers:print-barcode", html, options)
});
//#endregion
