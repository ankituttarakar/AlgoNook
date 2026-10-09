import { neon } from '@neondatabase/serverless';
import { authenticateRequest } from './clerk-auth.mjs';

const VALID_MASTERY = new Set(['introduced', 'guided', 'practicing', 'independent', 'retained']);
const VALID_TOPIC_STAGES = new Set(['concept', 'visualize', 'complexity', 'game', 'pattern', 'practice']);
const ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
const MAX_MISSIONS = 200;
const MAX_SKILLS = 200;
const MAX_TOPICS = 100;

// Callsign rules live in one place shared with the client (BootScreen input,
// HUD display) so the UI and the API can never drift apart.
import { DEFAULT_CALLSIGN, normalizeCallsign } from '../src/lib/callsign.mjs';

function validateCallsign(raw: unknown, outErrors: string[]): string | null {
  if (raw === undefined || raw === null) return null; // absent = keep existing
  const normalized = normalizeCallsign(raw);
  if (normalized === null) {
    outErrors.push('Invalid callsign');
    return null;
  }
  return normalized;
}

function levelFromXpServer(xp: number): number {
  const v = Math.max(0, Math.floor(Number(xp) || 0));
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * v) / 50)) / 2));
}

async function resolveNeonUserId(sql: any, clerkId: string): Promise<string> {
  const users = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1;`;
  if (users.length > 0) return users[0].id;

  const created = await sql`
    INSERT INTO users (clerk_id, callsign, updated_at)
    VALUES (${clerkId}, 'OPERATOR', NOW())
    ON CONFLICT (clerk_id) DO UPDATE SET updated_at = NOW()
    RETURNING id;
  `;
  return created[0].id;
}

function validateMissionEntry(e: any, outErrors: string[]): { missionId: string; stars: number; mistakes: number; clearedAt: Date | null } | null {
  if (!e || typeof e !== 'object' || Array.isArray(e)) { outErrors.push('Invalid mission entry (must be an object)'); return null; }
  const missionId = typeof e.missionId === 'string' ? e.missionId.trim() : null;
  if (!missionId || !ID_RE.test(missionId)) { outErrors.push(`Invalid missionId: ${JSON.stringify(missionId)}`); return null; }
  const stars = Math.floor(Number(e.stars));
  if (!Number.isFinite(stars) || stars < 0 || stars > 3) { outErrors.push(`Invalid stars for ${missionId}: ${JSON.stringify(e.stars)}`); return null; }
  const mistakes = Math.floor(Number(e.mistakes ?? 0));
  if (!Number.isFinite(mistakes) || mistakes < 0) { outErrors.push(`Invalid mistakes for ${missionId}`); return null; }
  let clearedAt: Date | null = null;
  if (e.clearedAt !== undefined && e.clearedAt !== null) {
    const ms = Number(e.clearedAt);
    if (!Number.isFinite(ms)) { outErrors.push(`Invalid clearedAt for ${missionId}`); return null; }
    const clamped = Math.min(ms, Date.now() + 24 * 60 * 60 * 1000);
    clearedAt = new Date(clamped);
    if (isNaN(clearedAt.getTime())) { outErrors.push(`Invalid clearedAt date for ${missionId}`); return null; }
  }
  return { missionId, stars, mistakes, clearedAt };
}

function validateSkillEntry(e: any, outErrors: string[]): {
  skillId: string;
  masteryLevel: string;
  attempts: number;
  successfulIndependentSolves: number;
  highestHintLevelRevealed: number;
  totalHintsUsed: number;
  ladderReveals: number[];
  lastPracticed: Date | null;
  reviewDue: Date | null;
} | null {
  if (!e || typeof e !== 'object' || Array.isArray(e)) { outErrors.push('Invalid skill entry (must be an object)'); return null; }
  const skillId = typeof e.skillId === 'string' ? e.skillId.trim() : null;
  if (!skillId || !ID_RE.test(skillId)) { outErrors.push(`Invalid skillId: ${JSON.stringify(skillId)}`); return null; }
  const masteryLevel = typeof e.masteryLevel === 'string' ? e.masteryLevel : null;
  if (!masteryLevel || !VALID_MASTERY.has(masteryLevel)) { outErrors.push(`Invalid masteryLevel for ${skillId}: ${JSON.stringify(masteryLevel)}`); return null; }
  const attempts = Math.floor(Number(e.attempts ?? 0));
  const successfulIndependentSolves = Math.floor(Number(e.successfulIndependentSolves ?? 0));
  const highestHintLevelRevealed = Math.floor(Number(e.highestHintLevelRevealed ?? 0));
  const totalHintsUsed = Math.floor(Number(e.totalHintsUsed ?? 0));
  if (![attempts, successfulIndependentSolves, highestHintLevelRevealed, totalHintsUsed].every((n) => Number.isFinite(n) && n >= 0 && n <= 100000)) {
    outErrors.push(`Invalid numeric field for ${skillId}`);
    return null;
  }
  let ladderReveals: number[] = Array.isArray(e.ladderReveals) ? e.ladderReveals : [0, 0, 0, 0, 0, 0];
  if (!Array.isArray(ladderReveals) || ladderReveals.length !== 6) {
    outErrors.push(`Invalid ladderReveals for ${skillId} (must be length 6)`);
    return null;
  }
  ladderReveals = ladderReveals.map((v: any) => {
    const n = Math.floor(Number(v) || 0);
    return Math.max(0, Math.min(100000, n));
  });

  let lastPracticed: Date | null = null;
  if (e.lastPracticed !== undefined && e.lastPracticed !== null) {
    const ms = Number(e.lastPracticed);
    if (!Number.isFinite(ms)) { outErrors.push(`Invalid lastPracticed for ${skillId}`); return null; }
    if (Math.abs(ms - Date.now()) > 365 * 24 * 60 * 60 * 1000) { /* allow migrated timestamps, clamp below */ }
    lastPracticed = new Date(Math.max(0, Math.min(ms, Date.now() + 60 * 60 * 1000)));
    if (isNaN(lastPracticed.getTime())) { outErrors.push(`Invalid lastPracticed date for ${skillId}`); return null; }
  }

  let reviewDue: Date | null = null;
  if (e.reviewDue !== undefined && e.reviewDue !== null) {
    const ms = Number(e.reviewDue);
    if (!Number.isFinite(ms)) { outErrors.push(`Invalid reviewDue for ${skillId}`); return null; }
    reviewDue = new Date(Math.max(0, ms));
    if (isNaN(reviewDue.getTime())) { outErrors.push(`Invalid reviewDue date for ${skillId}`); return null; }
  }

  return {
    skillId,
    masteryLevel,
    attempts,
    successfulIndependentSolves,
    highestHintLevelRevealed,
    totalHintsUsed,
    ladderReveals,
    lastPracticed,
    reviewDue,
  };
}

function validateTopicEntry(e: any, outErrors: string[]): { nodeId: string; stages: Record<string, boolean>; startedAt: Date | null; completedAt: Date | null } | null {
  if (!e || typeof e !== 'object' || Array.isArray(e)) { outErrors.push('Invalid topic entry'); return null; }
  const nodeId = typeof e.nodeId === 'string' ? e.nodeId.trim() : null;
  if (!nodeId || !ID_RE.test(nodeId)) { outErrors.push(`Invalid nodeId: ${JSON.stringify(nodeId)}`); return null; }

  const rawStages = e.stages !== undefined && e.stages !== null ? e.stages : {};
  if (typeof rawStages !== 'object' || Array.isArray(rawStages)) { outErrors.push(`Invalid stages for ${nodeId}`); return null; }
  const stages: Record<string, boolean> = {};
  for (const k of Object.keys(rawStages)) {
    if (!VALID_TOPIC_STAGES.has(k)) {
      outErrors.push(`Invalid stage key "${k}" for ${nodeId}`);
      return null;
    }
    stages[k] = Boolean(rawStages[k]);
  }

  let startedAt: Date | null = null;
  if (e.startedAt !== undefined && e.startedAt !== null) {
    const ms = Number(e.startedAt);
    if (!Number.isFinite(ms)) { outErrors.push(`Invalid startedAt for ${nodeId}`); return null; }
    startedAt = new Date(Math.max(0, Math.min(ms, Date.now() + 60 * 60 * 1000)));
    if (isNaN(startedAt.getTime())) { outErrors.push(`Invalid startedAt date for ${nodeId}`); return null; }
  }
  let completedAt: Date | null = null;
  if (e.completedAt !== undefined && e.completedAt !== null) {
    const ms = Number(e.completedAt);
    if (!Number.isFinite(ms)) { outErrors.push(`Invalid completedAt for ${nodeId}`); return null; }
    completedAt = new Date(Math.max(0, Math.min(ms, Date.now() + 60 * 60 * 1000)));
    if (isNaN(completedAt.getTime())) { outErrors.push(`Invalid completedAt date for ${nodeId}`); return null; }
  }

  return { nodeId, stages, startedAt, completedAt };
}

export interface ProgressGetResult {
  status: number;
  data: {
    ok: boolean;
    progress?: { xp: number; level: number; sound: boolean; booted: boolean; callsign?: string };
    missions?: Record<string, { stars: number; mistakes: number; clearedAt: number | null }>;
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

export async function handleGetProgress(
  headers: Record<string, string | string[] | undefined> = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<ProgressGetResult> {
  const secretKey = env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return { status: 500, data: { ok: false, error: 'CLERK_SECRET_KEY is not configured on server' } };
  }
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    return { status: 500, data: { ok: false, error: 'DATABASE_URL is not configured on server' } };
  }

  try {
    const clerkId = await authenticateRequest(headers, secretKey);
    const sql = neon(dbUrl);
    const userId = await resolveNeonUserId(sql, clerkId);

    // callsign lives on users; older DBs may lack the column, so a failure here
    // must never break progress loading.
    let callsign = DEFAULT_CALLSIGN;
    try {
      const userRow = await sql`SELECT callsign FROM users WHERE id = ${userId} LIMIT 1;`;
      if (userRow.length > 0 && userRow[0].callsign) callsign = String(userRow[0].callsign);
    } catch { /* column missing on older schema -> default */ }

    let existing: any[] = [];
    try {
      existing = await sql`SELECT xp, level, sound, booted FROM user_progress WHERE user_id = ${userId} LIMIT 1;`;
    } catch { /* table missing -> will insert below */ }

    if (existing.length === 0) {
      try {
        const inserted = await sql`
          INSERT INTO user_progress (user_id, xp, level, sound, booted, created_at, updated_at)
          VALUES (${userId}, 0, 1, TRUE, FALSE, NOW(), NOW())
          ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
          RETURNING xp, level, sound, booted;
        `;
        existing = inserted;
      } catch {
        existing = [{ xp: 0, level: 1, sound: true, booted: false }];
      }
    }

    const progress = {
      xp: Number(existing[0].xp ?? 0),
      level: Number(existing[0].level ?? 1),
      sound: Boolean(existing[0].sound ?? true),
      booted: Boolean(existing[0].booted ?? false),
      callsign,
    };

    let missionRows: any[] = [];
    try {
      missionRows = await sql`SELECT mission_id, stars, mistakes, cleared_at FROM mission_progress WHERE user_id = ${userId} ORDER BY mission_id;`;
    } catch { /* table missing */ }
    const missions: Record<string, { stars: number; mistakes: number; clearedAt: number | null }> = {};
    for (const r of missionRows) {
      missions[r.mission_id] = {
        stars: Number(r.stars) || 0,
        mistakes: Number(r.mistakes) || 0,
        clearedAt: r.cleared_at ? new Date(r.cleared_at as string).getTime() : null,
      };
    }

    let skillRows: any[] = [];
    try {
      skillRows = await sql`SELECT skill_id, mastery_level, attempts, successful_independent_solves, highest_hint_level_revealed, total_hints_used, ladder_reveals, last_practiced_at, review_due_at FROM skill_mastery WHERE user_id = ${userId} ORDER BY skill_id;`;
    } catch { /* table missing */ }
    const skills: Record<string, any> = {};
    for (const r of skillRows) {
      let ladder: number[] = [0, 0, 0, 0, 0, 0];
      if (Array.isArray(r.ladder_reveals)) ladder = r.ladder_reveals;
      else if (typeof r.ladder_reveals === 'string') {
        try {
          ladder = JSON.parse(r.ladder_reveals);
        } catch { /* keep default */ }
      } else if (r.ladder_reveals && typeof r.ladder_reveals === 'object') {
        ladder = Object.values(r.ladder_reveals as object).map((v: any) => Number(v) || 0);
      }
      skills[r.skill_id] = {
        skill: r.skill_id,
        masteryLevel: String(r.mastery_level || 'introduced'),
        attempts: Number(r.attempts) || 0,
        successfulIndependentSolves: Number(r.successful_independent_solves) || 0,
        hintUsage: {
          totalHintsUsed: Number(r.total_hints_used) || 0,
          highestLevelHintRevealed: Number(r.highest_hint_level_revealed) || 0,
          ladderReveals: ladder,
        },
        lastPracticed: r.last_practiced_at ? new Date(r.last_practiced_at as string).getTime() : null,
        reviewDue: r.review_due_at ? new Date(r.review_due_at as string).getTime() : null,
      };
    }

    let topicRows: any[] = [];
    try {
      topicRows = await sql`SELECT node_id, stages, started_at, completed_at FROM topic_progress WHERE user_id = ${userId} ORDER BY node_id;`;
    } catch (err) {
      console.warn('[progress:read] topic_progress read failed:', err instanceof Error ? err.message : err);
    }
    const topics: Record<string, { stages: Record<string, boolean>; startedAt: number | null; completedAt: number | null }> = {};
    for (const r of topicRows) {
      const stages = typeof r.stages === 'string' ? JSON.parse(r.stages) : (r.stages || {});
      topics[r.node_id] = {
        stages,
        startedAt: r.started_at ? new Date(r.started_at as string).getTime() : null,
        completedAt: r.completed_at ? new Date(r.completed_at as string).getTime() : null,
      };
    }

    return { status: 200, data: { ok: true, progress, missions, skills, topics } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isUnauthorized = message.startsWith('Unauthorized');
    if (!isUnauthorized) console.error('[progress:read] Neon progress load failed:', message);
    return {
      status: isUnauthorized ? 401 : 500,
      data: {
        ok: false,
        error: isUnauthorized ? 'Unauthorized: Invalid or expired authentication token' : 'Unable to load progress.',
      },
    };
  }
}

export type ProgressSaveBody = {
  xp?: number;
  level?: number;
  sound?: boolean;
  booted?: boolean;
  callsign?: string;
  missions?: Array<{ missionId: string; stars: number; mistakes?: number; clearedAt?: number | null }>;
  skills?: Array<
    | {
        skillId: string;
        masteryLevel: string;
        attempts?: number;
        successfulIndependentSolves?: number;
        highestHintLevelRevealed?: number;
        totalHintsUsed?: number;
        ladderReveals?: number[];
        lastPracticed?: number | null;
        reviewDue?: number | null;
      }
    | Record<string, unknown>
  >;
  topics?: Array<{ nodeId: string; stages?: Record<string, unknown>; startedAt?: number | null; completedAt?: number | null }>;
  reset?: boolean;
};

export async function handleSaveProgress(
  body: unknown,
  headers: Record<string, string | string[] | undefined> = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<ProgressGetResult> {
  const secretKey = env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return { status: 500, data: { ok: false, error: 'CLERK_SECRET_KEY is not configured on server' } };
  }
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    return { status: 500, data: { ok: false, error: 'DATABASE_URL is not configured on server' } };
  }

  // Authenticate FIRST: identity comes only from the verified Clerk session token,
  // never from the request body. Nothing else is processed for unauthenticated callers.
  let clerkId: string;
  try {
    clerkId = await authenticateRequest(headers, secretKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith('Unauthorized')) {
      return { status: 401, data: { ok: false, error: 'Unauthorized: Invalid or expired authentication token' } };
    }
    console.warn(`[auth:progress] ${message}`);
    return { status: 500, data: { ok: false, error: 'Unable to authenticate request.' } };
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, data: { ok: false, error: 'Request body must be a JSON object' } };
  }
  const parsed = body as Record<string, unknown>;

  const allowed = new Set(['xp', 'level', 'sound', 'booted', 'callsign', 'missions', 'skills', 'topics', 'reset']);
  for (const k of Object.keys(parsed)) {
    if (!allowed.has(k)) {
      return { status: 400, data: { ok: false, error: `Unexpected field "${k}"` } };
    }
  }

  // xp is required
  if (parsed.xp === undefined || parsed.xp === null || isNaN(Number(parsed.xp)) || Number(parsed.xp) < 0) {
    return { status: 400, data: { ok: false, error: 'Invalid or missing xp in request body' } };
  }
  const targetXp = Math.floor(Number(parsed.xp));
  if (!Number.isFinite(targetXp) || targetXp < 0 || targetXp > 1_000_000_000) {
    return { status: 400, data: { ok: false, error: 'xp out of bounds' } };
  }

  const targetSound: boolean | undefined =
    parsed.sound === undefined ? undefined : Boolean(parsed.sound);
  const targetBooted: boolean | undefined =
    parsed.booted === undefined ? undefined : Boolean(parsed.booted);

  const callsignErrors: string[] = [];
  const targetCallsign = validateCallsign(parsed.callsign, callsignErrors);
  if (parsed.callsign !== undefined && targetCallsign === null) {
    return { status: 400, data: { ok: false, error: callsignErrors[0] as string } };
  }

  const reset = parsed.reset === true;

  const missionList = Array.isArray(parsed.missions) ? (parsed.missions as unknown[]) : undefined;
  const skillList = Array.isArray(parsed.skills) ? (parsed.skills as unknown[]) : undefined;
  const topicList = Array.isArray(parsed.topics) ? (parsed.topics as unknown[]) : undefined;

  if (missionList !== undefined && missionList.length > MAX_MISSIONS)
    return { status: 400, data: { ok: false, error: `Too many missions (max ${MAX_MISSIONS})` } };
  if (skillList !== undefined && skillList.length > MAX_SKILLS)
    return { status: 400, data: { ok: false, error: `Too many skills (max ${MAX_SKILLS})` } };
  if (topicList !== undefined && topicList.length > MAX_TOPICS)
    return { status: 400, data: { ok: false, error: `Too many topics (max ${MAX_TOPICS})` } };

  const validatedMissions: Array<{ missionId: string; stars: number; mistakes: number; clearedAt: Date | null }> = [];
  if (missionList) {
    const errors: string[] = [];
    for (const item of missionList) {
      const v = validateMissionEntry(item, errors);
      if (!v) return { status: 400, data: { ok: false, error: errors[0] as string } };
      validatedMissions.push(v);
    }
    const ids = validatedMissions.map((m) => m.missionId);
    if (ids.length !== new Set(ids).size) return { status: 400, data: { ok: false, error: 'Duplicate missionId in missions' } };
  }

  const validatedSkills: Array<{ skillId: string; masteryLevel: string; attempts: number; successfulIndependentSolves: number; highestHintLevelRevealed: number; totalHintsUsed: number; ladderReveals: number[]; lastPracticed: Date | null; reviewDue: Date | null }> = [];
  if (skillList) {
    const errors: string[] = [];
    for (const item of skillList) {
      const v = validateSkillEntry(item, errors);
      if (!v) return { status: 400, data: { ok: false, error: errors[0] as string } };
      validatedSkills.push(v);
    }
    const ids = validatedSkills.map((s) => s.skillId);
    if (ids.length !== new Set(ids).size) return { status: 400, data: { ok: false, error: 'Duplicate skillId in skills' } };
  }

  const validatedTopics: Array<{ nodeId: string; stages: Record<string, boolean>; startedAt: Date | null; completedAt: Date | null }> = [];
  if (topicList) {
    const errors: string[] = [];
    for (const item of topicList) {
      const v = validateTopicEntry(item, errors);
      if (!v) return { status: 400, data: { ok: false, error: errors[0] as string } };
      validatedTopics.push(v);
    }
    const ids = validatedTopics.map((t) => t.nodeId);
    if (ids.length !== new Set(ids).size) return { status: 400, data: { ok: false, error: 'Duplicate nodeId in topics' } };
  }

  try {
    const sql = neon(dbUrl);
    const userId = await resolveNeonUserId(sql, clerkId);
    const derivedLevel = levelFromXpServer(targetXp);

    // Persist an explicit callsign choice. A progress reset must not rename the
    // operator: the handle belongs to the user, not to the run.
    if (targetCallsign !== null && !reset) {
      try {
        await sql`
          UPDATE users SET callsign = ${targetCallsign}, updated_at = NOW()
          WHERE id = ${userId};
        `;
      } catch (err) {
        console.warn('[progress:write] callsign update failed:', err instanceof Error ? err.message : err);
      }
    }

    // Ensure user_progress row exists before mutations (for booted/sound default)
    try {
      await sql`
        INSERT INTO user_progress (user_id, xp, level, created_at, updated_at)
        VALUES (${userId}, 0, 1, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;
      `;
    } catch { /* ignore conflict */ }

    // Non-reset: xp is monotonic (GREATEST); reset: exact xp/level
    if (reset) {
      await sql`DELETE FROM mission_progress WHERE user_id = ${userId};`;
      try { await sql`DELETE FROM skill_mastery WHERE user_id = ${userId};` ; } catch { /* missing table */ }
      try { await sql`DELETE FROM topic_progress WHERE user_id = ${userId};` ; } catch { /* missing table */ }
      await sql`
        INSERT INTO user_progress (user_id, xp, level, sound, booted, updated_at)
        VALUES (${userId}, 0, 1, TRUE, FALSE, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET xp = 0, level = 1, sound = TRUE, booted = FALSE, updated_at = NOW();
      `;
    } else {
      if (targetSound !== undefined && targetBooted !== undefined) {
        await sql`
          UPDATE user_progress
          SET xp = GREATEST(user_progress.xp, ${targetXp}),
              level = GREATEST(user_progress.level, ${derivedLevel}),
              sound = ${targetSound},
              booted = ${targetBooted},
              updated_at = NOW()
          WHERE user_id = ${userId};
        `;
      } else if (targetSound !== undefined) {
        await sql`
          UPDATE user_progress
          SET xp = GREATEST(user_progress.xp, ${targetXp}),
              level = GREATEST(user_progress.level, ${derivedLevel}),
              sound = ${targetSound},
              updated_at = NOW()
          WHERE user_id = ${userId};
        `;
      } else if (targetBooted !== undefined) {
        await sql`
          UPDATE user_progress
          SET xp = GREATEST(user_progress.xp, ${targetXp}),
              level = GREATEST(user_progress.level, ${derivedLevel}),
              booted = ${targetBooted},
              updated_at = NOW()
          WHERE user_id = ${userId};
        `;
      } else {
        await sql`
          UPDATE user_progress
          SET xp = GREATEST(user_progress.xp, ${targetXp}),
              level = GREATEST(user_progress.level, ${derivedLevel}),
              updated_at = NOW()
          WHERE user_id = ${userId};
        `;
      }
    }

    if (validatedMissions.length > 0) {
      for (const m of validatedMissions) {
        await sql`
          INSERT INTO mission_progress (user_id, mission_id, stars, mistakes, cleared_at, updated_at)
          VALUES (${userId}, ${m.missionId}, ${m.stars}, ${m.mistakes}, ${m.clearedAt}, NOW())
          ON CONFLICT (user_id, mission_id)
          DO UPDATE SET
            stars = GREATEST(mission_progress.stars, EXCLUDED.stars),
            mistakes = LEAST(mission_progress.mistakes, EXCLUDED.mistakes),
            cleared_at = COALESCE(EXCLUDED.cleared_at, mission_progress.cleared_at),
            updated_at = NOW();
        `;
      }
    }

    if (validatedSkills.length > 0) {
      for (const s of validatedSkills) {
        await sql`
          INSERT INTO skill_mastery (user_id, skill_id, mastery_level, attempts, successful_independent_solves, highest_hint_level_revealed, total_hints_used, ladder_reveals, last_practiced_at, review_due_at, updated_at)
          VALUES (${userId}, ${s.skillId}, ${s.masteryLevel}, ${s.attempts}, ${s.successfulIndependentSolves}, ${s.highestHintLevelRevealed}, ${s.totalHintsUsed}, ${JSON.stringify(s.ladderReveals)}::jsonb, ${s.lastPracticed}, ${s.reviewDue}, NOW())
          ON CONFLICT (user_id, skill_id)
          DO UPDATE SET
            mastery_level = (
              SELECT CASE WHEN nidx > oidx THEN ntw ELSE otw END
              FROM (
                SELECT
                  (SELECT idx FROM (VALUES ('introduced', 1), ('guided', 2), ('practicing', 3), ('independent', 4), ('retained', 5)) AS x(lbl, idx) WHERE x.lbl = EXCLUDED.mastery_level) AS nidx,
                  (SELECT idx FROM (VALUES ('introduced', 1), ('guided', 2), ('practicing', 3), ('independent', 4), ('retained', 5)) AS y(lbl, idx) WHERE y.lbl = skill_mastery.mastery_level) AS oidx,
                  EXCLUDED.mastery_level AS ntw,
                  skill_mastery.mastery_level AS otw
              ) AS cmp
            ),
            attempts = GREATEST(skill_mastery.attempts, EXCLUDED.attempts),
            successful_independent_solves = GREATEST(skill_mastery.successful_independent_solves, EXCLUDED.successful_independent_solves),
            highest_hint_level_revealed = GREATEST(skill_mastery.highest_hint_level_revealed, EXCLUDED.highest_hint_level_revealed),
            total_hints_used = GREATEST(skill_mastery.total_hints_used, EXCLUDED.total_hints_used),
            ladder_reveals = (
              SELECT jsonb_build_array(
                GREATEST(COALESCE((NULLIF(skill_mastery.ladder_reveals->>0, ''))::int, 0), COALESCE((NULLIF(EXCLUDED.ladder_reveals->>0, ''))::int, 0)),
                GREATEST(COALESCE((NULLIF(skill_mastery.ladder_reveals->>1, ''))::int, 0), COALESCE((NULLIF(EXCLUDED.ladder_reveals->>1, ''))::int, 0)),
                GREATEST(COALESCE((NULLIF(skill_mastery.ladder_reveals->>2, ''))::int, 0), COALESCE((NULLIF(EXCLUDED.ladder_reveals->>2, ''))::int, 0)),
                GREATEST(COALESCE((NULLIF(skill_mastery.ladder_reveals->>3, ''))::int, 0), COALESCE((NULLIF(EXCLUDED.ladder_reveals->>3, ''))::int, 0)),
                GREATEST(COALESCE((NULLIF(skill_mastery.ladder_reveals->>4, ''))::int, 0), COALESCE((NULLIF(EXCLUDED.ladder_reveals->>4, ''))::int, 0)),
                GREATEST(COALESCE((NULLIF(skill_mastery.ladder_reveals->>5, ''))::int, 0), COALESCE((NULLIF(EXCLUDED.ladder_reveals->>5, ''))::int, 0))
              )
            ),
            // Monotonic: a stale/out-of-order request can never move last practice backwards.
            last_practiced_at = GREATEST(skill_mastery.last_practiced_at, EXCLUDED.last_practiced_at),
            // Deliberately NOT monotonic: a completed review session may legitimately pull the
            // next review date earlier (e.g. reviewing ahead of schedule resets the interval).
            review_due_at = COALESCE(EXCLUDED.review_due_at, skill_mastery.review_due_at),
            updated_at = NOW();
        `;
      }
    }

    // Stage truth is one-way progressive: once a stage is `true` server-side it
    // must not be flipped back by a stale client snapshot. Read-modify-write
    // per topic row with monotonic OR is race-safe for completion semantics.
    if (validatedTopics.length > 0) {
      for (const t of validatedTopics) {
        try {
          const existing = await sql`SELECT stages, started_at, completed_at FROM topic_progress WHERE user_id = ${userId} AND node_id = ${t.nodeId} LIMIT 1;`;
          if (existing.length === 0) {
            await sql`
              INSERT INTO topic_progress (user_id, node_id, stages, started_at, completed_at, updated_at)
              VALUES (${userId}, ${t.nodeId}, ${JSON.stringify(t.stages)}::jsonb, ${t.startedAt}, ${t.completedAt}, NOW());
            `;
          } else {
            const curStages = typeof existing[0].stages === 'string' ? JSON.parse(existing[0].stages) : (existing[0].stages || {});
            const merged: Record<string, boolean> = { ...curStages };
            for (const [k, v] of Object.entries(t.stages)) {
              if (v) merged[k] = true;
            }
            const curStarted = existing[0].started_at ? new Date(existing[0].started_at as string).getTime() : null;
            const incomingStarted = t.startedAt ? t.startedAt.getTime() : null;
            const nextStarted = curStarted !== null && incomingStarted !== null
              ? new Date(Math.min(curStarted, incomingStarted))
              : curStarted !== null
                ? new Date(curStarted)
                : incomingStarted !== null
                  ? new Date(incomingStarted)
                  : null;
            const curCompleted = existing[0].completed_at ? new Date(existing[0].completed_at as string).getTime() : null;
            const incomingCompleted = t.completedAt ? t.completedAt.getTime() : null;
            const nextCompleted = curCompleted !== null && incomingCompleted !== null
              ? new Date(Math.max(curCompleted, incomingCompleted))
              : curCompleted !== null
                ? new Date(curCompleted)
                : incomingCompleted !== null
                  ? new Date(incomingCompleted)
                  : null;
            await sql`
              UPDATE topic_progress
              SET stages = ${JSON.stringify(merged)}::jsonb,
                  started_at = ${nextStarted},
                  completed_at = ${nextCompleted},
                  updated_at = NOW()
              WHERE user_id = ${userId} AND node_id = ${t.nodeId};
            `;
          }
        } catch (err) {
          // topic_progress may be missing on older DBs; global xp/level and
          // missions/skills remain authoritative without topic rows — but the
          // failure must be visible in logs, never silent.
          console.warn(
            `[progress:write] topic upsert failed for ${t.nodeId}:`,
            err instanceof Error ? err.message : err,
          );
          break;
        }
      }
    }

    const response = await handleGetProgress(headers, env);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isUnauthorized = message.startsWith('Unauthorized');
    if (!isUnauthorized) console.error('[progress:write] Neon progress save failed:', message);
    return {
      status: isUnauthorized ? 401 : 500,
      data: {
        ok: false,
        error: isUnauthorized ? 'Unauthorized: Invalid or expired authentication token' : 'Unable to save progress.',
      },
    };
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
