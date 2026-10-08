// Callsign: a cosmetic handle, never an identity. Identity comes only from the
// verified Clerk JWT `sub` on the server. One rule, three consumers: BootScreen
// input, HUD display, and /api/progress + /api/sync-user validation.

export const CALLSIGN_MAX_LENGTH = 14;
export const DEFAULT_CALLSIGN = 'OPERATOR';

const CALLSIGN_RE = /^[A-Za-z0-9_-]{1,14}$/;
// Values that could be mistaken for an identifier (Clerk `user_...` ids, UUIDs)
// are rejected even though their characters are legal.
const ID_LIKE_RE =
  /^(user_[A-Za-z0-9]*|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Normalize and validate a raw callsign.
 * Returns the trimmed, uppercased callsign, or null when the value is absent
 * or not allowed. A null for an absent input means "no change" to a caller that
 * already owns a previous value.
 */
export function normalizeCallsign(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toUpperCase();
  if (!value || !CALLSIGN_RE.test(value) || ID_LIKE_RE.test(value)) return null;
  return value;
}

/** True when the value may be stored/displayed as a callsign. */
export function isValidCallsign(raw: unknown): boolean {
  return normalizeCallsign(raw) !== null;
}

/**
 * Coerce any stored value (legacy DB rows included) into something displayable.
 * Unlike normalizeCallsign this never returns null: it strips illegal
 * characters instead, then falls back to the default callsign.
 */
export function displayCallsign(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  const cleaned = value.replace(/[^A-Z0-9_-]/g, '').slice(0, CALLSIGN_MAX_LENGTH);
  return cleaned || DEFAULT_CALLSIGN;
}
