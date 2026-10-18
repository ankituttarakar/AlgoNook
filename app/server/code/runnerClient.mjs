import { randomUUID } from 'node:crypto';
import { createRunnerSignature } from './runnerProtocol.mjs';

const MAX_RESPONSE_BYTES = 512 * 1024;
const REMOTE_TIMEOUT_MS = 27_000;
const EXECUTION_STATUSES = new Set([
  'PASSED', 'WRONG_ANSWER', 'COMPILE_ERROR', 'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'OUTPUT_LIMIT_EXCEEDED',
  'SANDBOX_ERROR', 'SECURITY_REJECTED',
]);
const TEST_STATUSES = new Set([...EXECUTION_STATUSES, 'NOT_RUN']);

export function sandboxUnavailable() {
  return {
    ok: false,
    status: 'SANDBOX_ERROR',
    summary: { passed: 0, total: 0 },
    tests: [],
    stdout: '',
    stderr: '',
    executionTimeMs: null,
    error: { code: 'SANDBOX_UNAVAILABLE', message: 'The Python execution service is unavailable.' },
  };
}

function validExecutionResult(value, expectedTotal) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (typeof value.ok !== 'boolean' || !EXECUTION_STATUSES.has(value.status)) return false;
  if (!value.summary || !Number.isInteger(value.summary.passed) || !Number.isInteger(value.summary.total)) return false;
  if (value.summary.total !== expectedTotal || value.summary.passed < 0 || value.summary.passed > expectedTotal) return false;
  if (!Array.isArray(value.tests) || value.tests.length > expectedTotal) return false;
  if (value.tests.some((test) => !test || typeof test.id !== 'string' || test.id.length > 100 || !TEST_STATUSES.has(test.status))) return false;
  if (typeof value.stdout !== 'string' || typeof value.stderr !== 'string') return false;
  if (value.executionTimeMs !== null && (!Number.isFinite(value.executionTimeMs) || value.executionTimeMs < 0)) return false;
  if (value.trace !== undefined && (!Array.isArray(value.trace) || value.trace.length > 40)) return false;
  return true;
}

async function readBoundedResponse(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('Runner response exceeded the size limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

function runnerEndpoint(rawUrl, isProduction) {
  let base;
  try {
    base = new URL(rawUrl);
  } catch {
    return null;
  }
  if (base.username || base.password || base.search || base.hash) return null;
  const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && !isProduction && localHost)) return null;
  return new URL('/internal/execute', base).toString();
}

/** Send only the selected problem ID and learner source; the runner owns all test cases. */
export async function executePythonJob({ sourceCode, problem, trace = false, env = process.env, fetchImpl = fetch }) {
  const runnerUrl = env.CODE_RUNNER_URL;
  if (!runnerUrl && env.NODE_ENV !== 'production' && env.VERCEL !== '1') {
    // Local development may keep using Docker on the developer's machine.
    const { executePythonSandbox } = await import('./pythonRunner.mjs');
    return {
      status: 200,
      result: await executePythonSandbox({ sourceCode, problemId: problem.id, testCases: problem.testCases, trace }),
    };
  }

  const endpoint = runnerEndpoint(runnerUrl, env.NODE_ENV === 'production');
  const secret = env.CODE_RUNNER_SECRET;
  if (!endpoint || typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    return { status: 503, result: sandboxUnavailable() };
  }

  const body = JSON.stringify({ problemId: problem.id, sourceCode, trace });
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = createRunnerSignature(secret, timestamp, nonce, body);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-algonook-timestamp': timestamp,
        'x-algonook-nonce': nonce,
        'x-algonook-signature': signature,
      },
      body,
      signal: controller.signal,
    });
    if (response.status !== 200) return { status: 503, result: sandboxUnavailable() };
    const text = await readBoundedResponse(response);
    const result = JSON.parse(text);
    if (!validExecutionResult(result, problem.testCases.length)) return { status: 503, result: sandboxUnavailable() };
    return { status: 200, result };
  } catch {
    return { status: 503, result: sandboxUnavailable() };
  } finally {
    clearTimeout(timeout);
  }
}
