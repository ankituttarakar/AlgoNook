// AlgoNook — Client-side API helper for user synchronization & progress persistence
// Note: Direct database access is kept strictly server-side (api/sync-user.ts and api/progress.ts).
// Neon is the authoritative source of truth for authenticated progress. localStorage is NEVER
// authoritative; it only holds a best-effort cache.

export interface ClerkUserData {
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
}

export interface ServerMissionRecord {
  stars: number;
  mistakes: number | null;
  clearedAt: number | null;
}

export interface ServerSkillRecord {
  skill: string;
  masteryLevel: string;
  attempts: number;
  successfulIndependentSolves: number;
  hintUsage: {
    totalHintsUsed: number;
    highestLevelHintRevealed: number;
    ladderReveals: number[];
  };
  lastPracticed: number | null;
  reviewDue: number | null;
}

export interface ServerTopicRecord {
  stages: Record<string, boolean>;
  startedAt: number | null;
  completedAt: number | null;
}

export interface ServerProgressSnapshot {
  progress: {
    xp: number;
    level: number;
    sound: boolean;
    booted: boolean;
    generation: number;
    updatedAt: number;
    callsign?: string;
  };
  missions: Record<string, ServerMissionRecord>;
  skills: Record<string, ServerSkillRecord>;
  topics: Record<string, ServerTopicRecord>;
}

export interface ProgressSavePayload {
  sound?: boolean;
  booted?: boolean;
  callsign?: string;
  reset?: true;
}

export type ApiOutcome =
  | { ok: true; snapshot?: ServerProgressSnapshot }
  | { ok: false; error: string; status?: number; unauthorized?: boolean };

export type LearningEventPayload =
  | {
      eventId: string;
      generation: number;
      type: 'mission_completed' | 'review_completed';
      missionId: string;
      problemId?: string;
      language?: string;
      sourceCode?: string;
      hintLevelsUsed?: number[];
      evidence: Array<{ type: string; answer: string | string[] } | { stepId: string; answer: string | string[] }>;
    }
  | {
      eventId: string;
      generation: number;
      type: 'game_lab_completed';
      nodeId: string;
      evidence: Array<{ stageId: string; answer: string | string[] }>;
    };

export type LearningEventOutcome =
  | { ok: true; duplicate: boolean; awardedXp: number; stars: number; snapshot: ServerProgressSnapshot }
  | { ok: false; error: string; status?: number; code?: string; generation?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isProgressSnapshot(value: unknown): value is ServerProgressSnapshot {
  if (!isRecord(value) || !isRecord(value.progress)
    || !isRecord(value.missions) || !isRecord(value.skills) || !isRecord(value.topics)) return false;
  const progress = value.progress;
  const isFiniteNumber = (item: unknown) => typeof item === 'number' && Number.isFinite(item);
  const isNullableNumber = (item: unknown) => item === null || isFiniteNumber(item);
  const missionsValid = Object.values(value.missions).every((mission) => isRecord(mission)
    && isFiniteNumber(mission.stars) && isNullableNumber(mission.mistakes)
    && isNullableNumber(mission.clearedAt));
  const skillsValid = Object.values(value.skills).every((skill) => isRecord(skill)
    && typeof skill.skill === 'string' && typeof skill.masteryLevel === 'string'
    && isFiniteNumber(skill.attempts) && isFiniteNumber(skill.successfulIndependentSolves)
    && isNullableNumber(skill.lastPracticed) && isNullableNumber(skill.reviewDue)
    && isRecord(skill.hintUsage)
    && isFiniteNumber(skill.hintUsage.totalHintsUsed)
    && isFiniteNumber(skill.hintUsage.highestLevelHintRevealed)
    && Array.isArray(skill.hintUsage.ladderReveals) && skill.hintUsage.ladderReveals.length === 6
    && skill.hintUsage.ladderReveals.every(isFiniteNumber));
  const topicsValid = Object.values(value.topics).every((topic) => isRecord(topic)
    && isNullableNumber(topic.startedAt) && isNullableNumber(topic.completedAt)
    && isRecord(topic.stages)
    && Object.values(topic.stages).every((stage) => typeof stage === 'boolean'));
  return missionsValid && skillsValid && topicsValid
    && typeof progress.xp === 'number' && Number.isFinite(progress.xp) && progress.xp >= 0
    && typeof progress.level === 'number' && Number.isFinite(progress.level) && progress.level >= 1
    && typeof progress.sound === 'boolean' && typeof progress.booted === 'boolean'
    && typeof progress.generation === 'number' && Number.isSafeInteger(progress.generation) && progress.generation >= 0
    && typeof progress.updatedAt === 'number' && Number.isFinite(progress.updatedAt)
    && (progress.callsign === undefined || typeof progress.callsign === 'string');
}

async function postJson(
  url: string,
  method: string,
  token: string,
  body?: unknown,
  opts?: { keepalive?: boolean },
) {
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // keepalive lets the browser finish the request after the tab is hidden/closed.
    keepalive: opts?.keepalive === true,
  });
}

/**
 * Syncs a Clerk user into Neon PostgreSQL via the server-side /api/sync-user endpoint.
 * Passes the Clerk session JWT in the Authorization Bearer header.
 * User ID is extracted and verified on the server.
 */
export async function syncClerkUser(user: ClerkUserData, getToken: () => Promise<string | null>) {
  try {
    const token = await getToken();
    if (!token) {
      console.warn('[User Sync] No session token available');
      return { ok: false, error: 'No session token' };
    }

    const res = await postJson('/api/sync-user', 'POST', token, user);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message = errData.error || res.statusText || `HTTP ${res.status}`;
      console.warn('[User Sync] Server sync error:', message);
      return { ok: false, error: message };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[User Sync] Network error during user sync:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Loads the CURRENT authenticated user's full authoritative progress snapshot
 * (xp, level, sound, booted, missions, skills, topics) from Neon via /api/progress.
 */
export async function loadUserProgress(
  getToken: () => Promise<string | null>,
): Promise<ApiOutcome> {
  try {
    const token = await getToken();
    if (!token) {
      return { ok: false, error: 'No session token' };
    }

    const res = await fetch('/api/progress', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message = errData.error || res.statusText || `HTTP ${res.status}`;
      console.warn('[Progress Sync] Server load error:', message);
      return {
        ok: false,
        error: message,
        status: res.status,
        unauthorized: res.status === 401,
      };
    }

    const data = await res.json();
    if (!isRecord(data) || data.ok !== true || !isProgressSnapshot(data)) {
      return { ok: false, error: 'Server returned an invalid authoritative progress snapshot.', status: 502 };
    }
    return { ok: true, snapshot: data };
  } catch (err) {
    console.warn('[Progress Sync] Network error during load:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Persists client-editable preferences only. Progression totals are rejected by the API. */
export async function saveUserProgress(
  progress: ProgressSavePayload,
  getToken: () => Promise<string | null>,
  opts?: { keepalive?: boolean },
): Promise<ApiOutcome> {
  try {
    const token = await getToken();
    if (!token) {
      return { ok: false, error: 'No session token' };
    }

    const res = await postJson('/api/progress', 'POST', token, progress, opts);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message = errData.error || res.statusText || `HTTP ${res.status}`;
      console.warn('[Progress Sync] Server save error:', message);
      return {
        ok: false,
        error: message,
        status: res.status,
        unauthorized: res.status === 401,
      };
    }

    const data = await res.json();
    if (!isRecord(data) || data.ok !== true || !isProgressSnapshot(data)) {
      return { ok: false, error: 'Server returned an invalid authoritative progress snapshot.', status: 502 };
    }
    return { ok: true, snapshot: data };
  } catch (err) {
    console.warn('[Progress Sync] Network error during save:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Records only server-verifiable evidence; progression totals are never sent. */
export async function submitLearningEvent(
  event: LearningEventPayload,
  getToken: () => Promise<string | null>,
): Promise<LearningEventOutcome> {
  try {
    const token = await getToken();
    if (!token) return { ok: false, error: 'No session token' };

    const res = await postJson('/api/progress/events', 'POST', token, event);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message = errData.error || res.statusText || `HTTP ${res.status}`;
      console.warn('[Progress Event] Server event error:', message);
      return {
        ok: false,
        error: message,
        status: res.status,
        ...(errData.code === 'STALE_GENERATION' ? { code: errData.code, generation: errData.generation } : {}),
      };
    }

    const data: unknown = await res.json();
    if (!isRecord(data) || data.ok !== true || typeof data.duplicate !== 'boolean'
      || typeof data.awardedXp !== 'number' || typeof data.stars !== 'number'
      || !isProgressSnapshot(data.snapshot)) {
      return { ok: false, error: 'Server returned an invalid learning progress response.', status: 502 };
    }
    return {
      ok: true,
      duplicate: data.duplicate,
      awardedXp: data.awardedXp,
      stars: data.stars,
      snapshot: data.snapshot,
    };
  } catch (err) {
    console.warn('[Progress Event] Network error:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
