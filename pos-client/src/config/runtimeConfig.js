/**
 * runtimeConfig — resolves the backend API URL at runtime.
 *
 * In the packaged Electron app, the URL can be set via the native
 * Settings modal (Ctrl+Shift+P) without rebuilding — it's exposed on
 * `window.electronConfig` by the preload script before this module loads.
 * In the browser (or when unset), it falls back to the build-time
 * VITE_API_URL env var.
 */
export function getApiUrl() {
  if (typeof window !== 'undefined' && window.electronConfig?.backendUrl) {
    return window.electronConfig.backendUrl
  }
  return import.meta.env.VITE_API_URL
}
