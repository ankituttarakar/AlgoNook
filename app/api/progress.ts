import { neon } from '@neondatabase/serverless';
import { authenticateRequest } from '../server/clerk-auth.mjs';
import { checkDatabaseSchema } from '../server/schemaHealth.mjs';
import { DEFAULT_CALLSIGN, normalizeCallsign } from '../src/lib/callsign.mjs';

type Headers = Record<string, string | string[] | undefined>;
type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function requiredNumber(value: unknown, field: string): number {
  const number = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) {
    throw new Error(`Progress field ${field} is missing or invalid.`);
  }
  return number;
}

function nullableTimestamp(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null;
  const timestamp = new Date(value as string | number | Date).getTime();
  if (!Number.isFinite(timestamp)) throw new Error(`Progress field ${field} contains an invalid timestamp.`);
  return timestamp;
}

function validateCallsign(raw: unknown): string | null {
  return normalizeCallsign(raw);
}

async function resolveNeonUserId(sql: SqlTag, clerkId: string): Promise<string> {
  const users = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1;`;
  if (users.length > 0) return users[0].id;
  const created = await sql`
    WITH user_row AS (
      INSERT INTO users (clerk_id, callsign, updated_at)
      VALUES (${clerkId}, ${DEFAULT_CALLSIGN}, NOW())
      ON CONFLICT (clerk_id) DO UPDATE SET clerk_id = EXCLUDED.clerk_id
      RETURNING id
    ),
    initial_progress AS (
      INSERT INTO user_progress (user_id, xp, level, sound, booted, created_at, updated_at)
      SELECT id, 0, 1, TRUE, FALSE, NOW(), NOW() FROM user_row
      ON CONFLICT (user_id) DO NOTHING
      RETURNING user_id
    )
    SELECT id FROM user_row;
  `;
  if (!created[0]?.id) throw new Error('Authenticated user provisioning returned no database identity.');
  return created[0].id;
}

export interface ProgressGetResult {
  status: number;
  data: {
    ok: boolean;
    progress?: { xp: number; level: number; sound: boolean; booted: boolean; generation: number; updatedAt: number; callsign?: string };
    missions?: Record<string, { stars: number; mistakes: number | null; clearedAt: number | null }>;
    skills?: Record<
      string,
      {
        skill: string;
        masteryLevel: string;
        attempts: number;
        successfulIndependentSolves: number;
        hintUsage: { totalHintsUsed: number; highestLevelHintRevealed: number; ladderReveals: number[] };
        lastPracticed: number | null;
        reviewDue: number | null;
      }
    >;
    topics?: Record<string, { stages: Record<string, boolean>; startedAt: number | null; completedAt: number | null }>;
    error?: string;
  };
}

type ProgressDependencies = {
  authenticate?: typeof authenticateRequest;
  createSql?: (connectionString: string) => SqlTag;
  checkSchema?: typeof checkDatabaseSchema;
};

async function schemaFailure(
  databaseUrl: string,
  dependencies: ProgressDependencies,
): Promise<ProgressGetResult | null> {
  let health: Awaited<ReturnType<typeof checkDatabaseSchema>>;
  try {
    health = await (dependencies.checkSchema || checkDatabaseSchema)(
      databaseUrl,
    );
  } catch (error) {
    console.error('[database:schema] progress health check failed:', error instanceof Error ? error.message : error);
    return { status: 503, data: { ok: false, error: 'Database is unavailable.' } };
  }
  if (!health.compatible) {
    return { status: 503, data: { ok: false, error: 'Database schema is incompatible. Apply pending migrations.' } };
  }
  return null;
}

async function getClerkId(headers: Headers, secretKey: string, auth: typeof authenticateRequest) {
  try {
    return await auth(headers, secretKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.startsWith('Unauthorized')) console.warn(`[auth:progress] ${message}`);
    return null;
  }
}

export async function handleGetProgress(
  headers: Headers = {},
  env: NodeJS.ProcessEnv = process.env,
  dependencies: ProgressDependencies = {},
): Promise<ProgressGetResult> {
  const secretKey = env.CLERK_SECRET_KEY;
  const dbUrl = env.DATABASE_URL;
  if (!secretKey || !dbUrl) {
    return { status: 503, data: { ok: false, error: 'Progress API is unavailable.' } };
  }

  const clerkId = await getClerkId(headers, secretKey, dependencies.authenticate || authenticateRequest);
  if (!clerkId) return { status: 401, data: { ok: false, error: 'Unauthorized: Invalid or expired authentication token' } };

  const schemaError = await schemaFailure(dbUrl, dependencies);
  if (schemaError) return schemaError;

  try {
    const sql = (dependencies.createSql || neon)(dbUrl) as SqlTag;
    const userId = await resolveNeonUserId(sql, clerkId);
    const transactionSql = sql as SqlTag & {
      transaction: (queries: (transaction: SqlTag) => unknown[], options?: Record<string, unknown>) => Promise<any[][]>;
    };
    const [userRows, progressRows, missionRows, skillRows, topicRows] = await transactionSql.transaction(
      (transaction) => [
        transaction`SELECT callsign FROM users WHERE id = ${userId} LIMIT 1;`,
        transaction`SELECT xp, level, sound, booted, reset_generation, updated_at
          FROM user_progress WHERE user_id = ${userId} LIMIT 1;`,
        transaction`SELECT mission_id, stars, mistakes, cleared_at
          FROM mission_progress WHERE user_id = ${userId} ORDER BY mission_id;`,
        transaction`SELECT skill_id, mastery_level, attempts, successful_independent_solves,
          highest_hint_level_revealed, total_hints_used, ladder_reveals,
          last_practiced_at, review_due_at
          FROM skill_mastery WHERE user_id = ${userId} ORDER BY skill_id;`,
        transaction`SELECT node_id, stages, started_at, completed_at
          FROM topic_progress WHERE user_id = ${userId} ORDER BY node_id;`,
      ],
      { isolationLevel: 'RepeatableRead', readOnly: true },
    );

    const row = progressRows[0];
    if (!userRows[0] || typeof userRows[0].callsign !== 'string'
      || !row || !Number.isFinite(Number(row.xp)) || !Number.isFinite(Number(row.level))
      || typeof row.sound !== 'boolean' || typeof row.booted !== 'boolean'
      || !Number.isSafeInteger(Number(row.reset_generation)) || Number(row.reset_generation) < 0 || !row.updated_at) {
      throw new Error('Progress snapshot is incomplete or incompatible with the database schema.');
    }
    const updatedAt = nullableTimestamp(row.updated_at, 'snapshot update time');
    if (updatedAt === null) throw new Error('Progress snapshot has no update timestamp.');
    const progress = {
      xp: requiredNumber(row.xp, 'xp'),
      level: requiredNumber(row.level, 'level'),
      sound: row.sound,
      booted: row.booted,
      generation: requiredNumber(row.reset_generation, 'reset generation'),
      updatedAt,
      callsign: userRows[0].callsign,
    };
    if (progress.xp < 0 || progress.level < 1) {
      throw new Error('Progress snapshot contains an out-of-range XP or level value.');
    }
    const missions: NonNullable<ProgressGetResult['data']['missions']> = {};
    for (const item of missionRows) {
      if (typeof item.mission_id !== 'string') throw new Error('Mission progress row has no mission identifier.');
      missions[item.mission_id] = {
        stars: requiredNumber(item.stars, 'mission stars'),
        mistakes: item.mistakes === null ? null : requiredNumber(item.mistakes, 'mission mistakes'),
        clearedAt: nullableTimestamp(item.cleared_at, 'mission clear time'),
      };
    }

    const skills: NonNullable<ProgressGetResult['data']['skills']> = {};
    for (const item of skillRows) {
      if (typeof item.skill_id !== 'string' || typeof item.mastery_level !== 'string') {
        throw new Error('Skill mastery row is missing its identifier or mastery tier.');
      }
      const ladder: unknown = item.ladder_reveals === null || item.ladder_reveals === undefined
        ? [0, 0, 0, 0, 0, 0]
        : typeof item.ladder_reveals === 'string'
          ? JSON.parse(item.ladder_reveals)
          : item.ladder_reveals;
      if (!Array.isArray(ladder) || ladder.length !== 6) {
        throw new Error('Skill mastery row has an invalid hint ladder.');
      }
      const normalizedLadder = ladder.map((value: unknown) => requiredNumber(value, 'hint ladder'));
      skills[item.skill_id] = {
        skill: item.skill_id,
        masteryLevel: item.mastery_level,
        attempts: requiredNumber(item.attempts, 'skill attempts'),
        successfulIndependentSolves: requiredNumber(item.successful_independent_solves, 'independent solves'),
        hintUsage: {
          totalHintsUsed: requiredNumber(item.total_hints_used, 'total hints'),
          highestLevelHintRevealed: requiredNumber(item.highest_hint_level_revealed, 'highest hint'),
          ladderReveals: normalizedLadder,
        },
        lastPracticed: nullableTimestamp(item.last_practiced_at, 'last practice time'),
        reviewDue: nullableTimestamp(item.review_due_at, 'review due time'),
      };
    }

    const topics: NonNullable<ProgressGetResult['data']['topics']> = {};
    for (const item of topicRows) {
      if (typeof item.node_id !== 'string') throw new Error('Topic progress row has no topic identifier.');
      const stages: unknown = typeof item.stages === 'string' ? JSON.parse(item.stages) : item.stages;
      if (!isRecord(stages) || Object.values(stages).some((value) => typeof value !== 'boolean')) {
        throw new Error('Topic progress row contains invalid stage data.');
      }
      topics[item.node_id] = {
        stages: stages as Record<string, boolean>,
        startedAt: nullableTimestamp(item.started_at, 'topic start time'),
        completedAt: nullableTimestamp(item.completed_at, 'topic completion time'),
      };
    }

    return { status: 200, data: { ok: true, progress, missions, skills, topics } };
  } catch (error) {
    console.error('[progress:read] Neon progress load failed:', error instanceof Error ? error.message : error);
    return { status: 500, data: { ok: false, error: 'Unable to load progress.' } };
  }
}

export async function handleSaveProgress(
  body: unknown,
  headers: Headers = {},
  env: NodeJS.ProcessEnv = process.env,
  dependencies: ProgressDependencies = {},
): Promise<ProgressGetResult> {
  const secretKey = env.CLERK_SECRET_KEY;
  const dbUrl = env.DATABASE_URL;
  if (!secretKey || !dbUrl) return { status: 503, data: { ok: false, error: 'Progress API is unavailable.' } };

  const clerkId = await getClerkId(headers, secretKey, dependencies.authenticate || authenticateRequest);
  if (!clerkId) return { status: 401, data: { ok: false, error: 'Unauthorized: Invalid or expired authentication token' } };

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, data: { ok: false, error: 'Request body must be a JSON object.' } };
  }
  const parsed = body as Record<string, unknown>;
  const allowed = new Set(['sound', 'booted', 'callsign', 'reset']);
  const unexpected = Object.keys(parsed).find((key) => !allowed.has(key));
  if (unexpected) {
    return { status: 400, data: { ok: false, error: `Unexpected field "${unexpected}". Progression must be recorded as a validated learning event.` } };
  }
  if (parsed.sound !== undefined && typeof parsed.sound !== 'boolean') {
    return { status: 400, data: { ok: false, error: 'sound must be a boolean.' } };
  }
  if (parsed.booted !== undefined && typeof parsed.booted !== 'boolean') {
    return { status: 400, data: { ok: false, error: 'booted must be a boolean.' } };
  }
  const callsign = parsed.callsign === undefined ? undefined : validateCallsign(parsed.callsign);
  if (parsed.callsign !== undefined && callsign === null) {
    return { status: 400, data: { ok: false, error: 'Invalid callsign.' } };
  }
  if (parsed.reset !== undefined && parsed.reset !== true) {
    return { status: 400, data: { ok: false, error: 'reset must be true when provided.' } };
  }
  if (parsed.reset === true && Object.keys(parsed).some((key) => key !== 'reset')) {
    return { status: 400, data: { ok: false, error: 'reset cannot be combined with other fields.' } };
  }

  const schemaError = await schemaFailure(dbUrl, dependencies);
  if (schemaError) return schemaError;

  try {
    const sql = (dependencies.createSql || neon)(dbUrl) as SqlTag;
    const userId = await resolveNeonUserId(sql, clerkId);
    if (parsed.reset === true) {
      const transactionSql = sql as SqlTag & {
        transaction: (queries: (transaction: SqlTag) => unknown[], options?: Record<string, unknown>) => Promise<any[][]>;
      };
      const [, resetRows] = await transactionSql.transaction((transaction) => [
        transaction`SELECT user_id FROM user_progress WHERE user_id = ${userId} FOR UPDATE;`,
        transaction`
          WITH target AS (
            SELECT user_id FROM user_progress WHERE user_id = ${userId}
          ),
          deleted_missions AS (
            DELETE FROM mission_progress WHERE user_id IN (SELECT user_id FROM target) RETURNING user_id
          ),
          deleted_skills AS (
            DELETE FROM skill_mastery WHERE user_id IN (SELECT user_id FROM target) RETURNING user_id
          ),
          deleted_topics AS (
            DELETE FROM topic_progress WHERE user_id IN (SELECT user_id FROM target) RETURNING user_id
          ),
          deleted_attempts AS (
            DELETE FROM mission_attempts WHERE user_id IN (SELECT user_id FROM target) RETURNING user_id
          ),
          reset_progress AS (
            UPDATE user_progress
            SET xp = 0, level = 1, sound = TRUE, booted = FALSE,
                reset_generation = user_progress.reset_generation + 1,
                updated_at = GREATEST(user_progress.updated_at + INTERVAL '1 millisecond', clock_timestamp())
            WHERE user_id IN (SELECT user_id FROM target)
            RETURNING user_id, xp, level, sound, booted, reset_generation, updated_at
          )
          SELECT reset_progress.user_id, reset_progress.xp, reset_progress.level,
            reset_progress.sound, reset_progress.booted, reset_progress.reset_generation,
            reset_progress.updated_at, users.callsign
          FROM reset_progress
          JOIN users ON users.id = reset_progress.user_id;
        `,
      ]);
      const resetRow = resetRows[0];
      if (resetRows.length !== 1 || !resetRow
        || !Number.isSafeInteger(Number(resetRow.reset_generation))
        || Number(resetRow.reset_generation) < 0
        || Number(resetRow.xp) !== 0 || Number(resetRow.level) !== 1
        || resetRow.sound !== true || resetRow.booted !== false
        || typeof resetRow.callsign !== 'string') {
        throw new Error('Progress reset did not return a valid new generation.');
      }
      const updatedAt = nullableTimestamp(resetRow.updated_at, 'reset update time');
      if (updatedAt === null) throw new Error('Progress reset did not return an update timestamp.');
      return {
        status: 200,
        data: {
          ok: true,
          progress: {
            xp: 0,
            level: 1,
            sound: true,
            booted: false,
            generation: requiredNumber(resetRow.reset_generation, 'reset generation'),
            updatedAt,
            callsign: resetRow.callsign,
          },
          missions: {},
          skills: {},
          topics: {},
        },
      };
    } else {
      const saved = await sql`
        WITH progress AS (
          UPDATE user_progress
          SET sound = COALESCE(${parsed.sound ?? null}, sound),
              booted = COALESCE(${parsed.booted ?? null}, booted),
              updated_at = GREATEST(user_progress.updated_at + INTERVAL '1 millisecond', clock_timestamp())
          WHERE user_id = ${userId}
          RETURNING user_id
        ),
        user_callsign AS (
          UPDATE users
          SET callsign = ${callsign ?? null}, updated_at = NOW()
          WHERE id = ${userId}
            AND ${callsign !== undefined}
            AND EXISTS (SELECT 1 FROM progress)
          RETURNING id
        )
        SELECT user_id FROM progress;
      `;
      if (saved.length !== 1) throw new Error('Preference update did not find a complete user progress record.');
    }
    return handleGetProgress(headers, env, dependencies);
  } catch (error) {
    console.error('[progress:write] preference update failed:', error instanceof Error ? error.message : error);
    return { status: 500, data: { ok: false, error: 'Unable to save progress preferences.' } };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const result = await handleGetProgress(req.headers, process.env);
    return res.status(result.status).json(result.data);
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
      }
    }
    const result = await handleSaveProgress(body, req.headers, process.env);
    return res.status(result.status).json(result.data);
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}
