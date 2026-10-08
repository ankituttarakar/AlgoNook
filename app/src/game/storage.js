// AlgoNook — localStorage: WRITE-ONLY CACHE for authenticated progress.
//
// STORAGE CLASSIFICATION (cross-browser persistence fix):
//   1. SERVER STATE (authoritative)  — Neon Postgres, via /api/progress only.
//      Identity comes from the verified Clerk session token; the client never
//      chooses whose data it is reading or writing.
//   2. CACHE (this file, WRITE-ONLY) — algonook.save.v1 is a best-effort mirror
//      of the last known server snapshot. GameContext NEVER reads it back:
//      startup state starts empty and is REPLACED by the server snapshot
//      (hydration). No offline resume, no merge, no promotion over server data.
//   3. TEMPORARY UI STATE           — session-only keys (e.g. boot flags,
//      ephemeral UI prefs) never used for progress.
//
// Keys under management:
//   algonook.save.v1  — progress cache (write-only, this file)
//   bytebound.save.v1 — LEGACY progress key, purged (never read)
const CACHE_KEY = 'algonook.save.v1';
const LEGACY_KEYS = ['bytebound.save.v1'];

/**
 * Mirror the latest state to localStorage. Never a source of truth.
 * Also purges legacy keys so no pre-migration snapshot lingers on the device.
 */
export function writeSave(save) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(save));
    for (const key of LEGACY_KEYS) {
      if (localStorage.getItem(key) !== null) localStorage.removeItem(key);
    }
  } catch {
    // storage full / private mode — game keeps running in memory
  }
}

/**
 * Remove the progress cache (used on explicit reset and sign-out).
 */
export function wipeSave() {
  try {
    localStorage.removeItem(CACHE_KEY);
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch { /* noop */ }
}
