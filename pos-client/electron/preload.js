const { contextBridge, ipcRenderer } = require('electron')

// Snapshot of the backend URL / printer config, read synchronously so it's
// available as window.electronConfig before any renderer code executes.
contextBridge.exposeInMainWorld('electronConfig', ipcRenderer.sendSync('config:get-sync'))

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Trigger a manual sync from the UI
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),

  // Send pending count to main process (updates title bar)
  reportSyncStatus: (status) => ipcRenderer.send('sync:status', status),

  // Listen for main process asking renderer to run a sync
  onSyncRun: (cb) => {
    ipcRenderer.on('sync:run', cb)
    return () => ipcRenderer.removeListener('sync:run', cb)
  },

  // Backend URL + printer settings
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  listPrinters: () => ipcRenderer.invoke('printers:list'),
  openSettings: () => ipcRenderer.invoke('settings:open'),

  // Silent printing (uses the receipt/barcode printers chosen in Settings)
  printReceiptHtml: (html, options) => ipcRenderer.invoke('printers:print-receipt-html', html, options),
  printBarcode: (html, options) => ipcRenderer.invoke('printers:print-barcode', html, options),
})

