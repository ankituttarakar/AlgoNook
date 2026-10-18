import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

export const EXECUTION_REQUEST_LIMIT = 12;
export const EXECUTION_WINDOW_MS = 60_000;
export const EXECUTION_CONCURRENCY_LIMIT = 2;
export const EXECUTION_LEASE_MS = 35_000;

const MAX_LOCAL_USERS = 10_000;
const localAdmission = new Map();

const ADMISSION_STAGES = new Set(['configuration', 'client_initialization', 'reservation_query', 'rejection_query', 'lease_release']);
const NETWORK_ERROR_CODES = new Set([
  'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
  'ECONNABORTED', 'EPIPE', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET',
]);

class ExecutionAdmissionFailure extends Error {
  constructor(stage, cause) {
    super('Execution admission operation failed.');
    this.name = 'ExecutionAdmissionFailure';
    this.stage = ADMISSION_STAGES.has(stage) ? stage : 'configuration';
    this.cause = cause;
  }
}

function runAdmissionStage(stage, operation) {
  return Promise.resolve().then(operation).catch((error) => {
    if (error instanceof ExecutionAdmissionFailure) throw error;
    throw new ExecutionAdmissionFailure(stage, error);
  });
}

/** Returns fixed, non-sensitive fields only. Never include exception messages. */
export function getSafeAdmissionDiagnostic(error) {
  const stage = ADMISSION_STAGES.has(error?.stage) ? error.stage : 'configuration';
  const cause = error instanceof ExecutionAdmissionFailure ? error.cause : error;
  const chain = [];
  let current = cause;
  for (let depth = 0; current && depth < 4 && !chain.includes(current); depth += 1) {
    chain.push(current);
    current = current.cause || current.sourceError;
  }
  const causeName = chain[0]?.name;
  const errorType = ['NeonDbError', 'Error', 'TypeError', 'ReferenceError'].includes(causeName)
    ? causeName
    : error instanceof ExecutionAdmissionFailure ? 'ExecutionAdmissionFailure' : 'UnknownError';
  const codes = chain.map((item) => item?.code).filter((value) => typeof value === 'string');
  const code = codes.find((value) => NETWORK_ERROR_CODES.has(value));
  const sqlState = chain.map((item) => item?.sqlState).find((value) => typeof value === 'string' && /^[0-9A-Z]{5}$/.test(value));
  const postgresCode = codes.find((value) => /^[0-9A-Z]{5}$/.test(value));
  if (code) {
    return { stage, category: 'network', errorType, code };
  }
  if (typeof sqlState === 'string' && /^[0-9A-Z]{5}$/.test(sqlState)) {
    return { stage, category: 'database', errorType, sqlState };
  }
  if (postgresCode) {
    return { stage, category: 'database', errorType, sqlState: postgresCode };
  }
  return { stage, category: errorType === 'ExecutionAdmissionFailure' && stage === 'configuration' ? 'configuration' : 'unknown', errorType };
}

function retryAfterSeconds(milliseconds) {
  return Math.max(1, Math.ceil(milliseconds / 1000));
}

function pruneLocalAdmission(now) {
  for (const [userId, state] of localAdmission) {
    for (const [leaseId, lease] of state.leases) {
      if (lease.expiresAt <= now) state.leases.delete(leaseId);
    }
    if (state.leases.size === 0 && now - state.windowStartedAt >= EXECUTION_WINDOW_MS) {
      localAdmission.delete(userId);
    }
  }
}

function reserveLocalExecution(userId, now, requestIdentity) {
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
  const duplicateLease = requestIdentity && [...state.leases.values()].find((lease) =>
    lease.expiresAt > now
      && (lease.eventId === requestIdentity.eventId || lease.eventKey === requestIdentity.eventKey));
  if (duplicateLease) {
    return {
      admitted: false,
      duplicate: true,
      retryAfterSeconds: retryAfterSeconds(duplicateLease.expiresAt - now),
    };
  }
  if (state.requestCount >= EXECUTION_REQUEST_LIMIT) {
    return {
      admitted: false,
      retryAfterSeconds: retryAfterSeconds(state.windowStartedAt + EXECUTION_WINDOW_MS - now),
    };
  }
  if (state.leases.size >= EXECUTION_CONCURRENCY_LIMIT) {
    const nextLeaseExpiry = Math.min(...[...state.leases.values()].map((lease) => lease.expiresAt));
    return { admitted: false, retryAfterSeconds: retryAfterSeconds(nextLeaseExpiry - now) };
  }

  state.requestCount += 1;
  const leaseId = randomUUID();
  state.leases.set(leaseId, {
    expiresAt: now + EXECUTION_LEASE_MS,
    eventId: requestIdentity?.eventId,
    eventKey: requestIdentity?.eventKey,
  });
  return { admitted: true, leaseId };
}

export async function reserveCodeExecution(userId, env = process.env, requestIdentity = null) {
  if (!env.DATABASE_URL) {
    if (env.NODE_ENV === 'production' || env.VERCEL === '1') {
      const failure = new ExecutionAdmissionFailure('configuration', null);
      failure.message = 'Shared execution admission storage is unavailable.';
      throw failure;
    }
    return reserveLocalExecution(userId, Date.now(), requestIdentity);
  }

  const sql = await runAdmissionStage('client_initialization', () => neon(env.DATABASE_URL));
  const leaseId = randomUUID();
  const reserved = await runAdmissionStage('reservation_query', () => sql`
    INSERT INTO code_execution_admission
      (clerk_user_id, window_started_at, request_count, active_leases, updated_at)
    VALUES (
      ${userId}, NOW(), 1,
      jsonb_build_array(jsonb_build_object(
        'id', ${leaseId},
        'expiresAt', NOW() + (${EXECUTION_LEASE_MS} * INTERVAL '1 millisecond'),
        'eventId', ${requestIdentity?.eventId ?? null},
        'eventKey', ${requestIdentity?.eventKey ?? null}
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
        'expiresAt', NOW() + (${EXECUTION_LEASE_MS} * INTERVAL '1 millisecond'),
        'eventId', ${requestIdentity?.eventId ?? null},
        'eventKey', ${requestIdentity?.eventKey ?? null}
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
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(code_execution_admission.active_leases) AS active_lease(value)
      WHERE (active_lease.value->>'expiresAt')::timestamptz > NOW()
        AND (
          (${requestIdentity?.eventId ?? null}::text IS NOT NULL
            AND active_lease.value->>'eventId' = ${requestIdentity?.eventId ?? null})
          OR (${requestIdentity?.eventKey ?? null}::text IS NOT NULL
            AND active_lease.value->>'eventKey' = ${requestIdentity?.eventKey ?? null})
        )
    )
    RETURNING clerk_user_id;
  `);
  if (reserved.length > 0) return { admitted: true, leaseId };

  const rejected = await runAdmissionStage('rejection_query', () => sql`
    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(active_leases) AS active_lease(value)
      WHERE (active_lease.value->>'expiresAt')::timestamptz > NOW()
        AND (
          (${requestIdentity?.eventId ?? null}::text IS NOT NULL
            AND active_lease.value->>'eventId' = ${requestIdentity?.eventId ?? null})
          OR (${requestIdentity?.eventKey ?? null}::text IS NOT NULL
            AND active_lease.value->>'eventKey' = ${requestIdentity?.eventKey ?? null})
        )
    ) AS duplicate,
    CASE
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
  `);
  return {
    admitted: false,
    duplicate: rejected[0]?.duplicate === true,
    retryAfterSeconds: Number(rejected[0]?.retry_after_seconds) || 1,
  };
}

export async function releaseCodeExecution(userId, leaseId, env = process.env) {
  if (!env.DATABASE_URL) {
    localAdmission.get(userId)?.leases.delete(leaseId);
    return;
  }
  const sql = await runAdmissionStage('client_initialization', () => neon(env.DATABASE_URL));
  await runAdmissionStage('lease_release', () => sql`
    UPDATE code_execution_admission
    SET active_leases = COALESCE((
      SELECT jsonb_agg(active_lease.value)
      FROM jsonb_array_elements(active_leases) AS active_lease(value)
      WHERE active_lease.value->>'id' <> ${leaseId}
    ), '[]'::jsonb),
    updated_at = NOW()
    WHERE clerk_user_id = ${userId};
  `);
}
