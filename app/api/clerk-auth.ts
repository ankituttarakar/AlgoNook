// AlgoNook — shared Clerk session-token authentication for all API routes.
//
// Identity is ALWAYS derived from the verified Clerk JWT (`sub`).
// Client-provided user IDs are never trusted. Verification is never bypassed.
//
// CLOCK DRIFT ROOT CAUSE:
//   Clerk signs `nbf`/`iat`/`exp` with Clerk's own (authoritative) clock. If the
//   local machine's clock is wrong (e.g. Windows time service never synchronized),
//   every otherwise-valid session token is rejected with:
//     "JWT cannot be used prior to not before date claim (nbf)"
//   instead of disabling verification or applying a blind huge skew, we MEASURE
//   the real offset against Clerk's API `Date` header (cached for 5 minutes) and
//   apply a signed, capped correction ONLY in the direction that explains the
//   failure, and log a loud warning so the operator fixes the OS clock.
import { verifyToken } from '@clerk/backend';

export type RequestHeaders = Record<string, string | string[] | undefined>;

const BASE_CLOCK_SKEW_MS = 5_000;
// Hard cap on measured drift we are willing to compensate for.
const MAX_DRIFT_MS = 120_000;
const DRIFT_CACHE_MS = 5 * 60_000;
// Failure reasons that can be explained by an inaccurate local clock.
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
export function getBearerToken(headers: RequestHeaders): string | undefined {
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

type DriftSample = { offsetMs: number; at: number };
let driftSample: DriftSample | null = null;
let warnedAtMs = 0;

/**
 * offsetMs = authoritativeTime - localTime.
 * Positive => local clock is BEHIND. Negative => local clock is AHEAD.
 */
async function measureClockOffsetMs(): Promise<number | null> {
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

async function getClockOffsetMs(): Promise<number | null> {
  const now = Date.now();
  if (driftSample && now - driftSample.at < DRIFT_CACHE_MS) return driftSample.offsetMs;
  const offsetMs = await measureClockOffsetMs();
  if (offsetMs === null) return null;
  driftSample = { offsetMs, at: now };
  return offsetMs;
}

function warnClockDrift(offsetMs: number) {
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

function errorReason(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'reason' in err) {
    const reason = (err as { reason?: unknown }).reason;
    if (typeof reason === 'string') return reason;
  }
  return undefined;
}

/**
 * Verify a Clerk session token and return the verified user id (JWT `sub`).
 *
 * Fast path: standard verification with a 5s skew.
 * Slow path: only when the token is rejected solely for a TIME claim, measure the
 * real local-vs-Clerk clock offset and retry once with a signed correction
 * (base + measured drift, capped). Signature, audience, authorized-party and
 * subject checks are unchanged and are never relaxed.
 */
export async function verifySessionToken(token: string, secretKey: string): Promise<string> {
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

    // Time-claim rejection: find out which way the local clock is actually wrong.
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

/**
 * Authenticate a request and return the verified Clerk user id.
 * Throws UnauthorizedError when no valid session token is present.
 */
export async function authenticateRequest(headers: RequestHeaders, secretKey: string): Promise<string> {
  const token = getBearerToken(headers);
  if (!token) throw new UnauthorizedError('Unauthorized: Missing authentication token');
  return verifySessionToken(token, secretKey);
}
