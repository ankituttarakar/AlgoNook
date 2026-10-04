// AlgoNook — Client-side API helper for user synchronization
// Note: Direct database access is kept strictly server-side (api/sync-user.ts).

export interface ClerkUserData {
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
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
