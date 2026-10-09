import { neon } from '@neondatabase/serverless';
import { authenticateRequest } from './clerk-auth.mjs';
import { DEFAULT_CALLSIGN, normalizeCallsign } from '../src/lib/callsign.mjs';

export interface SyncUserPayload {
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
}

export interface SyncResult {
  status: number;
  data: {
    ok: boolean;
    user?: any;
    error?: string;
  };
}

/**
 * Handles syncing a Clerk user into Neon PostgreSQL server-side.
 * Verifies authenticated session via Clerk JWT / Bearer token.
 * Derives user ID strictly from the verified Clerk token (sub).
 */
export async function handleSyncUser(
  body: SyncUserPayload,
  headers: Record<string, string | string[] | undefined> = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<SyncResult> {
  const secretKey = env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return {
      status: 500,
      data: { ok: false, error: 'CLERK_SECRET_KEY is not configured on server' },
    };
  }

  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    return {
      status: 500,
      data: { ok: false, error: 'DATABASE_URL is not configured on server' },
    };
  }

  // 1-2. Extract + verify the session token; user id comes ONLY from the verified JWT `sub`.
  let verifiedUserId: string;
  try {
    verifiedUserId = await authenticateRequest(headers, secretKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.startsWith('Unauthorized')) console.warn(`[auth:sync-user] ${message}`);
    return {
      status: 401,
      data: { ok: false, error: 'Unauthorized: Invalid or expired authentication token' },
    };
  }

  // 3. Upsert user into Neon PostgreSQL using verified clerk_id
  try {
    const sql = neon(dbUrl);
    const { email, username, firstName } = body || {};
    // First-touch seed only: same rules as /api/progress so the value the API
    // returns on hydration is always one it will accept back on save.
    const callsign = normalizeCallsign(username || firstName) ?? DEFAULT_CALLSIGN;
    const userEmail = email || null;

    // callsign is seeded from Clerk on first insert only. On conflict it is
    // left untouched: an explicit callsign chosen on the boot screen is user
    // data and must survive re-syncs (verified via /api/progress saves).
    const rows = await sql`
      INSERT INTO users (clerk_id, callsign, email, updated_at)
      VALUES (${verifiedUserId}, ${callsign}, ${userEmail}, NOW())
      ON CONFLICT (clerk_id) 
      DO UPDATE SET 
        email = COALESCE(EXCLUDED.email, users.email),
        updated_at = NOW()
      RETURNING id, clerk_id, callsign, email, created_at, updated_at;
    `;

    return {
      status: 200,
      data: { ok: true, user: rows[0] },
    };
  } catch (err) {
    console.error(
      '[sync-user] Neon user upsert failed:',
      err instanceof Error ? err.message : String(err),
    );
    return {
      status: 500,
      data: { ok: false, error: 'Unable to sync user.' },
    };
  }
}

// Standard Vercel/Netlify/Node serverless handler format
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

  const result = await handleSyncUser(body, req.headers, process.env);
  return res.status(result.status).json(result.data);
}
