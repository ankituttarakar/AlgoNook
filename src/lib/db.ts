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
  mistakes: number;
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
    callsign?: string;
  };
  missions: Record<string, ServerMissionRecord>;
  skills: Record<string, ServerSkillRecord>;
  topics: Record<string, ServerTopicRecord>;
}

export interface ProgressSavePayload {
  xp: number;
  level: number;
  sound: boolean;
  booted: boolean;
  callsign?: string;
  missions: Array<{ missionId: string; stars: number; mistakes: number; clearedAt: number | null }>;
  skills: Array<{
    skillId: string;
    masteryLevel: string;
    attempts: number;
    successfulIndependentSolves: number;
    highestHintLevelRevealed: number;
    totalHintsUsed: number;
    ladderReveals: number[];
    lastPracticed: number | null;
    reviewDue: number | null;
  }>;
  topics: Array<{
    nodeId: string;
    stages: Record<string, boolean>;
    startedAt: number | null;
    completedAt: number | null;
  }>;
  reset?: boolean;
}

export type ApiOutcome =
  | { ok: true; snapshot?: ServerProgressSnapshot }
  | { ok: false; error: string; status?: number; unauthorized?: boolean };

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
    return { ok: true, snapshot: data as ServerProgressSnapshot };
  } catch (err) {
    console.warn('[Progress Sync] Network error during load:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Persists the FULL progress snapshot to Neon via authenticated /api/progress endpoint.
 * The server responds with the authoritative merged snapshot; callers should NOT
 * treat the just-sent payload as confirmed until this resolves ok.
 */
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
    return { ok: true, snapshot: data as ServerProgressSnapshot };
  } catch (err) {
    console.warn('[Progress Sync] Network error during save:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
