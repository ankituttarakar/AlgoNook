import assert from 'node:assert/strict';
import test from 'node:test';
import { handleGetProgress, handleSaveProgress } from '../api/progress.ts';
import { handleLearningEvent } from '../api/progress/events.ts';
import { loadUserProgress, saveUserProgress, submitLearningEvent } from '../src/lib/db.ts';
import { MISSION_MAP } from '../src/data/missions/index.js';

const env = {
  CLERK_SECRET_KEY: 'test-secret',
  DATABASE_URL: 'postgresql://test.invalid/algonook',
};
const headers = { authorization: 'Bearer test-token' };
const missionId = 'code-max-profit';
const problemId = 'max-profit';
const eventId = '00000000-0000-4000-8000-000000000001';

function verifiedEvidence(mission) {
  return mission.problemFlow.steps
    .filter((step) => ['choice', 'tests', 'order'].includes(step.type))
    .map((step) => ({
      stepId: step.id,
      answer: step.type === 'choice'
        ? step.options.find((option) => option.correct).text
        : step.type === 'tests'
          ? step.cases.map((item) => item.options.find((option) => option.correct).text)
          : step.challenge.items,
    }));
}

function createHarness({ initial = {}, failAfterCommit = false } = {}) {
  const state = {
    xp: 0,
    level: 1,
    generation: 0,
    updatedAt: Date.now(),
    sound: true,
    booted: false,
    callsign: 'OPERATOR',
    missions: {},
    skills: {},
    topics: {},
    events: new Map(),
    progressPresent: true,
    userExists: true,
    ...initial,
  };
  let failNextCommit = failAfterCommit;
  let transactionQueue = Promise.resolve();

  const sql = async (strings, ...values) => {
    const query = strings.join('');
    if (state.dbFailureQuery && query.includes(state.dbFailureQuery)) {
      throw new Error(`relation ${state.dbFailureQuery} does not exist`);
    }
    if (query.includes('SELECT id FROM users')) return state.userExists ? [{ id: 'db-user-a' }] : [];
    if (query.includes('SELECT xp, level, sound, booted, reset_generation, updated_at')
      && query.includes('FROM user_progress')) {
      return state.progressPresent
        ? [{
          xp: state.xp,
          level: state.level,
          sound: state.sound,
          booted: state.booted,
          reset_generation: state.generation,
          updated_at: new Date(state.updatedAt),
        }]
        : [];
    }
    if (query.includes('WITH target AS') && query.includes('reset_progress')) {
      state.xp = 0;
      state.level = 1;
      state.generation += 1;
      state.updatedAt += 1;
      state.sound = true;
      state.booted = false;
      state.missions = {};
      state.skills = {};
      state.topics = {};
      return [{
        user_id: 'db-user-a',
        xp: state.xp,
        level: state.level,
        sound: state.sound,
        booted: state.booted,
        reset_generation: state.generation,
        updated_at: new Date(state.updatedAt),
        callsign: state.callsign,
      }];
    }
    if (query.includes('SELECT user_id FROM user_progress')) {
      return state.progressPresent ? [{ user_id: 'db-user-a' }] : [];
    }
    if (query.includes('WITH user_row AS') && query.includes('initial_progress')) {
      state.userExists = true;
      state.progressPresent = true;
      return [{ id: 'db-user-a' }];
    }
    if (query.includes('SELECT id FROM learning_events')) {
      return [...state.events.values()]
        .filter((event) => event.identityKey.startsWith('db-user-a:'))
        .map(() => ({ id: 'existing-event' }));
    }
    if (query.includes('SELECT review_due_at FROM skill_mastery')) {
      const skillId = values[1];
      const skill = state.skills[skillId];
      return skill?.reviewDue && skill.reviewDue <= Date.now()
        ? [{ review_due_at: new Date(skill.reviewDue).toISOString() }]
        : [];
    }
    if (query.includes('SELECT callsign FROM users')) return [{ callsign: state.callsign }];
    if (query.includes('SELECT mission_id, stars, mistakes, cleared_at')) {
      return Object.entries(state.missions).map(([id, item]) => ({
        mission_id: id,
        stars: item.stars,
        mistakes: item.mistakes,
        cleared_at: item.clearedAt ? new Date(item.clearedAt) : null,
      }));
    }
    if (query.includes('FROM skill_mastery')) {
      return Object.entries(state.skills).map(([id, item]) => ({
        skill_id: id,
        mastery_level: item.masteryLevel,
        attempts: item.attempts,
        successful_independent_solves: item.successfulIndependentSolves,
        highest_hint_level_revealed: 0,
        total_hints_used: 0,
        ladder_reveals: [0, 0, 0, 0, 0, 0],
        last_practiced_at: item.lastPracticed ? new Date(item.lastPracticed) : null,
        review_due_at: item.reviewDue ? new Date(item.reviewDue) : null,
      }));
    }
    if (query.includes('FROM topic_progress')) {
      return Object.entries(state.topics).map(([id, item]) => ({
        node_id: id,
        stages: item.stages,
        started_at: item.startedAt ? new Date(item.startedAt) : null,
        completed_at: item.completedAt ? new Date(item.completedAt) : null,
      }));
    }
    throw new Error(`Unexpected SQL in test harness: ${query}`);
  };
  sql.transaction = async (buildQueries) => {
    let queue = Promise.resolve();
    const transaction = (strings, ...values) => {
      const result = queue.then(() => sql(strings, ...values));
      queue = result.then(() => undefined, () => undefined);
      return result;
    };
    return Promise.all(buildQueries(transaction));
  };

  const persistEvent = (...args) => {
    const operation = transactionQueue.then(async () => {
      const [, userId, id, type, key, mission, node, skill, problem, xp, generation, metadata] = args;
      if (generation !== state.generation) return [{ outcome: 'stale', generation: state.generation }];
      const identityKey = `${userId}:${generation}:${id}`;
      const rewardKey = `${userId}:${generation}:${type}:${key}`;
      if ([...state.events.values()].some((event) => event.identityKey === identityKey || event.rewardKey === rewardKey)) {
        return [{ outcome: 'duplicate', generation: state.generation }];
      }
      const recorded = {
        identityKey,
        rewardKey,
        generation,
        outcome: 'applied',
        xp_awarded: xp,
        stars_awarded: mission ? 1 : 0,
      };
      state.events.set(identityKey, recorded);
      state.xp += xp;
      state.updatedAt = Math.max(Date.now(), state.updatedAt + 1);
      state.level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * state.xp) / 50)) / 2));
      if (mission) state.missions[mission] = { stars: 1, mistakes: null, clearedAt: Date.now() };
      if (skill && ['mission_completed', 'review_completed'].includes(type)) {
        const current = state.skills[skill] || {
          masteryLevel: 'introduced',
          attempts: 0,
          successfulIndependentSolves: 0,
        };
        const attempts = current.attempts + 1;
        const successes = current.successfulIndependentSolves + (metadata.verifiedIndependent ? 1 : 0);
        const tier = current.masteryLevel === 'introduced'
          ? 'guided'
          : current.masteryLevel === 'guided'
            ? 'practicing'
            : current.masteryLevel === 'practicing' && successes >= 1
              ? 'independent'
              : current.masteryLevel;
        state.skills[skill] = {
          ...current,
          masteryLevel: tier,
          attempts,
          successfulIndependentSolves: successes,
          lastPracticed: Date.now(),
          reviewDue: Date.now() + 86400000,
        };
      }
      if (node && type === 'game_lab_completed') {
        state.topics[node] = { stages: { game: true }, startedAt: Date.now(), completedAt: null };
      }
      if (failNextCommit) {
        failNextCommit = false;
        throw new Error('simulated lost response after commit');
      }
      return [recorded];
    });
    transactionQueue = operation.catch(() => {});
    return operation;
  };

  return {
    state,
    dependencies: {
      authenticate: async () => 'clerk-user-a',
      createSql: () => sql,
      checkSchema: async () => ({ compatible: true }),
      persistEvent,
      execute: async ({ problem }) => ({
        status: 200,
        result: {
          status: 'PASSED',
          summary: { passed: problem.testCases.length, total: problem.testCases.length },
          tests: problem.testCases.map((item) => ({ id: item.id, status: 'PASSED' })),
        },
      }),
    },
  };
}

function codingEvent(overrides = {}) {
  const mission = MISSION_MAP[missionId];
  return {
    eventId,
    generation: 0,
    type: 'mission_completed',
    missionId,
    problemId,
    language: 'python',
    sourceCode: 'def maxProfit(prices):\n    return max([0] + [prices[j] - prices[i] for i in range(len(prices)) for j in range(i + 1, len(prices))])\n',
    evidence: verifiedEvidence(mission),
    ...overrides,
  };
}

test('authenticated progress writes cannot set XP, mastery, mission clears, or stars', async () => {
  for (const payload of [
    { xp: 9000 },
    { skills: [{ skillId: 'arrays-max-profit', masteryLevel: 'retained' }] },
    { missions: [{ missionId: 'made-up', stars: 3 }] },
    { stars: 3 },
  ]) {
    const result = await handleSaveProgress(payload, headers, env, {
      authenticate: async () => 'clerk-user-a',
    });
    assert.equal(result.status, 400);
    assert.equal(result.data.ok, false);
  }
});

test('valid coding completion is rerun by the server and produces bounded progression', async () => {
  const harness = createHarness();
  const result = await handleLearningEvent(codingEvent(), headers, env, harness.dependencies);
  assert.equal(result.status, 200);
  assert.equal(result.data.ok, true);
  assert.equal(result.data.awardedXp, 95);
  assert.equal(result.data.stars, 1);
  assert.equal(result.data.snapshot.progress.xp, 95);
  assert.equal(result.data.snapshot.progress.generation, 0);
  assert.equal(result.data.snapshot.missions[missionId].stars, 1);
  assert.equal(result.data.snapshot.skills['arrays-max-profit'].masteryLevel, 'guided');
  assert.equal(harness.state.events.size, 1);
});

test('a client-supplied pass flag cannot replace server execution', async () => {
  const harness = createHarness();
  const request = codingEvent({ passed: true, tests: [{ passed: true }] });
  const result = await handleLearningEvent(request, headers, env, harness.dependencies);
  assert.equal(result.status, 400);
  assert.equal(harness.state.events.size, 0);
});

test('invalid mission and problem references are rejected', async () => {
  const harness = createHarness();
  const invalidMission = await handleLearningEvent(codingEvent({ missionId: 'code-not-a-problem' }), headers, env, harness.dependencies);
  const invalidProblem = await handleLearningEvent(codingEvent({ problemId: 'not-registered' }), headers, env, harness.dependencies);
  assert.equal(invalidMission.status, 400);
  assert.equal(invalidProblem.status, 400);
  assert.equal(harness.state.events.size, 0);
});

test('duplicate events and replayed mission reward keys never award XP twice', async () => {
  const harness = createHarness();
  const first = await handleLearningEvent(codingEvent(), headers, env, harness.dependencies);
  const retry = await handleLearningEvent(codingEvent(), headers, env, harness.dependencies);
  const replay = await handleLearningEvent(codingEvent({ eventId: '00000000-0000-4000-8000-000000000002' }), headers, env, harness.dependencies);
  assert.equal(first.data.awardedXp, 95);
  assert.equal(retry.data.duplicate, true);
  assert.equal(retry.data.awardedXp, 0);
  assert.equal(replay.data.duplicate, true);
  assert.equal(harness.state.xp, 95);
});

test('a due review requires a verified solve and awards only its fixed reward', async () => {
  const harness = createHarness({
    initial: {
      skills: {
        'arrays-max-profit': {
          masteryLevel: 'practicing',
          attempts: 2,
          successfulIndependentSolves: 1,
          reviewDue: Date.now() - 1000,
        },
      },
    },
  });
  const request = codingEvent({
    type: 'review_completed',
    eventId: '00000000-0000-4000-8000-000000000004',
  });
  const result = await handleLearningEvent(request, headers, env, harness.dependencies);
  assert.equal(result.status, 200);
  assert.equal(result.data.awardedXp, 35);
  assert.equal(result.data.stars, 0);
  assert.equal(harness.state.xp, 35);
  assert.equal(harness.state.missions[missionId], undefined);

  const notDue = createHarness();
  const rejected = await handleLearningEvent({
    ...request,
    eventId: '00000000-0000-4000-8000-000000000005',
  }, headers, env, notDue.dependencies);
  assert.equal(rejected.status, 409);
  assert.equal(notDue.state.events.size, 0);
});

test('retry after a lost success response returns idempotently', async () => {
  const harness = createHarness({ failAfterCommit: true });
  const first = await handleLearningEvent(codingEvent(), headers, env, harness.dependencies);
  assert.equal(first.status, 500);
  const retry = await handleLearningEvent(codingEvent(), headers, env, harness.dependencies);
  assert.equal(retry.status, 200);
  assert.equal(retry.data.duplicate, true);
  assert.equal(retry.data.snapshot.progress.xp, 95);
  assert.equal(harness.state.xp, 95);
});

test('event identity is authenticated and a user cannot target another account', async () => {
  const harness = createHarness();
  const request = codingEvent({ userId: 'db-user-b' });
  const result = await handleLearningEvent(request, headers, env, harness.dependencies);
  assert.equal(result.status, 400);
  assert.equal(harness.state.events.size, 0);
});

test('server execution failure does not create progress', async () => {
  const harness = createHarness();
  harness.dependencies.execute = async ({ problem }) => ({
    status: 200,
    result: {
      status: 'WRONG_ANSWER',
      summary: { passed: 1, total: problem.testCases.length },
      tests: problem.testCases.map((item, index) => ({ id: item.id, status: index === 0 ? 'PASSED' : 'WRONG_ANSWER' })),
    },
  });
  const result = await handleLearningEvent(codingEvent(), headers, env, harness.dependencies);
  assert.equal(result.status, 422);
  assert.equal(harness.state.events.size, 0);
  assert.equal(harness.state.xp, 0, JSON.stringify(harness.state.queries));
});

test('concurrent tabs cannot award a mission twice', async () => {
  const harness = createHarness();
  const first = codingEvent();
  const concurrentRetry = codingEvent({ eventId: '00000000-0000-4000-8000-000000000003' });
  const results = await Promise.all([
    handleLearningEvent(first, headers, env, harness.dependencies),
    handleLearningEvent(concurrentRetry, headers, env, harness.dependencies),
  ]);
  assert.equal(results.reduce((sum, result) => sum + (result.data.awardedXp || 0), 0), 95);
  assert.equal(harness.state.events.size, 1);
  assert.equal(harness.state.xp, 95);
});

test('authoritative progress hydration still returns existing aggregate records', async () => {
  const harness = createHarness({
    initial: {
      xp: 420,
      level: 4,
      missions: { legacy: { stars: 3, mistakes: 2, clearedAt: 1720000000000 } },
      skills: {
        'legacy-skill': {
          masteryLevel: 'retained',
          attempts: 8,
          successfulIndependentSolves: 4,
          lastPracticed: 1720000000000,
          reviewDue: 1720100000000,
        },
      },
      topics: { arrays: { stages: { concept: true }, startedAt: 1710000000000, completedAt: 1710100000000 } },
    },
  });
  const result = await handleGetProgress(headers, env, harness.dependencies);
  assert.equal(result.status, 200);
  assert.equal(result.data.progress.xp, 420);
  assert.equal(result.data.missions.legacy.stars, 3);
  assert.equal(result.data.skills['legacy-skill'].masteryLevel, 'retained');
  assert.equal(result.data.topics.arrays.stages.concept, true);
});

test('a genuinely new authenticated user receives an initial authoritative snapshot', async () => {
  const harness = createHarness({ initial: { userExists: false, progressPresent: false } });
  const result = await handleGetProgress(headers, env, harness.dependencies);
  assert.equal(result.status, 200);
  assert.equal(result.data.progress.xp, 0);
  assert.equal(result.data.progress.level, 1);
  assert.equal(result.data.progress.generation, 0);
  assert.deepEqual(result.data.missions, {});
  assert.deepEqual(result.data.skills, {});
  assert.deepEqual(result.data.topics, {});
  assert.equal(harness.state.userExists, true);
  assert.equal(harness.state.progressPresent, true);
});

test('database read and missing progress row failures never become empty success snapshots', async () => {
  const missingTable = createHarness({ initial: { dbFailureQuery: 'topic_progress' } });
  const failedRead = await handleGetProgress(headers, env, missingTable.dependencies);
  assert.equal(failedRead.status, 500);
  assert.equal(failedRead.data.ok, false);
  assert.equal(failedRead.data.progress, undefined);

  const missingProgress = createHarness({ initial: { progressPresent: false } });
  const failedHydration = await handleGetProgress(headers, env, missingProgress.dependencies);
  assert.equal(failedHydration.status, 500);
  assert.equal(failedHydration.data.ok, false);
  assert.equal(failedHydration.data.progress, undefined);
});

test('an incompatible schema fails progress hydration with a controlled migration error', async () => {
  const harness = createHarness();
  harness.dependencies.checkSchema = async () => ({ compatible: false });
  const result = await handleGetProgress(headers, env, harness.dependencies);
  assert.equal(result.status, 503);
  assert.equal(result.data.ok, false);
  assert.match(result.data.error, /schema is incompatible/i);
  assert.equal(result.data.progress, undefined);
});

test('client rejects a malformed HTTP-success response instead of hydrating defaults', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    ok: true,
    progress: { xp: 0, level: 1, sound: true, booted: false },
    missions: {},
    skills: {},
    topics: {},
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    const result = await loadUserProgress(async () => 'valid-session-token');
    assert.equal(result.ok, false);
    assert.equal(result.status, 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('client sends its hydrated generation and surfaces stale-generation conflicts', async () => {
  const originalFetch = globalThis.fetch;
  let submittedBody;
  globalThis.fetch = async (_url, options) => {
    submittedBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      ok: false,
      code: 'STALE_GENERATION',
      generation: 1,
      error: 'This learning event belongs to an earlier progress generation.',
    }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const result = await submitLearningEvent(codingEvent({ generation: 5 }), async () => 'valid-session-token');
    assert.equal(submittedBody.generation, 5);
    assert.equal(result.ok, false);
    assert.equal(result.status, 409);
    assert.equal(result.code, 'STALE_GENERATION');
    assert.equal(result.generation, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('client reset transport preserves failures and validates the authoritative generation snapshot', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: false, error: 'Database unavailable.' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
  try {
    const failed = await saveUserProgress({ reset: true }, async () => 'valid-session-token');
    assert.equal(failed.ok, false);
    assert.equal(failed.status, 500);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const snapshot = {
    ok: true,
    progress: {
      xp: 0,
      level: 1,
      sound: true,
      booted: false,
      generation: 6,
      updatedAt: Date.now(),
      callsign: 'OPERATOR',
    },
    missions: {},
    skills: {},
    topics: {},
  };
  globalThis.fetch = async () => new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  try {
    const succeeded = await saveUserProgress({ reset: true }, async () => 'valid-session-token');
    assert.equal(succeeded.ok, true);
    assert.equal(succeeded.snapshot.progress.generation, 6);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reset is committed as one transaction and database failure is reported', async () => {
  const harness = createHarness({
    initial: {
      xp: 420,
      level: 4,
      missions: { [missionId]: { stars: 1, mistakes: null, clearedAt: Date.now() } },
    },
  });
  const reset = await handleSaveProgress({ reset: true }, headers, env, harness.dependencies);
  assert.equal(reset.status, 200);
  assert.equal(harness.state.xp, 0);
  assert.equal(harness.state.generation, 1);
  assert.equal(reset.data.progress.generation, 1);
  assert.equal(reset.data.progress.xp, 0);
  assert.deepEqual(reset.data.missions, {});

  const failed = createHarness({
    initial: { xp: 420, level: 4, dbFailureQuery: 'WITH target AS' },
  });
  const result = await handleSaveProgress({ reset: true }, headers, env, failed.dependencies);
  assert.equal(result.status, 500);
  assert.equal(result.data.ok, false);
  assert.equal(failed.state.xp, 420);
});

test('stale generation event is rejected after reset without restoring progress', async () => {
  const harness = createHarness();
  const reset = await handleSaveProgress({ reset: true }, headers, env, harness.dependencies);
  assert.equal(reset.status, 200);
  const event = await handleLearningEvent(codingEvent(), headers, env, harness.dependencies);
  assert.equal(event.status, 409);
  assert.equal(event.data.code, 'STALE_GENERATION');
  assert.equal(harness.state.generation, 1);
  assert.equal(harness.state.xp, 0);
  assert.deepEqual(harness.state.missions, {});
  assert.deepEqual(harness.state.skills, {});
  assert.deepEqual(harness.state.topics, {});
});

test('event committed before reset is cleared and its ledger key remains consumed', async () => {
  const harness = createHarness();
  const event = await handleLearningEvent(codingEvent(), headers, env, harness.dependencies);
  assert.equal(event.status, 200);
  assert.equal(harness.state.xp, 95);
  const ledgerSize = harness.state.events.size;
  const reset = await handleSaveProgress({ reset: true }, headers, env, harness.dependencies);
  assert.equal(reset.status, 200);
  assert.equal(harness.state.generation, 1);
  assert.equal(harness.state.xp, 0);
  assert.equal(harness.state.events.size, ledgerSize);
  const retry = await handleLearningEvent(codingEvent(), headers, env, harness.dependencies);
  assert.equal(retry.status, 409);
  assert.equal(harness.state.xp, 0);
});

test('event started before reset is fenced if execution finishes after reset commits', async () => {
  const harness = createHarness();
  let releaseExecution;
  let startedExecution;
  const executionStarted = new Promise((resolve) => { startedExecution = resolve; });
  const executionGate = new Promise((resolve) => { releaseExecution = resolve; });
  harness.dependencies.execute = async ({ problem }) => {
    startedExecution();
    await executionGate;
    return {
      status: 200,
      result: {
        status: 'PASSED',
        summary: { passed: problem.testCases.length, total: problem.testCases.length },
        tests: problem.testCases.map((item) => ({ id: item.id, status: 'PASSED' })),
      },
    };
  };

  const oldEventPromise = handleLearningEvent(codingEvent(), headers, env, harness.dependencies);
  await executionStarted;
  const reset = await handleSaveProgress({ reset: true }, headers, env, harness.dependencies);
  assert.equal(reset.data.progress.generation, 1);
  releaseExecution();
  const oldEvent = await oldEventPromise;
  assert.equal(oldEvent.status, 409);
  assert.equal(oldEvent.data.code, 'STALE_GENERATION');
  assert.equal(harness.state.xp, 0);
  assert.equal(harness.state.events.size, 0);
});

test('reset failure preserves generation, event ledger, and prior aggregate progress', async () => {
  const harness = createHarness({
    initial: {
      xp: 420,
      level: 4,
      generation: 5,
      dbFailureQuery: 'WITH target AS',
    },
  });
  const event = await handleLearningEvent(codingEvent({ generation: 5 }), headers, env, harness.dependencies);
  assert.equal(event.status, 200);
  const previousLedger = harness.state.events.size;
  harness.state.dbFailureQuery = 'WITH target AS';
  const reset = await handleSaveProgress({ reset: true }, headers, env, harness.dependencies);
  assert.equal(reset.status, 500);
  assert.equal(harness.state.generation, 5);
  assert.equal(harness.state.xp, 515);
  assert.equal(harness.state.events.size, previousLedger);
});
