import { authenticateRequest } from '../../server/clerk-auth.mjs';
import { checkDatabaseSchema } from '../../server/schemaHealth.mjs';
import { executePythonJob, sandboxUnavailable } from '../../server/code/runnerClient.mjs';
import { getSafeAdmissionDiagnostic, releaseCodeExecution, reserveCodeExecution } from '../../server/code/executionAdmission.mjs';
import { getCodeProblemById } from '../../server/code/problems/index.mjs';

const MAX_SOURCE_BYTES = 64 * 1024;

type Headers = Record<string, string | string[] | undefined>;

type ExecuteCodeRequest = {
  language: string;
  sourceCode: string;
  problemId: string;
  trace?: boolean;
};

export type ExecutionStatus =
  | 'PASSED'
  | 'WRONG_ANSWER'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'OUTPUT_LIMIT_EXCEEDED'
  | 'SANDBOX_ERROR'
  | 'SECURITY_REJECTED';

export type ExecutionResponse = {
  ok: boolean;
  status: ExecutionStatus;
  summary: { passed: number; total: number };
  tests: Array<{
    id: string;
    status: ExecutionStatus | 'NOT_RUN';
    expected?: unknown;
    actual?: unknown;
    stdout?: string;
    stderr?: string;
    durationMs?: number;
    error?: { code: string; message: string };
  }>;
  stdout: string;
  stderr: string;
  executionTimeMs: number | null;
  error?: { code: string; message: string };
};

type ApiResponse = {
  status: number;
  data: ExecutionResponse | { ok: false; error: string };
  headers?: Record<string, string>;
};

function learnerSafeExecution(result: ExecutionResponse): ExecutionResponse {
  return {
    ...result,
    tests: result.tests.map((test) => ({
      id: test.id,
      status: test.status,
      ...(test.durationMs === undefined ? {} : { durationMs: test.durationMs }),
      ...(test.error === undefined ? {} : { error: test.error }),
    })),
  };
}

function validateRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  const request = body as Partial<ExecuteCodeRequest>;
  if (Object.keys(body).some((key) => !['language', 'sourceCode', 'problemId', 'trace'].includes(key))) {
    return 'Request may contain only language, sourceCode, problemId, and trace.';
  }
  if (request.language !== 'python') {
    return 'Only Python is supported for trusted code execution.';
  }

  if (typeof request.sourceCode !== 'string' || request.sourceCode.trim().length === 0) {
    return 'sourceCode must be a non-empty string.';
  }
  if (new TextEncoder().encode(request.sourceCode).length > MAX_SOURCE_BYTES) {
    return 'sourceCode exceeds the 64 KiB limit.';
  }

  if (typeof request.problemId !== 'string' || !getCodeProblemById(request.problemId)) {
    return 'problemId must identify a supported DSA problem.';
  }
  if (request.trace !== undefined && typeof request.trace !== 'boolean') {
    return 'trace must be a boolean when provided.';
  }

  return null;
}

async function getAuthenticatedUserId(
  headers: Headers,
  secretKey: string,
  authenticate: typeof authenticateRequest,
): Promise<string | null> {
  try {
    return await authenticate(headers, secretKey);
  } catch (err) {
    if (!(err instanceof Error && err.message.startsWith('Unauthorized'))) console.warn('[auth:execute] authentication failed.');
    return null;
  }
}

export async function handleExecuteCode(
  body: unknown,
  headers: Headers = {},
  env: NodeJS.ProcessEnv = process.env,
  dependencies: {
    authenticate?: typeof authenticateRequest;
    execute?: typeof executePythonJob;
    reserve?: typeof reserveCodeExecution;
    release?: typeof releaseCodeExecution;
    checkSchema?: typeof checkDatabaseSchema;
  } = {},
): Promise<ApiResponse> {
  const secretKey = env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return { status: 503, data: { ok: false, error: 'Code execution API is unavailable.' } };
  }

  const userId = await getAuthenticatedUserId(headers, secretKey, dependencies.authenticate || authenticateRequest);
  if (!userId) {
    return { status: 401, data: { ok: false, error: 'Unauthorized: Invalid or expired authentication token' } };
  }

  const validationError = validateRequest(body);
  if (validationError) {
    return { status: 400, data: { ok: false, error: validationError } };
  }

  const request = body as ExecuteCodeRequest;
  const problem = getCodeProblemById(request.problemId)!;
  if (env.DATABASE_URL) {
    let schemaHealth: Awaited<ReturnType<typeof checkDatabaseSchema>>;
    try {
      schemaHealth = await (dependencies.checkSchema || checkDatabaseSchema)(
        env.DATABASE_URL,
      );
    } catch (error) {
      console.error('[database:schema] execution health check failed.');
      return { status: 503, data: { ok: false, error: 'Database is unavailable.' } };
    }
    if (!schemaHealth.compatible) {
      return { status: 503, data: { ok: false, error: 'Database schema is incompatible. Apply pending migrations.' } };
    }
  }

  let admission;
  try {
    admission = await (dependencies.reserve || reserveCodeExecution)(userId, env);
  } catch (error) {
    console.error('[code:execute] execution admission is unavailable.', getSafeAdmissionDiagnostic(error));
    return { status: 503, data: { ok: false, error: 'Code execution API is unavailable.' } };
  }
  if (!admission.admitted) {
    return {
      status: 429,
      headers: { 'Retry-After': String(admission.retryAfterSeconds) },
      data: { ok: false, error: 'Execution limit reached. Please retry shortly.' },
    };
  }

  try {
    const execution = await (dependencies.execute || executePythonJob)({
      sourceCode: request.sourceCode,
      problem,
      trace: request.trace === true,
      env,
    });
    return { status: execution.status, data: learnerSafeExecution(execution.result) };
  } catch {
    return {
      status: 503,
      data: { ...sandboxUnavailable(), summary: { passed: 0, total: problem.testCases.length } },
    };
  } finally {
    try {
      await (dependencies.release || releaseCodeExecution)(userId, admission.leaseId, env);
    } catch (error) {
      console.error('[code:execute] execution admission lease cleanup failed.', getSafeAdmissionDiagnostic(error));
    }
  }
}

// Vercel must allow the bounded runner round trip plus container setup/cleanup.
export const config = { maxDuration: 30, bodyParser: { sizeLimit: '400kb' } };

type ApiRequest = { method?: string; body?: unknown; headers: Headers };
type ApiResponseWriter = {
  setHeader(name: string, value: string): void;
  status(code: number): { json(payload: unknown): unknown };
};

export default async function handler(req: ApiRequest, res: ApiResponseWriter) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Request body must be valid JSON.' });
    }
  }

  const result = await handleExecuteCode(body, req.headers, process.env);
  for (const [name, value] of Object.entries(result.headers || {})) res.setHeader(name, value);
  return res.status(result.status).json(result.data);
}
