import { neon } from '@neondatabase/serverless';
import { authenticateRequest } from '../clerk-auth.mjs';
import { checkDatabaseSchema } from '../schemaHealth.mjs';
import { executePythonJob } from '../code/runnerClient.mjs';
import { releaseCodeExecution, reserveCodeExecution } from '../code/executionAdmission.mjs';
import { getCodeProblemById } from '../code/problems/index.mjs';
import { MISSION_MAP, missionsOfTopic } from '../../src/data/missions/index.js';
import { GAME_LAB_BY_NODE } from '../../src/data/games/index.js';
import { ROADMAP_NODE_MAP, ROADMAP_NODES } from '../../src/data/roadmap.js';
// Vercel's isolated API typecheck omits the app tsconfig's allowImportingTsExtensions setting.
// @ts-ignore
import { handleGetProgress } from '../progress.ts';

const MAX_SOURCE_BYTES = 64 * 1024;
const EVENT_TYPES = new Set(['mission_completed', 'game_lab_completed', 'review_completed']);
const XP_BY_DIFFICULTY = { easy: 20, med: 35, hard: 55 };
const MISSION_BONUS = 40;

type Headers = Record<string, string | string[] | undefined>;
type LearningEventRequest = {
  eventId: string;
  generation: number;
  type: string;
  missionId?: string;
  problemId?: string;
  language?: string;
  sourceCode?: string;
  evidence?: unknown[];
  nodeId?: string;
  hintLevelsUsed?: number[];
};
type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>;
type EventOutcome = {
  ok: true;
  duplicate: boolean;
  awardedXp: number;
  stars: number;
  snapshot?: unknown;
};
type ApiResult = {
  status: number;
  data: EventOutcome | { ok: false; error: string; code?: string; generation?: number };
  headers?: Record<string, string>;
};

function validUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function sameArray(left: unknown, right: unknown[]): boolean {
  return Array.isArray(left) && JSON.stringify(left) === JSON.stringify(right);
}

function validHintLevels(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length <= 6
    && value.every((level, index) => Number.isInteger(level) && level === index + 1);
}

function nodeRequirementsForMission(missionId: string) {
  const node = ROADMAP_NODES.find((item) => {
    const topics = item.missionTopics || (item.topicId ? [item.topicId] : []);
    return topics.flatMap(missionsOfTopic).some((mission) => mission.id === missionId);
  });
  if (!node) return { nodeId: null, missionIds: [], requiresGame: false };
  const topics = node.missionTopics || (node.topicId ? [node.topicId] : []);
  return {
    nodeId: node.id,
    missionIds: topics.flatMap(missionsOfTopic).map((mission) => mission.id),
    requiresGame: !!GAME_LAB_BY_NODE[node.id],
  };
}

function validateMissionEvidence(missionId: string, evidence: unknown): {
  xp: number;
  skillId: string | null;
  metadata: Record<string, unknown>;
} | null {
  const mission = MISSION_MAP[missionId];
  if (!mission || mission.codingProblem || mission.problemFlow || !Array.isArray(mission.challenges) || !Array.isArray(evidence)) return null;
  if (mission.challenges.length === 0 || mission.challenges.length !== evidence.length) return null;

  let xp = MISSION_BONUS;
  for (let index = 0; index < mission.challenges.length; index += 1) {
    const challenge = mission.challenges[index];
    const proof = evidence[index];
    if (!isRecord(proof) || !exactKeys(proof, ['type', 'answer'])) return null;
    const difficulty = challenge.d;
    if (!(difficulty in XP_BY_DIFFICULTY)) return null;
    xp += XP_BY_DIFFICULTY[difficulty as keyof typeof XP_BY_DIFFICULTY];

    if (challenge.t === 'mc') {
      if (proof.type !== 'choice' || typeof proof.answer !== 'string'
        || !challenge.opts.some((option: any) => option.ok && option.t === proof.answer)) return null;
    } else if (challenge.t === 'order') {
      if (proof.type !== 'order' || !sameArray(proof.answer, challenge.items)) return null;
    } else if (challenge.t === 'machine') {
      if (proof.type !== 'machine' || !sameArray(proof.answer, challenge.target)) return null;
    } else {
      return null;
    }
  }

  return {
    xp,
    skillId: typeof mission.skill === 'string' ? mission.skill : null,
    metadata: { verifiedChallenges: mission.challenges.length },
  };
}

function validateCodingEvidence(body: LearningEventRequest): {
  missionId: string;
  problemId: string;
  skillId: string;
  xp: number;
  explanationCorrect: boolean;
  transferPassed: boolean;
  metadata: Record<string, unknown>;
} | null {
  if (typeof body.missionId !== 'string' || typeof body.problemId !== 'string'
    || body.language !== 'python'
    || typeof body.sourceCode !== 'string'
    || body.sourceCode.trim().length === 0
    || new TextEncoder().encode(body.sourceCode).length > MAX_SOURCE_BYTES) return null;

  const mission = MISSION_MAP[body.missionId];
  const runnerProblem = getCodeProblemById(body.problemId);
  const implementation = mission?.problemFlow?.steps?.find((step: any) => step.type === 'implementation');
  if (!mission?.problemFlow || !runnerProblem
    || implementation?.challenge?.problemId !== body.problemId
    || !mission.skill) return null;

  const flowSteps = mission.problemFlow.steps;
  const expectedSteps = flowSteps.filter((step: any) => step.type === 'choice' || step.type === 'tests' || step.type === 'order');
  const expectedStepIds = expectedSteps.map((step: any) => step.id);
  if (!Array.isArray(body.evidence) || body.evidence.length !== expectedStepIds.length) return null;

  let explanationCorrect = false;
  let transferPassed = false;
  for (let index = 0; index < expectedStepIds.length; index += 1) {
    const step = expectedSteps[index];
    const proof = body.evidence[index];
    if (!isRecord(proof) || !exactKeys(proof, ['stepId', 'answer']) || proof.stepId !== step.id) return null;
    if (step.type === 'choice') {
      if (typeof proof.answer !== 'string' || !step.options.some((option: any) => option.correct && option.text === proof.answer)) return null;
      if (step.id === 'explain') explanationCorrect = true;
      if (step.id === 'transfer') transferPassed = true;
    } else if (step.type === 'tests') {
      if (!Array.isArray(proof.answer) || proof.answer.length !== step.cases.length) return null;
      for (let caseIndex = 0; caseIndex < step.cases.length; caseIndex += 1) {
        const testCase = step.cases[caseIndex];
        if (typeof proof.answer[caseIndex] !== 'string'
          || !testCase.options.some((option: any) => option.correct && option.text === proof.answer[caseIndex])) return null;
      }
    } else if (step.type === 'order') {
      if (!Array.isArray(step.challenge?.items) || !sameArray(proof.answer, step.challenge.items)) return null;
    }
  }
  if (!explanationCorrect || !transferPassed) return null;

  return {
    missionId: body.missionId,
    problemId: body.problemId,
    skillId: mission.skill,
    xp: XP_BY_DIFFICULTY.hard + MISSION_BONUS,
    explanationCorrect,
    transferPassed,
    metadata: {
      problemId: body.problemId,
      verifiedStages: expectedStepIds,
      explanationCorrect,
      transferPassed,
      verifiedIndependent: true,
      hintLevelsUsed: body.hintLevelsUsed || [],
    },
  };
}

function validateGameEvidence(nodeId: string, evidence: unknown): {
  skillId: string;
  metadata: Record<string, unknown>;
} | null {
  const node = ROADMAP_NODE_MAP[nodeId];
  const game = GAME_LAB_BY_NODE[nodeId];
  if (!node || !game || !Array.isArray(game.stages) || game.stages.length === 0
    || !Array.isArray(evidence) || evidence.length !== game.stages.length) return null;

  for (let index = 0; index < game.stages.length; index += 1) {
    const stage = game.stages[index];
    const proof = evidence[index];
    if (!isRecord(proof) || !exactKeys(proof, ['stageId', 'answer']) || proof.stageId !== stage.id) return null;
    if (stage.type === 'build') {
      if (!sameArray(proof.answer, stage.expectedOrder)) return null;
    } else if (stage.options) {
      if (typeof proof.answer !== 'string' || proof.answer !== stage.answerId) return null;
    } else {
      const accepted = (stage.acceptedAnswers || []).map((answer: unknown) => String(answer).trim().toLowerCase().replace(/\s+/g, ' '));
      const answer = typeof proof.answer === 'string' ? proof.answer.trim().toLowerCase().replace(/\s+/g, ' ') : '';
      if (!accepted.includes(answer)) return null;
    }
  }

  return {
    skillId: game.skillId,
    metadata: { nodeId, verifiedStages: game.stages.map((stage: any) => stage.id) },
  };
}

async function authenticate(headers: Headers, secretKey: string, auth: typeof authenticateRequest) {
  try {
    return await auth(headers, secretKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.startsWith('Unauthorized')) console.warn(`[auth:progress-events] ${message}`);
    return null;
  }
}

async function saveValidatedEvent(
  sql: SqlTag,
  userId: string,
  eventId: string,
  eventType: string,
  eventKey: string,
  missionId: string | null,
  nodeId: string | null,
  skillId: string | null,
  problemId: string | null,
  xp: number,
  generation: number,
  metadata: Record<string, unknown>,
  requiredMissionIds: string[],
  requiresGame: boolean,
  reviewDueAt: Date | null,
) {
  const transactionSql = sql as SqlTag & {
    transaction: (queries: (transaction: SqlTag) => unknown[], options?: Record<string, unknown>) => Promise<any[][]>;
  };
  // Take the user lock before the write statement so topic completion sees prior events.
  const [lockedRows, recordedRows] = await transactionSql.transaction((transaction) => [
    transaction`SELECT user_id FROM user_progress WHERE user_id = ${userId} FOR UPDATE;`,
    transaction`
    WITH current AS MATERIALIZED (
      SELECT user_id, reset_generation
      FROM user_progress
      WHERE user_id = ${userId}
    ),
    inserted AS (
      INSERT INTO learning_events
        (user_id, idempotency_key, generation, event_type, event_key, mission_id, node_id, skill_id, problem_id, xp_awarded, stars_awarded, metadata, created_at)
      SELECT
        current.user_id, ${eventId}::uuid, current.reset_generation, ${eventType}, ${eventKey}, ${missionId}, ${nodeId}, ${skillId}, ${problemId}, ${xp}, ${missionId === null ? 0 : 1}, ${JSON.stringify(metadata)}::jsonb, NOW()
      FROM current
      WHERE current.reset_generation = ${generation}
        AND (${eventType} <> 'review_completed'
        OR EXISTS (
          SELECT 1 FROM skill_mastery
          WHERE user_id = ${userId} AND skill_id = ${skillId}
            AND review_due_at = ${reviewDueAt} AND review_due_at <= NOW()
        ))
      ON CONFLICT DO NOTHING
      RETURNING user_id, generation, mission_id, node_id, skill_id, xp_awarded, stars_awarded, event_type, metadata
    ),
    progress AS (
      INSERT INTO user_progress (user_id, xp, level, created_at, updated_at)
      SELECT user_id, xp_awarded, GREATEST(1, FLOOR((1 + SQRT(1 + (4.0 * xp_awarded) / 50)) / 2)::integer), NOW(), NOW()
      FROM inserted
      ON CONFLICT (user_id) DO UPDATE SET
        xp = user_progress.xp + EXCLUDED.xp,
        level = GREATEST(1, FLOOR((1 + SQRT(1 + (4.0 * (user_progress.xp + EXCLUDED.xp)) / 50)) / 2)::integer),
        updated_at = GREATEST(user_progress.updated_at + INTERVAL '1 millisecond', clock_timestamp())
      RETURNING user_id
    ),
    mission AS (
      INSERT INTO mission_progress (user_id, mission_id, stars, mistakes, cleared_at, updated_at)
      SELECT user_id, mission_id, stars_awarded, NULL, NOW(), NOW()
      FROM inserted
      WHERE mission_id IS NOT NULL
      ON CONFLICT (user_id, mission_id) DO UPDATE SET
        stars = GREATEST(mission_progress.stars, EXCLUDED.stars),
        cleared_at = LEAST(mission_progress.cleared_at, EXCLUDED.cleared_at),
        updated_at = NOW()
      RETURNING user_id
    ),
    skill AS (
      INSERT INTO skill_mastery
        (user_id, skill_id, mastery_level, attempts, successful_independent_solves,
         highest_hint_level_revealed, total_hints_used, ladder_reveals,
         last_practiced_at, review_due_at, updated_at)
      SELECT user_id, skill_id, 'guided', 1,
        CASE WHEN metadata->>'verifiedIndependent' = 'true' THEN 1 ELSE 0 END,
        COALESCE((
          SELECT MAX(hint.level::integer)
          FROM jsonb_array_elements_text(COALESCE(metadata->'hintLevelsUsed', '[]'::jsonb)) AS hint(level)
        ), 0),
        jsonb_array_length(COALESCE(metadata->'hintLevelsUsed', '[]'::jsonb)),
        jsonb_build_array(
          CASE WHEN COALESCE(metadata->'hintLevelsUsed', '[]'::jsonb) @> '[1]'::jsonb THEN 1 ELSE 0 END,
          CASE WHEN COALESCE(metadata->'hintLevelsUsed', '[]'::jsonb) @> '[2]'::jsonb THEN 1 ELSE 0 END,
          CASE WHEN COALESCE(metadata->'hintLevelsUsed', '[]'::jsonb) @> '[3]'::jsonb THEN 1 ELSE 0 END,
          CASE WHEN COALESCE(metadata->'hintLevelsUsed', '[]'::jsonb) @> '[4]'::jsonb THEN 1 ELSE 0 END,
          CASE WHEN COALESCE(metadata->'hintLevelsUsed', '[]'::jsonb) @> '[5]'::jsonb THEN 1 ELSE 0 END,
          CASE WHEN COALESCE(metadata->'hintLevelsUsed', '[]'::jsonb) @> '[6]'::jsonb THEN 1 ELSE 0 END
        ),
        NOW(), NOW() + INTERVAL '1 day', NOW()
      FROM inserted
      WHERE skill_id IS NOT NULL AND event_type IN ('mission_completed', 'review_completed')
      ON CONFLICT (user_id, skill_id) DO UPDATE SET
        attempts = skill_mastery.attempts + 1,
        mastery_level = CASE
          WHEN skill_mastery.mastery_level = 'introduced' THEN 'guided'
          WHEN skill_mastery.mastery_level = 'guided' THEN 'practicing'
          WHEN skill_mastery.mastery_level = 'practicing'
            AND skill_mastery.successful_independent_solves + EXCLUDED.successful_independent_solves >= 1 THEN 'independent'
          WHEN skill_mastery.mastery_level = 'independent'
            AND skill_mastery.successful_independent_solves + EXCLUDED.successful_independent_solves >= 3 THEN 'retained'
          ELSE skill_mastery.mastery_level
        END,
        successful_independent_solves = skill_mastery.successful_independent_solves + EXCLUDED.successful_independent_solves,
        highest_hint_level_revealed = GREATEST(skill_mastery.highest_hint_level_revealed, EXCLUDED.highest_hint_level_revealed),
        total_hints_used = skill_mastery.total_hints_used + EXCLUDED.total_hints_used,
        ladder_reveals = jsonb_build_array(
          COALESCE((skill_mastery.ladder_reveals->>0)::integer, 0) + (EXCLUDED.ladder_reveals->>0)::integer,
          COALESCE((skill_mastery.ladder_reveals->>1)::integer, 0) + (EXCLUDED.ladder_reveals->>1)::integer,
          COALESCE((skill_mastery.ladder_reveals->>2)::integer, 0) + (EXCLUDED.ladder_reveals->>2)::integer,
          COALESCE((skill_mastery.ladder_reveals->>3)::integer, 0) + (EXCLUDED.ladder_reveals->>3)::integer,
          COALESCE((skill_mastery.ladder_reveals->>4)::integer, 0) + (EXCLUDED.ladder_reveals->>4)::integer,
          COALESCE((skill_mastery.ladder_reveals->>5)::integer, 0) + (EXCLUDED.ladder_reveals->>5)::integer
        ),
        last_practiced_at = NOW(),
        review_due_at = NOW() + CASE
          WHEN skill_mastery.mastery_level IN ('introduced', 'guided') THEN INTERVAL '3 days'
          WHEN skill_mastery.mastery_level = 'practicing' THEN INTERVAL '7 days'
          ELSE INTERVAL '14 days'
        END,
        updated_at = NOW()
      RETURNING user_id
    ),
    topic AS (
      INSERT INTO topic_progress (user_id, node_id, stages, started_at, completed_at, updated_at)
      SELECT user_id, node_id,
        CASE WHEN event_type = 'game_lab_completed' THEN '{"game":true}'::jsonb ELSE '{}'::jsonb END,
        NOW(),
        CASE WHEN
          (NOT ${requiresGame} OR event_type = 'game_lab_completed'
            OR COALESCE((SELECT stages->>'game' FROM topic_progress WHERE user_id = inserted.user_id AND node_id = inserted.node_id), 'false') = 'true')
          AND NOT EXISTS (
            SELECT 1
            FROM unnest(${requiredMissionIds}::text[]) AS required(mission_id)
            WHERE required.mission_id <> COALESCE(inserted.mission_id, '')
              AND NOT EXISTS (
                SELECT 1 FROM mission_progress
                WHERE user_id = inserted.user_id AND mission_id = required.mission_id
              )
          )
          THEN NOW() ELSE NULL END,
        NOW()
      FROM inserted
      WHERE node_id IS NOT NULL
      ON CONFLICT (user_id, node_id) DO UPDATE SET
        stages = topic_progress.stages || CASE
          WHEN EXCLUDED.stages ? 'game' THEN '{"game":true}'::jsonb ELSE '{}'::jsonb END,
        started_at = COALESCE(topic_progress.started_at, NOW()),
        completed_at = COALESCE(topic_progress.completed_at, EXCLUDED.completed_at),
        updated_at = NOW()
      RETURNING user_id
    )
    SELECT current.reset_generation AS generation,
      CASE
        WHEN current.reset_generation <> ${generation} THEN 'stale'
        WHEN EXISTS (SELECT 1 FROM inserted) THEN 'applied'
        WHEN ${eventType} = 'review_completed' AND NOT EXISTS (
          SELECT 1 FROM skill_mastery
          WHERE user_id = ${userId} AND skill_id = ${skillId}
            AND review_due_at = ${reviewDueAt} AND review_due_at <= NOW()
        ) THEN 'review_not_due'
        ELSE 'duplicate'
      END AS outcome,
      (SELECT xp_awarded FROM inserted) AS xp_awarded,
      (SELECT stars_awarded FROM inserted) AS stars_awarded
    FROM current;
  `,
  ]);
  if (lockedRows.length !== 1) throw new Error('Learning event user has no authoritative progress row.');
  return recordedRows;
}

export async function handleLearningEvent(
  body: unknown,
  headers: Headers = {},
  env: NodeJS.ProcessEnv = process.env,
  dependencies: {
    authenticate?: typeof authenticateRequest;
    createSql?: (connectionString: string) => SqlTag;
    execute?: typeof executePythonJob;
    persistEvent?: typeof saveValidatedEvent;
    checkSchema?: typeof checkDatabaseSchema;
  } = {},
): Promise<ApiResult> {
  const secretKey = env.CLERK_SECRET_KEY;
  const dbUrl = env.DATABASE_URL;
  if (!secretKey || !dbUrl) return { status: 503, data: { ok: false, error: 'Learning progress API is unavailable.' } };

  const clerkId = await authenticate(headers, secretKey, dependencies.authenticate || authenticateRequest);
  if (!clerkId) return { status: 401, data: { ok: false, error: 'Unauthorized: Invalid or expired authentication token' } };

  if (!isRecord(body) || !validUuid(body.eventId) || !Number.isSafeInteger(body.generation)
    || (body.generation as number) < 0 || typeof body.type !== 'string' || !EVENT_TYPES.has(body.type)
    || !exactKeys(body, ['eventId', 'generation', 'type', 'missionId', 'problemId', 'language', 'sourceCode', 'evidence', 'nodeId', 'hintLevelsUsed'])
    || (body.hintLevelsUsed !== undefined && !validHintLevels(body.hintLevelsUsed))) {
    return { status: 400, data: { ok: false, error: 'Invalid learning event request.' } };
  }

  let schemaHealth: Awaited<ReturnType<typeof checkDatabaseSchema>>;
  try {
    schemaHealth = await (dependencies.checkSchema || checkDatabaseSchema)(dbUrl);
  } catch (error) {
    console.error('[database:schema] learning event health check failed:', error instanceof Error ? error.message : error);
    return { status: 503, data: { ok: false, error: 'Database is unavailable.' } };
  }
  if (!schemaHealth.compatible) {
    return { status: 503, data: { ok: false, error: 'Database schema is incompatible. Apply pending migrations.' } };
  }

  const sql = (dependencies.createSql || neon)(dbUrl) as SqlTag;
  let identity: any[];
  try {
    identity = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1;`;
    if (identity.length === 0) {
      identity = await sql`
        WITH user_row AS (
          INSERT INTO users (clerk_id, callsign, updated_at)
          VALUES (${clerkId}, 'OPERATOR', NOW())
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
    }
  } catch (error) {
    console.error('[progress:events] user lookup failed:', error instanceof Error ? error.message : error);
    return { status: 500, data: { ok: false, error: 'Unable to record learning event.' } };
  }
  const userId = identity[0]?.id;
  if (typeof userId !== 'string') return { status: 500, data: { ok: false, error: 'Unable to record learning event.' } };

  const request = body as unknown as LearningEventRequest;
  let priorById: any[];
  try {
    priorById = await sql`
      SELECT progress.reset_generation AS generation, event.id
      FROM user_progress AS progress
      LEFT JOIN learning_events AS event
        ON event.user_id = progress.user_id
        AND event.generation = progress.reset_generation
        AND event.idempotency_key = ${request.eventId}::uuid
      WHERE progress.user_id = ${userId}
      LIMIT 1;
    `;
  } catch (error) {
    console.error('[progress:events] event identity lookup failed:', error instanceof Error ? error.message : error);
    return { status: 500, data: { ok: false, error: 'Unable to validate learning event.' } };
  }
  const generationAtLookup = Number(priorById[0]?.generation);
  if (!Number.isSafeInteger(generationAtLookup) || generationAtLookup < 0) {
    return { status: 500, data: { ok: false, error: 'Unable to validate learning event.' } };
  }
  if (generationAtLookup !== request.generation) {
    return {
      status: 409,
      data: {
        ok: false,
        error: 'This learning event belongs to an earlier progress generation.',
        code: 'STALE_GENERATION',
        generation: generationAtLookup,
      },
    };
  }
  if (priorById[0]?.id) {
    const snapshot = await handleGetProgress(headers, env, {
      authenticate: dependencies.authenticate,
      createSql: dependencies.createSql,
      checkSchema: dependencies.checkSchema,
    });
    if (snapshot.status !== 200 || !snapshot.data.ok) {
      return { status: 500, data: { ok: false, error: 'Learning event was recorded but progress could not be refreshed.' } };
    }
    return {
      status: 200,
      data: { ok: true, duplicate: true, awardedXp: 0, stars: 0, snapshot: snapshot.data },
    };
  }

  let eventType: string;
  let eventKey: string;
  let missionId: string | null = null;
  let nodeId: string | null = null;
  let skillId: string | null = null;
  let problemId: string | null = null;
  let xp = 0;
  let metadata: Record<string, unknown>;
  let requiredMissionIds: string[] = [];
  let requiresGame = false;
  let reviewDueAt: Date | null = null;
  let codeProblem: ReturnType<typeof getCodeProblemById> | null = null;

  if ((request.type === 'mission_completed' || request.type === 'review_completed')
    && typeof request.missionId === 'string'
    && MISSION_MAP[request.missionId]?.problemFlow) {
    const validated = validateCodingEvidence(request);
    if (!validated) return { status: 400, data: { ok: false, error: 'Invalid coding mission evidence or reference.' } };
    codeProblem = getCodeProblemById(validated.problemId)!;
    eventType = request.type;
    if (request.type === 'review_completed') {
      let dueRows: any[];
      try {
        dueRows = await sql`
          SELECT review_due_at FROM skill_mastery
          WHERE user_id = ${userId} AND skill_id = ${validated.skillId}
            AND review_due_at <= NOW()
          LIMIT 1;
        `;
      } catch (error) {
        console.error('[progress:events] review eligibility lookup failed:', error instanceof Error ? error.message : error);
        return { status: 500, data: { ok: false, error: 'Unable to validate review eligibility.' } };
      }
      if (dueRows.length === 0 || !dueRows[0].review_due_at) {
        return { status: 409, data: { ok: false, error: 'This skill does not have a review due yet.' } };
      }
      reviewDueAt = new Date(dueRows[0].review_due_at as string);
      eventKey = `review:${validated.skillId}:${reviewDueAt.getTime()}`;
      xp = XP_BY_DIFFICULTY.med;
    } else {
      eventKey = `mission:${validated.missionId}`;
      missionId = validated.missionId;
      ({ nodeId, missionIds: requiredMissionIds, requiresGame } = nodeRequirementsForMission(validated.missionId));
      xp = validated.xp;
    }
    problemId = validated.problemId;
    skillId = validated.skillId;
    metadata = validated.metadata;
  } else if (request.type === 'mission_completed' && typeof request.missionId === 'string') {
    const validated = validateMissionEvidence(request.missionId, request.evidence);
    if (!validated) return { status: 400, data: { ok: false, error: 'Invalid mission evidence or reference.' } };
    eventType = 'mission_completed';
    eventKey = `mission:${request.missionId}`;
    missionId = request.missionId;
    ({ nodeId, missionIds: requiredMissionIds, requiresGame } = nodeRequirementsForMission(request.missionId));
    skillId = validated.skillId;
    xp = validated.xp;
    metadata = validated.metadata;
  } else if (request.type === 'game_lab_completed' && typeof request.nodeId === 'string') {
    const validated = validateGameEvidence(request.nodeId, request.evidence);
    if (!validated) return { status: 400, data: { ok: false, error: 'Invalid topic or game evidence.' } };
    eventType = 'game_lab_completed';
    eventKey = `game:${request.nodeId}`;
    nodeId = request.nodeId;
    requiredMissionIds = (ROADMAP_NODE_MAP[nodeId].missionTopics || (ROADMAP_NODE_MAP[nodeId].topicId ? [ROADMAP_NODE_MAP[nodeId].topicId] : []))
      .flatMap(missionsOfTopic)
      .map((mission) => mission.id);
    requiresGame = true;
    skillId = validated.skillId;
    metadata = validated.metadata;
  } else {
    return { status: 400, data: { ok: false, error: 'Invalid learning event reference.' } };
  }

  let priorEvent: any[];
  try {
    priorEvent = await sql`
      SELECT progress.reset_generation AS generation, event.id
      FROM user_progress AS progress
      LEFT JOIN learning_events AS event
        ON event.user_id = progress.user_id
        AND event.generation = progress.reset_generation
        AND event.event_type = ${eventType}
        AND event.event_key = ${eventKey}
      WHERE progress.user_id = ${userId}
      LIMIT 1;
    `;
  } catch (error) {
    console.error('[progress:events] event idempotency lookup failed:', error instanceof Error ? error.message : error);
    return { status: 500, data: { ok: false, error: 'Unable to validate learning event.' } };
  }
  const currentGeneration = Number(priorEvent[0]?.generation);
  if (!Number.isSafeInteger(currentGeneration) || currentGeneration < 0) {
    return { status: 500, data: { ok: false, error: 'Unable to validate learning event.' } };
  }
  if (currentGeneration !== request.generation) {
    return {
      status: 409,
      data: {
        ok: false,
        error: 'This learning event belongs to an earlier progress generation.',
        code: 'STALE_GENERATION',
        generation: currentGeneration,
      },
    };
  }
  if (priorEvent[0]?.id) {
    const snapshot = await handleGetProgress(headers, env, {
      authenticate: dependencies.authenticate,
      createSql: dependencies.createSql,
      checkSchema: dependencies.checkSchema,
    });
    if (snapshot.status !== 200 || !snapshot.data.ok) {
      return { status: 500, data: { ok: false, error: 'Learning event was recorded but progress could not be refreshed.' } };
    }
    return {
      status: 200,
      data: { ok: true, duplicate: true, awardedXp: 0, stars: 0, snapshot: snapshot.data },
    };
  }

  let admission: Awaited<ReturnType<typeof reserveCodeExecution>> | null = null;
  const releaseAdmission = async () => {
    if (!admission) return;
    const leaseId = admission.leaseId;
    admission = null;
    try {
      await (dependencies.release || releaseCodeExecution)(clerkId, leaseId, env);
    } catch (error) {
      console.error('[progress:events] execution admission lease cleanup failed:', error instanceof Error ? error.message : error);
    }
  };
  if (codeProblem) {
    try {
      admission = await (dependencies.reserve || reserveCodeExecution)(clerkId, env, {
        eventId: `${request.generation}:${request.eventId}`,
        eventKey: `${request.generation}:${eventType}:${eventKey}`,
      });
    } catch {
      console.error('[progress:events] execution admission is unavailable.');
      return { status: 503, data: { ok: false, error: 'Trusted code execution is unavailable.' } };
    }
    if (!admission.admitted) {
      return {
        status: admission.duplicate ? 409 : 429,
        headers: { 'Retry-After': String(admission.retryAfterSeconds) },
        data: admission.duplicate
          ? { ok: false, error: 'This learning event is already being verified. Retry shortly.', code: 'EVENT_IN_PROGRESS' }
          : { ok: false, error: 'Execution limit reached. Please retry shortly.' },
      };
    }

    try {
      const execution = await (dependencies.execute || executePythonJob)({
        sourceCode: request.sourceCode!,
        problem: codeProblem,
        trace: false,
        env,
      });
      if (execution.result.status !== 'PASSED'
        || execution.result.summary.total <= 0
        || execution.result.summary.passed !== execution.result.summary.total
        || execution.result.tests.length !== execution.result.summary.total
        || execution.result.tests.some((test) => test.status !== 'PASSED')) {
        await releaseAdmission();
        return { status: 422, data: { ok: false, error: 'The registered coding tests did not all pass.' } };
      }
    } catch (error) {
      await releaseAdmission();
      console.warn('[progress:events] trusted execution failed:', error instanceof Error ? error.message : error);
      return { status: 503, data: { ok: false, error: 'Trusted code execution is unavailable.' } };
    }
  }

  try {
    const persist = dependencies.persistEvent || saveValidatedEvent;
    const recorded = await persist(
      sql,
      userId,
      request.eventId,
      eventType,
      eventKey,
      missionId,
      nodeId,
      skillId,
      problemId,
      xp,
      request.generation,
      metadata,
      requiredMissionIds,
      requiresGame,
      reviewDueAt,
    );
    await releaseAdmission();
    const outcome = recorded[0];
    if (!outcome) throw new Error('Learning event transaction returned no outcome.');
    if (outcome.outcome === 'stale') {
      return {
        status: 409,
        data: {
          ok: false,
          error: 'This learning event belongs to an earlier progress generation.',
          code: 'STALE_GENERATION',
          generation: Number(outcome.generation),
        },
      };
    }
    if (outcome.outcome === 'review_not_due') {
      return { status: 409, data: { ok: false, error: 'This skill does not have a review due yet.' } };
    }
    const awarded = outcome.outcome === 'applied' ? outcome : null;
    const snapshot = await handleGetProgress(headers, env, {
      authenticate: dependencies.authenticate,
      createSql: dependencies.createSql,
      checkSchema: dependencies.checkSchema,
    });
    if (snapshot.status !== 200 || !snapshot.data.ok) {
      return { status: 500, data: { ok: false, error: 'Learning event was recorded but progress could not be refreshed.' } };
    }
    return {
      status: 200,
      data: {
        ok: true,
        duplicate: !awarded,
        awardedXp: Number(awarded?.xp_awarded) || 0,
        stars: Number(awarded?.stars_awarded) || 0,
        snapshot: snapshot.data,
      },
    };
  } catch (error) {
    console.error('[progress:events] atomic event persistence failed:', error instanceof Error ? error.message : error);
    return { status: 500, data: { ok: false, error: 'Unable to record learning event.' } };
  } finally {
    await releaseAdmission();
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    }
  }
  const result = await handleLearningEvent(body, req.headers, process.env);
  for (const [name, value] of Object.entries(result.headers || {})) res.setHeader(name, value);
  return res.status(result.status).json(result.data);
}

export const config = { maxDuration: 60 };
