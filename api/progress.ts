import { verifyToken } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';

export interface ProgressPayload {
  xp?: number;
  level?: number;
}

export interface ProgressResult {
  status: number;
  data: {
    ok: boolean;
    progress?: {
      xp: number;
      level: number;
      sound: boolean;
      booted: boolean;
    };
    error?: string;
  };
}

/**
 * Extracts and verifies the Clerk JWT token from Authorization header or cookies.
 * Returns the verified Clerk user ID (sub).
 */
async function authenticateClerkUser(
  headers: Record<string, string | string[] | undefined>,
  secretKey: string
): Promise<string> {
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
    throw new Error('Unauthorized: Missing authentication token');
  }

  const verified = await verifyToken(token, { secretKey });
  if (!verified || !verified.sub) {
    throw new Error('Unauthorized: Invalid token payload');
  }

  return verified.sub;
}

/**
 * Resolves or ensures a user record in the `users` table for the verified Clerk ID.
 */
async function resolveNeonUserId(sql: any, clerkId: string): Promise<string> {
  const users = await sql`
    SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1;
  `;
  if (users.length > 0) {
    return users[0].id;
  }

  // If user row doesn't exist yet, insert minimal user row
  const created = await sql`
    INSERT INTO users (clerk_id, callsign, updated_at)
    VALUES (${clerkId}, 'OPERATOR', NOW())
    ON CONFLICT (clerk_id) DO UPDATE SET updated_at = NOW()
    RETURNING id;
  `;
  return created[0].id;
}

/**
 * GET handler: Fetch current user's user_progress, or create default (xp=0, level=1) if none exists.
 */
export async function handleGetProgress(
  headers: Record<string, string | string[] | undefined> = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<ProgressResult> {
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

  try {
    const clerkId = await authenticateClerkUser(headers, secretKey);
    const sql = neon(dbUrl);
    const userId = await resolveNeonUserId(sql, clerkId);

    // Fetch existing progress
    const existing = await sql`
      SELECT xp, level, sound, booted
      FROM user_progress
      WHERE user_id = ${userId}
      LIMIT 1;
    `;

    if (existing.length > 0) {
      return {
        status: 200,
        data: {
          ok: true,
          progress: {
            xp: Number(existing[0].xp),
            level: Number(existing[0].level),
            sound: Boolean(existing[0].sound),
            booted: Boolean(existing[0].booted),
          },
        },
      };
    }

    // Initialize default row if not present
    const inserted = await sql`
      INSERT INTO user_progress (user_id, xp, level, sound, booted, created_at, updated_at)
      VALUES (${userId}, 0, 1, TRUE, FALSE, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
      RETURNING xp, level, sound, booted;
    `;

    return {
      status: 200,
      data: {
        ok: true,
        progress: {
          xp: Number(inserted[0].xp),
          level: Number(inserted[0].level),
          sound: Boolean(inserted[0].sound),
          booted: Boolean(inserted[0].booted),
        },
      },
    };
  } catch (err: any) {
    const isUnauthorized = String(err.message).startsWith('Unauthorized');
    return {
      status: isUnauthorized ? 401 : 500,
      data: { ok: false, error: err.message || String(err) },
    };
  }
}

/**
 * POST / PUT handler: Save or update current user's XP and Level.
 */
export async function handleSaveProgress(
  body: ProgressPayload,
  headers: Record<string, string | string[] | undefined> = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<ProgressResult> {
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

  if (body.xp === undefined || body.xp === null || isNaN(Number(body.xp)) || Number(body.xp) < 0) {
    return {
      status: 400,
      data: { ok: false, error: 'Invalid or missing xp in request body' },
    };
  }

  const targetXp = Math.floor(Number(body.xp));
  const targetLevel = (body.level !== undefined && !isNaN(Number(body.level)) && Number(body.level) >= 1)
    ? Math.floor(Number(body.level))
    : Math.max(1, Math.floor(Math.sqrt(targetXp / 50)) + 1); // fallback or derived

  try {
    const clerkId = await authenticateClerkUser(headers, secretKey);
    const sql = neon(dbUrl);
    const userId = await resolveNeonUserId(sql, clerkId);

    const updated = await sql`
      INSERT INTO user_progress (user_id, xp, level, updated_at)
      VALUES (${userId}, ${targetXp}, ${targetLevel}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        xp = EXCLUDED.xp,
        level = EXCLUDED.level,
        updated_at = NOW()
      RETURNING xp, level, sound, booted;
    `;

    return {
      status: 200,
      data: {
        ok: true,
        progress: {
          xp: Number(updated[0].xp),
          level: Number(updated[0].level),
          sound: Boolean(updated[0].sound),
          booted: Boolean(updated[0].booted),
        },
      },
    };
  } catch (err: any) {
    const isUnauthorized = String(err.message).startsWith('Unauthorized');
    return {
      status: isUnauthorized ? 401 : 500,
      data: { ok: false, error: err.message || String(err) },
    };
  }
}

// Serverless handler export (for Vercel / Netlify / generic Node adapters)
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
