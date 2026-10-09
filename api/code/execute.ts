import { getLanguageById } from '../../src/data/languages.js';
import { authenticateRequest } from '../clerk-auth.mjs';
import { executePythonSandbox } from './pythonRunner.mjs';
import { getCodeProblemById } from './problems/index.mjs';

const MAX_SOURCE_BYTES = 64 * 1024;

type Headers = Record<string, string | string[] | undefined>;

type ExecuteCodeRequest = {
  language: string;
  sourceCode: string;
  problemId: string;
  trace?: boolean;
};

export type ExecutionStatus =
  | 'NOT_IMPLEMENTED'
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
};

function validateRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  const request = body as Partial<ExecuteCodeRequest>;
  if (Object.keys(body).some((key) => !['language', 'sourceCode', 'problemId', 'trace'].includes(key))) {
    return 'Request may contain only language, sourceCode, problemId, and trace.';
  }
  if (typeof request.language !== 'string' || !getLanguageById(request.language)) {
    return 'language must be one of the supported language IDs.';
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

async function getAuthenticatedUserId(headers: Headers, secretKey: string): Promise<string | null> {
  try {
    return await authenticateRequest(headers, secretKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.startsWith('Unauthorized')) console.warn(`[auth:execute] ${message}`);
    return null;
  }
}

export async function handleExecuteCode(
  body: unknown,
  headers: Headers = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<ApiResponse> {
  const secretKey = env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return { status: 503, data: { ok: false, error: 'Code execution API is unavailable.' } };
  }

  const userId = await getAuthenticatedUserId(headers, secretKey);
  if (!userId) {
    return { status: 401, data: { ok: false, error: 'Unauthorized: Invalid or expired authentication token' } };
  }

  const validationError = validateRequest(body);
  if (validationError) {
    return { status: 400, data: { ok: false, error: validationError } };
  }

  const request = body as ExecuteCodeRequest;
  const problem = getCodeProblemById(request.problemId)!;
  if (request.language === 'python') {
    try {
      const result = await executePythonSandbox({
        sourceCode: request.sourceCode,
        problemId: problem.id,
        testCases: problem.testCases,
        trace: request.trace === true,
      });
      return {
        status: result.status === 'SANDBOX_ERROR' ? 503 : 200,
        data: result,
      };
    } catch {
      return {
        status: 503,
        data: {
          ok: false,
          status: 'SANDBOX_ERROR',
          summary: { passed: 0, total: problem.testCases.length },
          tests: [],
          stdout: '',
          stderr: '',
          executionTimeMs: null,
          error: { code: 'SANDBOX_UNAVAILABLE', message: 'The Python sandbox is unavailable.' },
        },
      };
    }
  }

  return {
    status: 501,
    data: {
      ok: false,
      status: 'NOT_IMPLEMENTED',
      error: {
        code: 'EXECUTION_NOT_IMPLEMENTED',
        message: 'Code execution is not implemented yet.',
      },
      summary: { passed: 0, total: problem.testCases.length },
      tests: [],
      stdout: '',
      stderr: '',
      executionTimeMs: null,
    },
  };
}

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
  return res.status(result.status).json(result.data);
}
