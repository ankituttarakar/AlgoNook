import { createHmac, timingSafeEqual } from 'node:crypto';

export const RUNNER_MAX_CLOCK_SKEW_MS = 30_000;

export function createRunnerSignature(secret, timestamp, nonce, body) {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${nonce}.${body}`)
    .digest('hex');
}

export function verifyRunnerSignature({ secret, timestamp, nonce, signature, body, now = Date.now() }) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) return false;
  if (!/^\d{10,16}$/.test(String(timestamp || ''))) return false;
  if (Math.abs(now - Number(timestamp)) > RUNNER_MAX_CLOCK_SKEW_MS) return false;
  if (typeof nonce !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(nonce)) return false;
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = Buffer.from(createRunnerSignature(secret, timestamp, nonce, body), 'hex');
  const supplied = Buffer.from(signature, 'hex');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
