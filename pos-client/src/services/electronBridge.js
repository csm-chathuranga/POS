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
}
