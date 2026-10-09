// Shared Clerk session-token authentication for all API routes.
// Identity is always derived from the verified Clerk JWT `sub`.
import { verifyToken } from '@clerk/backend';

const BASE_CLOCK_SKEW_MS = 5_000;
const MAX_DRIFT_MS = 120_000;
const DRIFT_CACHE_MS = 5 * 60_000;
const CLOCK_REASON_EXPIRED = 'token-expired';
const CLOCK_REASON_NOT_ACTIVE_YET = 'token-not-active-yet';
const CLOCK_REASON_IAT_IN_FUTURE = 'token-iat-in-the-future';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized: Invalid or expired authentication token') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** Extract the Clerk session JWT: Authorization: Bearer first, then __session cookie. */
export function getBearerToken(headers) {
  const authHeader = headers.authorization || headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cookieHeader = headers.cookie || headers.Cookie;
  if (typeof cookieHeader === 'string') {
    const match = cookieHeader.match(/__session=([^;]+)/);
    if (match && match[1]) return match[1];
  }
  return undefined;
}

let driftSample = null;
let warnedAtMs = 0;

async function measureClockOffsetMs() {
  try {
    const res = await fetch('https://api.clerk.com/v1/health', { method: 'GET', cache: 'no-store' });
    const dateHeader = res.headers.get('date');
    const serverMs = dateHeader ? Date.parse(dateHeader) : NaN;
    if (!Number.isFinite(serverMs)) return null;
    return serverMs - Date.now();
  } catch {
    return null;
  }
}

async function getClockOffsetMs() {
  const now = Date.now();
  if (driftSample && now - driftSample.at < DRIFT_CACHE_MS) return driftSample.offsetMs;
  const offsetMs = await measureClockOffsetMs();
  if (offsetMs === null) return null;
  driftSample = { offsetMs, at: now };
  return offsetMs;
}

function warnClockDrift(offsetMs) {
  const now = Date.now();
  if (now - warnedAtMs < DRIFT_CACHE_MS) return;
  warnedAtMs = now;
  const seconds = Math.round(Math.abs(offsetMs) / 1000);
  const direction = offsetMs > 0 ? 'BEHIND' : 'AHEAD of';
  console.warn(
    `[auth:clock] Local system clock is ~${seconds}s ${direction} Clerk's authoritative time. ` +
      `JWT time claims were re-checked against the measured offset; this is a machine clock problem, ` +
      `not an auth problem. Fix it (Windows, elevated): w32tm /resync  ·  macOS/Linux: sudo ntpdate -u time.windows.com`
  );
}

function errorReason(err) {
  if (err && typeof err === 'object' && 'reason' in err) {
    const reason = err.reason;
    if (typeof reason === 'string') return reason;
  }
  return undefined;
}

/** Verify a Clerk session JWT and return its verified subject. */
export async function verifySessionToken(token, secretKey) {
  try {
    const verified = await verifyToken(token, { secretKey, clockSkewInMs: BASE_CLOCK_SKEW_MS });
    if (!verified || !verified.sub) throw new UnauthorizedError();
    return verified.sub;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    const reason = errorReason(err);
    const isClockReason =
      reason === CLOCK_REASON_EXPIRED ||
      reason === CLOCK_REASON_NOT_ACTIVE_YET ||
      reason === CLOCK_REASON_IAT_IN_FUTURE;
    if (!isClockReason) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn(`[auth:session] Clerk token rejected: ${detail}`);
      throw new UnauthorizedError();
    }

    const offsetMs = await getClockOffsetMs();
    const localBehind = reason !== CLOCK_REASON_EXPIRED;
    const explainsFailure = offsetMs !== null && (localBehind ? offsetMs > 0 : offsetMs < 0);
    if (!explainsFailure) {
      console.warn(
        `[auth:session] Token rejected for time claim (${reason}) but no local clock drift could be ` +
          `measured that explains it; refusing to widen verification.`
      );
      throw new UnauthorizedError();
    }

    const drift = Math.min(Math.abs(offsetMs), MAX_DRIFT_MS);
    const correctedSkew = BASE_CLOCK_SKEW_MS + drift;
    warnClockDrift(offsetMs);

    try {
      const verified = await verifyToken(token, { secretKey, clockSkewInMs: correctedSkew });
      if (!verified || !verified.sub) throw new UnauthorizedError();
      return verified.sub;
    } catch (retryErr) {
      if (retryErr instanceof UnauthorizedError) throw retryErr;
      const detail = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.warn(`[auth:session] Clerk token still rejected after clock correction: ${detail}`);
      throw new UnauthorizedError();
    }
  }
}

/** Authenticate a request and return the verified Clerk user id. */
export async function authenticateRequest(headers, secretKey) {
  const token = getBearerToken(headers);
  if (!token) throw new UnauthorizedError('Unauthorized: Missing authentication token');
  return verifySessionToken(token, secretKey);
}
