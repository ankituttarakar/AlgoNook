// Callsign: a cosmetic handle, never an identity. Identity comes only from the
// verified Clerk JWT `sub` on the server.

export const CALLSIGN_MAX_LENGTH = 14;
export const DEFAULT_CALLSIGN = 'OPERATOR';

const CALLSIGN_RE = /^[A-Za-z0-9_-]{1,14}$/;
const ID_LIKE_RE = /^(user_[A-Za-z0-9]*|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Normalize a callsign or return null when absent/invalid. */
export function normalizeCallsign(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toUpperCase();
  if (!value || !CALLSIGN_RE.test(value) || ID_LIKE_RE.test(value)) return null;
  return value;
}

/** True when the value may be stored/displayed as a callsign. */
export function isValidCallsign(raw) {
  return normalizeCallsign(raw) !== null;
}

/** Coerce any stored value into a displayable callsign. */
export function displayCallsign(raw) {
  const value = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  const cleaned = value.replace(/[^A-Z0-9_-]/g, '').slice(0, CALLSIGN_MAX_LENGTH);
  return cleaned || DEFAULT_CALLSIGN;
}
