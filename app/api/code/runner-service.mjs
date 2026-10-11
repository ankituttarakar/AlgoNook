import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCodeProblemById } from './problems/index.mjs';
import { executePythonSandbox } from './pythonRunner.mjs';
import { verifyRunnerSignature, RUNNER_MAX_CLOCK_SKEW_MS } from './runnerProtocol.mjs';

const MAX_REQUEST_BYTES = 400 * 1024;
const MAX_REPLAY_ENTRIES = 50_000;
const RUNNER_STATUSES = new Set([
  'PASSED', 'WRONG_ANSWER', 'COMPILE_ERROR', 'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'OUTPUT_LIMIT_EXCEEDED',
  'SANDBOX_ERROR', 'SECURITY_REJECTED',
]);

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    let settled = false;
    req.on('data', (chunk) => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > MAX_REQUEST_BYTES) {
        settled = true;
        reject(Object.assign(new Error('Request too large'), { status: 413 }));
        req.resume();
        return;
      }
      body += chunk.toString('utf8');
    });
    req.on('end', () => { if (!settled) resolve(body); });
    req.on('error', (error) => { if (!settled) reject(error); });
  });
}

function validJob(payload) {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    && Object.keys(payload).length === 3
    && Object.keys(payload).every((key) => ['problemId', 'sourceCode', 'trace'].includes(key))
    && typeof payload.problemId === 'string'
    && typeof payload.sourceCode === 'string'
    && Buffer.byteLength(payload.sourceCode, 'utf8') > 0
    && Buffer.byteLength(payload.sourceCode, 'utf8') <= 64 * 1024
    && typeof payload.trace === 'boolean';
}

function validResult(result, expectedTotal) {
  return !!result && typeof result === 'object'
    && typeof result.ok === 'boolean'
    && RUNNER_STATUSES.has(result.status)
    && Number.isInteger(result.summary?.passed)
    && Number.isInteger(result.summary?.total)
    && result.summary.total === expectedTotal
    && result.summary.passed >= 0
    && result.summary.passed <= expectedTotal
    && Array.isArray(result.tests)
    && result.tests.length <= expectedTotal
    && typeof result.stdout === 'string'
    && typeof result.stderr === 'string'
    && (result.executionTimeMs === null || Number.isFinite(result.executionTimeMs));
}

export function createRunnerServer({
  secret = process.env.CODE_RUNNER_SECRET,
  execute = executePythonSandbox,
  maxConcurrent = Number(process.env.RUNNER_MAX_CONCURRENCY || 2),
  now = Date.now,
} = {}) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    throw new Error('CODE_RUNNER_SECRET must contain at least 32 bytes.');
  }
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 32) {
    throw new Error('RUNNER_MAX_CONCURRENCY must be an integer between 1 and 32.');
  }

  const seenNonces = new Map();
  let activeRuns = 0;

  return createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/internal/execute') {
      sendJson(res, 404, { ok: false, error: 'Not found.' });
      return;
    }

    let rawBody;
    try {
      rawBody = await readBody(req);
    } catch (error) {
      if (!res.destroyed && !res.writableEnded) {
        sendJson(res, error.status || 400, { ok: false, error: error.status === 413 ? 'Request body is too large.' : 'Invalid request.' });
      }
      return;
    }

    const timestamp = req.headers['x-algonook-timestamp'];
    const nonce = req.headers['x-algonook-nonce'];
    const signature = req.headers['x-algonook-signature'];
    if (typeof timestamp !== 'string' || typeof nonce !== 'string' || typeof signature !== 'string'
      || !verifyRunnerSignature({ secret, timestamp, nonce, signature, body: rawBody, now: now() })) {
      sendJson(res, 401, { ok: false, error: 'Unauthorized.' });
      return;
    }

    const currentTime = now();
    for (const [key, expiresAt] of seenNonces) {
      if (expiresAt < currentTime) seenNonces.delete(key);
    }
    if (seenNonces.has(nonce)) {
      sendJson(res, 409, { ok: false, error: 'Request already used.' });
      return;
    }
    if (seenNonces.size >= MAX_REPLAY_ENTRIES) {
      sendJson(res, 503, { ok: false, error: 'Runner admission is unavailable.' });
      return;
    }
    seenNonces.set(nonce, currentTime + RUNNER_MAX_CLOCK_SKEW_MS);

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
      return;
    }
    if (!validJob(payload)) {
      sendJson(res, 400, { ok: false, error: 'Invalid execution request.' });
      return;
    }
    const problem = getCodeProblemById(payload.problemId);
    if (!problem) {
      sendJson(res, 400, { ok: false, error: 'Unsupported problem.' });
      return;
    }
    if (activeRuns >= maxConcurrent) {
      sendJson(res, 429, { ok: false, error: 'Runner is at capacity. Retry shortly.' });
      return;
    }

    activeRuns += 1;
    try {
      const result = await execute({
        sourceCode: payload.sourceCode,
        problemId: problem.id,
        testCases: problem.testCases,
        trace: payload.trace,
      });
      const resultBody = JSON.stringify(result);
      if (!validResult(result, problem.testCases.length) || Buffer.byteLength(resultBody) > 512 * 1024) {
        sendJson(res, 503, { ok: false, error: 'Execution result exceeded the response limit.' });
      } else {
        sendJson(res, result.status === 'SANDBOX_ERROR' ? 503 : 200, result);
      }
    } catch {
      sendJson(res, 503, { ok: false, error: 'Execution service unavailable.' });
    } finally {
      activeRuns -= 1;
    }
  });
}

const invokedPath = process.argv[1]
  ? path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])
  : false;
if (invokedPath) {
  const port = Number(process.env.PORT || 8080);
  const host = process.env.RUNNER_BIND_ADDRESS || '127.0.0.1';
  const server = createRunnerServer();
  server.requestTimeout = 10_000;
  server.headersTimeout = 5_000;
  server.timeout = 30_000;
  server.keepAliveTimeout = 5_000;
  server.listen(port, host, () => console.log(`AlgoNook execution service listening on ${host}:${port}`));
}
