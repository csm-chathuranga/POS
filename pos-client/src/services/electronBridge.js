/**
 * electronBridge — safe wrapper around window.electronAPI.
 * Returns null for every method when running in a normal browser.
 * Use isElectron() to conditionally enable Electron-only behaviour.
 */

export const isElectron = () => !!window.electronAPI?.isElectron

export const electronAPI = {
  triggerSync:      ()  => window.electronAPI?.triggerSync(),
  reportSyncStatus: (s) => window.electronAPI?.reportSyncStatus(s),
  onSyncRun:        (cb) => window.electronAPI?.onSyncRun(cb) ?? (() => {}),

  // Backend URL + printer settings
  getConfig:     ()       => window.electronAPI?.getConfig(),
  saveConfig:    (config) => window.electronAPI?.saveConfig(config),
  listPrinters:  ()       => window.electronAPI?.listPrinters(),
  openSettings:  ()       => window.electronAPI?.openSettings(),
}
