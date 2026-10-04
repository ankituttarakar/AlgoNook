import { verifyToken } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';

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

  // 1. Extract Bearer token from Authorization header or cookies
  let token: string | undefined;
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    const cookieHeader = headers['cookie'] || headers['Cookie'];
    if (typeof cookieHeader === 'string') {
      const match = cookieHeader.match(/__session=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }
  }

  if (!token) {
    return {
      status: 401,
      data: { ok: false, error: 'Unauthorized: Missing authentication token' },
    };
  }

  // 2. Verify token with Clerk
  let verifiedUserId: string;
  try {
    const verified = await verifyToken(token, {
      secretKey,
    });
    if (!verified || !verified.sub) {
      return {
        status: 401,
        data: { ok: false, error: 'Unauthorized: Invalid token payload' },
      };
    }
    verifiedUserId = verified.sub;
  } catch (err) {
    return {
      status: 401,
      data: { ok: false, error: `Unauthorized: Token verification failed (${err instanceof Error ? err.message : String(err)})` },
    };
  }

  // 3. Upsert user into Neon PostgreSQL using verified clerk_id
  try {
    const sql = neon(dbUrl);
    const { email, username, firstName } = body || {};
    const callsign = (username || firstName || 'OPERATOR').slice(0, 32);
    const userEmail = email || null;

    const rows = await sql`
      INSERT INTO users (clerk_id, callsign, email, updated_at)
      VALUES (${verifiedUserId}, ${callsign}, ${userEmail}, NOW())
      ON CONFLICT (clerk_id) 
      DO UPDATE SET 
        callsign = COALESCE(EXCLUDED.callsign, users.callsign),
        email = COALESCE(EXCLUDED.email, users.email),
        updated_at = NOW()
      RETURNING id, clerk_id, callsign, email, created_at, updated_at;
    `;

    return {
      status: 200,
      data: { ok: true, user: rows[0] },
    };
  } catch (err) {
    return {
      status: 500,
      data: { ok: false, error: err instanceof Error ? err.message : String(err) },
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
