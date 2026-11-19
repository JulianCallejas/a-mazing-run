/**
 * Debug tooling is enabled by loading the app with `?debug` in the URL. The
 * flag is captured once at startup so it survives client-side navigation;
 * normal play never enables it.
 */
const DEBUG_ENABLED = (() => {
  try {
    return new URLSearchParams(window.location.search).has('debug');
  } catch {
    return false;
  }
})();

export const diagnosticsEnabled = (): boolean => DEBUG_ENABLED;
