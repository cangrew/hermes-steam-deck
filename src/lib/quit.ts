/**
 * Closes the app. When served by the Deck launcher's control server, hitting
 * `/__exit__` tells it to shut down the browser + server together (the reliable
 * path on a Steam Deck). `window.close()` is a best-effort fallback for browsers
 * launched in --app mode; in a normal dev tab it simply does nothing.
 */
export async function quitApp(): Promise<void> {
  try {
    await fetch("/__exit__", { method: "POST" });
  } catch {
    /* not running under the kiosk control server */
  }
  try {
    window.close();
  } catch {
    /* ignore */
  }
}
