// AlgoNook — Client-side API helper for user synchronization & progress persistence
// Note: Direct database access is kept strictly server-side (api/sync-user.ts and api/progress.ts).

export interface ClerkUserData {
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
}

export interface UserProgressData {
  xp: number;
  level: number;
  sound?: boolean;
  booted?: boolean;
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

    const res = await fetch('/api/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(user),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('[User Sync] Server sync error:', errData.error || res.statusText);
      return { ok: false, error: errData.error || res.statusText };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[User Sync] Network error during user sync:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Loads current user's persistent progress (xp, level) from Neon via authenticated /api/progress endpoint.
 */
export async function loadUserProgress(getToken: () => Promise<string | null>) {
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
      console.warn('[Progress Sync] Server load error:', errData.error || res.statusText);
      return { ok: false, error: errData.error || res.statusText };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[Progress Sync] Network error during load:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Persists updated XP and Level to Neon via authenticated /api/progress endpoint.
 */
export async function saveUserProgress(
  progress: { xp: number; level: number },
  getToken: () => Promise<string | null>
) {
  try {
    const token = await getToken();
    if (!token) {
      return { ok: false, error: 'No session token' };
    }

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(progress),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('[Progress Sync] Server save error:', errData.error || res.statusText);
      return { ok: false, error: errData.error || res.statusText };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[Progress Sync] Network error during save:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
