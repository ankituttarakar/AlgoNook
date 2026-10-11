import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

export const EXECUTION_REQUEST_LIMIT = 12;
export const EXECUTION_WINDOW_MS = 60_000;
export const EXECUTION_CONCURRENCY_LIMIT = 2;
export const EXECUTION_LEASE_MS = 35_000;

const MAX_LOCAL_USERS = 10_000;
const localAdmission = new Map();

function retryAfterSeconds(milliseconds) {
  return Math.max(1, Math.ceil(milliseconds / 1000));
}

function pruneLocalAdmission(now) {
  for (const [userId, state] of localAdmission) {
    for (const [leaseId, expiresAt] of state.leases) {
      if (expiresAt <= now) state.leases.delete(leaseId);
    }
    if (state.leases.size === 0 && now - state.windowStartedAt >= EXECUTION_WINDOW_MS) {
      localAdmission.delete(userId);
    }
  }
}

function reserveLocalExecution(userId, now) {
  pruneLocalAdmission(now);
  let state = localAdmission.get(userId);
  if (!state) {
    if (localAdmission.size >= MAX_LOCAL_USERS) {
      return { admitted: false, retryAfterSeconds: 1 };
    }
    state = { windowStartedAt: now, requestCount: 0, leases: new Map() };
    localAdmission.set(userId, state);
  }

  if (now - state.windowStartedAt >= EXECUTION_WINDOW_MS) {
    state.windowStartedAt = now;
    state.requestCount = 0;
  }
  if (state.requestCount >= EXECUTION_REQUEST_LIMIT) {
    return {
      admitted: false,
      retryAfterSeconds: retryAfterSeconds(state.windowStartedAt + EXECUTION_WINDOW_MS - now),
    };
  }
  if (state.leases.size >= EXECUTION_CONCURRENCY_LIMIT) {
    const nextLeaseExpiry = Math.min(...state.leases.values());
    return { admitted: false, retryAfterSeconds: retryAfterSeconds(nextLeaseExpiry - now) };
  }

  state.requestCount += 1;
  const leaseId = randomUUID();
  state.leases.set(leaseId, now + EXECUTION_LEASE_MS);
  return { admitted: true, leaseId };
}

export async function reserveCodeExecution(userId, env = process.env) {
  if (!env.DATABASE_URL) {
    if (env.NODE_ENV === 'production' || env.VERCEL === '1') {
      throw new Error('Shared execution admission storage is unavailable.');
    }
    return reserveLocalExecution(userId, Date.now());
  }

  const sql = neon(env.DATABASE_URL);
  const leaseId = randomUUID();
  const reserved = await sql`
    INSERT INTO code_execution_admission
      (clerk_user_id, window_started_at, request_count, active_leases, updated_at)
    VALUES (
      ${userId}, NOW(), 1,
      jsonb_build_array(jsonb_build_object(
        'id', ${leaseId},
        'expiresAt', NOW() + (${EXECUTION_LEASE_MS} * INTERVAL '1 millisecond')
      )),
      NOW()
    )
    ON CONFLICT (clerk_user_id) DO UPDATE SET
      window_started_at = CASE
        WHEN code_execution_admission.window_started_at <= NOW() - (${EXECUTION_WINDOW_MS} * INTERVAL '1 millisecond') THEN NOW()
        ELSE code_execution_admission.window_started_at
      END,
      request_count = CASE
        WHEN code_execution_admission.window_started_at <= NOW() - (${EXECUTION_WINDOW_MS} * INTERVAL '1 millisecond') THEN 1
        ELSE code_execution_admission.request_count + 1
      END,
      active_leases = COALESCE((
        SELECT jsonb_agg(active_lease.value)
        FROM jsonb_array_elements(code_execution_admission.active_leases) AS active_lease(value)
        WHERE (active_lease.value->>'expiresAt')::timestamptz > NOW()
      ), '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', ${leaseId},
        'expiresAt', NOW() + (${EXECUTION_LEASE_MS} * INTERVAL '1 millisecond')
      )),
      updated_at = NOW()
    WHERE (
      code_execution_admission.window_started_at <= NOW() - (${EXECUTION_WINDOW_MS} * INTERVAL '1 millisecond')
      OR code_execution_admission.request_count < ${EXECUTION_REQUEST_LIMIT}
    )
    AND (
      SELECT COUNT(*)
      FROM jsonb_array_elements(code_execution_admission.active_leases) AS active_lease(value)
      WHERE (active_lease.value->>'expiresAt')::timestamptz > NOW()
    ) < ${EXECUTION_CONCURRENCY_LIMIT}
    RETURNING clerk_user_id;
  `;
  if (reserved.length > 0) return { admitted: true, leaseId };

  const rejected = await sql`
    SELECT CASE
      WHEN window_started_at > NOW() - (${EXECUTION_WINDOW_MS} * INTERVAL '1 millisecond')
        AND request_count >= ${EXECUTION_REQUEST_LIMIT}
      THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
        window_started_at + (${EXECUTION_WINDOW_MS} * INTERVAL '1 millisecond') - NOW()
      )))::integer)
      ELSE COALESCE(
        GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
          (SELECT MIN((active_lease.value->>'expiresAt')::timestamptz)
           FROM jsonb_array_elements(active_leases) AS active_lease(value)
           WHERE (active_lease.value->>'expiresAt')::timestamptz > NOW()) - NOW()
        )))::integer),
        1
      )
    END AS retry_after_seconds
    FROM code_execution_admission
    WHERE clerk_user_id = ${userId};
  `;
  return {
    admitted: false,
    retryAfterSeconds: Number(rejected[0]?.retry_after_seconds) || 1,
  };
}

export async function releaseCodeExecution(userId, leaseId, env = process.env) {
  if (!env.DATABASE_URL) {
    localAdmission.get(userId)?.leases.delete(leaseId);
    return;
  }
  const sql = neon(env.DATABASE_URL);
  await sql`
    UPDATE code_execution_admission
    SET active_leases = COALESCE((
      SELECT jsonb_agg(active_lease.value)
      FROM jsonb_array_elements(active_leases) AS active_lease(value)
      WHERE active_lease.value->>'id' <> ${leaseId}
    ), '[]'::jsonb),
    updated_at = NOW()
    WHERE clerk_user_id = ${userId};
  `;
}
