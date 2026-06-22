const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,

    /** Returns array of { name, displayName, isDefault, status } */
    getPrinters: () => ipcRenderer.invoke('get-printers'),

    /**
     * Print the current page silently.
     * @param {string} printerName  - deviceName from getPrinters(); empty = default printer
     * @param {object} options      - optional overrides (copies, color, etc.)
     */
    printReceipt: (printerName, options = {}) =>
        ipcRenderer.invoke('print-receipt', printerName, options),

    /** Print a barcode label (30mm × 20mm) silently */
    printBarcode: (printerName) =>
        ipcRenderer.invoke('print-barcode', printerName),

    /**
     * Open the native Electron printer-selection modal, then print silently
     * to whichever printer the user picks.
     */
    openPrinterDialog: () => ipcRenderer.invoke('open-printer-dialog'),

    /** Export SQLite database to a user-chosen file */
    exportDatabase: () => ipcRenderer.invoke('db:export'),

    /** Import a SQLite backup file and run migrations */
    importDatabase: () => ipcRenderer.invoke('db:import'),

    /** Run Laravel migrations on the current database */
    runMigrations: () => ipcRenderer.invoke('db:migrate'),


});
