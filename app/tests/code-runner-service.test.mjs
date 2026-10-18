import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createRunnerServer } from '../server/code/runner-service.mjs';
import { createRunnerSignature } from '../server/code/runnerProtocol.mjs';
import { executePythonJob } from '../server/code/runnerClient.mjs';
import { handleExecuteCode } from '../api/code/execute.ts';
import {
  EXECUTION_CONCURRENCY_LIMIT,
  EXECUTION_REQUEST_LIMIT,
  getSafeAdmissionDiagnostic,
  releaseCodeExecution,
  reserveCodeExecution,
} from '../server/code/executionAdmission.mjs';
import { getCodeProblemById } from '../server/code/problems/index.mjs';

const SECRET = 'test-only-runner-secret-32-bytes-minimum';

async function startRunner(execute, options = {}) {
  const server = createRunnerServer({ secret: SECRET, execute, ...options });
  return {
    server,
    url: 'http://127.0.0.1',
    close: async () => {},
    fetch: (url, init) => invokeRunner(server, init),
  };
}

function invokeRunner(server, init) {
  const request = Readable.from([init.body]);
  request.method = init.method;
  request.url = new URL(init.url || 'http://127.0.0.1/internal/execute').pathname;
  request.headers = Object.fromEntries(new Headers(init.headers).entries());

  let complete;
  const responsePromise = new Promise((resolve) => { complete = resolve; });
  const response = {
    destroyed: false,
    writableEnded: false,
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body = '') { this.writableEnded = true; complete(new Response(body, { status: this.status, headers: this.headers })); },
  };
  server.emit('request', request, response);
  return responsePromise;
}

function trustedResult(problem) {
  return {
    ok: true,
    status: 'PASSED',
    summary: { passed: problem.testCases.length, total: problem.testCases.length },
    tests: problem.testCases.map(({ id }) => ({ id, status: 'PASSED' })),
    stdout: '',
    stderr: '',
    executionTimeMs: 3,
    trace: [{ step: 1, action: 'complete', state: {} }],
  };
}

test('authenticated API request uses signed runner and runner-owned trusted tests', async (t) => {
  const problem = getCodeProblemById('contains-duplicate');
  let executionRequest;
  const runner = await startRunner(async (request) => {
    executionRequest = request;
    return trustedResult(problem);
  });
  t.after(runner.close);

  const result = await handleExecuteCode({
    language: 'python',
    sourceCode: 'def containsDuplicate(nums):\n    return len(nums) != len(set(nums))',
    problemId: problem.id,
    trace: true,
  }, {}, {
    CLERK_SECRET_KEY: 'unit-test-clerk-secret',
    CODE_RUNNER_URL: runner.url,
    CODE_RUNNER_SECRET: SECRET,
    NODE_ENV: 'test',
  }, {
    authenticate: async () => 'user_test_123',
    execute: (payload) => executePythonJob({ ...payload, fetchImpl: runner.fetch }),
  });

  assert.equal(result.status, 200);
  assert.equal(result.data.status, 'PASSED');
  assert.equal(result.data.summary.total, problem.testCases.length);
  assert.equal(executionRequest.problemId, problem.id);
  assert.equal(executionRequest.trace, true);
  assert.deepEqual(executionRequest.testCases, problem.testCases);
});

test('new topic challenges are accepted only through registered authenticated trusted-test contracts', async () => {
  const ids = ['queue-rotate', 'bst-search', 'anagram-check', 'merge-sort-values', 'longest-increasing-subsequence'];
  for (const id of ids) {
    const problem = getCodeProblemById(id);
    assert.ok(problem, `${id} is registered`);
    let runnerProblem;
    const result = await handleExecuteCode({ language: 'python', sourceCode: 'def solution():\n    pass', problemId: id }, {}, {
      CLERK_SECRET_KEY: 'unit-test-clerk-secret', NODE_ENV: 'test',
    }, {
      authenticate: async () => 'user_test_123',
      reserve: async () => ({ admitted: true, leaseId: 'lease-test' }),
      release: async () => {},
      execute: async ({ problem: selected }) => { runnerProblem = selected; return { status: 200, result: trustedResult(selected) }; },
    });
    assert.equal(result.status, 200, `${id} reaches the trusted runner`);
    assert.equal(runnerProblem.id, id);
    assert.equal(result.data.summary.total, problem.testCases.length);
    assert.ok(problem.testCases.length >= 3);
  }
});

test('incorrect submissions receive status feedback without trusted expected or actual values', async () => {
  const problem = getCodeProblemById('queue-rotate');
  const result = await handleExecuteCode({ language: 'python', sourceCode: 'def rotateQueue(queue, k):\n    return queue', problemId: problem.id }, {}, {
    CLERK_SECRET_KEY: 'unit-test-clerk-secret', NODE_ENV: 'test',
  }, {
    authenticate: async () => 'user_test_123',
    reserve: async () => ({ admitted: true, leaseId: 'lease-test' }),
    release: async () => {},
    execute: async () => ({ status: 200, result: {
      ...trustedResult(problem), status: 'WRONG_ANSWER', summary: { passed: 0, total: 1 },
      tests: [{ id: 'private-case', status: 'WRONG_ANSWER', expected: [2, 1], actual: [1, 2], stdout: '[1, 2]', stderr: '' }],
    } }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.tests[0].status, 'WRONG_ANSWER');
  assert.equal(Object.hasOwn(result.data.tests[0], 'expected'), false);
  assert.equal(Object.hasOwn(result.data.tests[0], 'actual'), false);
  assert.equal(Object.hasOwn(result.data.tests[0], 'stdout'), false);
});

test('API rejects unauthenticated, unknown-problem, and learner-supplied test requests', async () => {
  const baseEnv = { CLERK_SECRET_KEY: 'unit-test-clerk-secret' };
  const baseRequest = { language: 'python', sourceCode: 'def containsDuplicate(nums):\n    return False', problemId: 'contains-duplicate' };
  const unauthenticated = await handleExecuteCode(baseRequest, {}, baseEnv, { authenticate: async () => { throw new Error('Unauthorized'); } });
  assert.equal(unauthenticated.status, 401);

  const dependencies = {
    authenticate: async () => 'user_test_123',
    execute: async () => { throw new Error('Must not execute invalid requests'); },
  };
  const unknownProblem = await handleExecuteCode({ ...baseRequest, problemId: 'arbitrary-command' }, {}, baseEnv, dependencies);
  assert.equal(unknownProblem.status, 400);

  const customTests = await handleExecuteCode({ ...baseRequest, testCases: [{ input: 'fake', expected: 'pass' }] }, {}, baseEnv, dependencies);
  assert.equal(customTests.status, 400);
});

test('API rejects unimplemented languages as validation errors before admission or execution', async () => {
  let admissionCalls = 0;
  let executionCalls = 0;
  const result = await handleExecuteCode({
    language: 'cpp',
    sourceCode: 'int main() {}',
    problemId: 'contains-duplicate',
  }, {}, { CLERK_SECRET_KEY: 'unit-test-clerk-secret' }, {
    authenticate: async () => 'user_test_123',
    reserve: async () => { admissionCalls += 1; throw new Error('Must not reserve unsupported work'); },
    execute: async () => { executionCalls += 1; throw new Error('Must not execute unsupported work'); },
  });

  assert.equal(result.status, 400);
  assert.equal(result.data.ok, false);
  assert.match(result.data.error, /Only Python/);
  assert.equal(admissionCalls, 0);
  assert.equal(executionCalls, 0);
});

test('execution API enforces authenticated admission before invoking the runner', async () => {
  let now = 0;
  let requestCount = 0;
  let windowStartedAt = 0;
  let active = 0;
  let runnerCalls = 0;
  let releases = 0;
  const admission = async () => {
    if (now - windowStartedAt >= 60_000) {
      windowStartedAt = now;
      requestCount = 0;
    }
    if (requestCount >= 2) return { admitted: false, retryAfterSeconds: 60 };
    requestCount += 1;
    active += 1;
    return { admitted: true, leaseId: `lease-${requestCount}` };
  };
  const dependencies = {
    authenticate: async () => 'verified-clerk-user',
    reserve: admission,
    release: async () => { active -= 1; releases += 1; },
    execute: async () => {
      runnerCalls += 1;
      return { status: 200, result: {
        status: 'PASSED', summary: { passed: 1, total: 1 }, tests: [{ id: 'registered-case', status: 'PASSED' }],
        stdout: '', stderr: '', executionTimeMs: 1,
      } };
    },
  };
  const request = {
    language: 'python',
    sourceCode: 'def containsDuplicate(nums):\n    return False',
    problemId: 'contains-duplicate',
  };

  const unauthenticated = await handleExecuteCode(request, {}, { CLERK_SECRET_KEY: 'test' }, {
    ...dependencies,
    authenticate: async () => { throw new Error('Unauthorized'); },
    reserve: async () => { throw new Error('Admission must not run before authentication'); },
  });
  assert.equal(unauthenticated.status, 401);
  assert.equal(runnerCalls, 0);

  const admitted = await handleExecuteCode(request, {}, { CLERK_SECRET_KEY: 'test' }, dependencies);
  assert.equal(admitted.status, 200);
  assert.equal(runnerCalls, 1);
  assert.equal(active, 0);

  await handleExecuteCode(request, {}, { CLERK_SECRET_KEY: 'test' }, dependencies);
  const limited = await handleExecuteCode(request, {}, { CLERK_SECRET_KEY: 'test' }, dependencies);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers['Retry-After'], '60');
  assert.equal(limited.data.ok, false);
  assert.equal(runnerCalls, 2);
  assert.equal(releases, 2);

  now = 60_000;
  const resumed = await handleExecuteCode(request, {}, { CLERK_SECRET_KEY: 'test' }, dependencies);
  assert.equal(resumed.status, 200);
  assert.equal(runnerCalls, 3);
});

test('admission failures log only allowlisted diagnostics and return a generic response', async () => {
  const request = {
    language: 'python',
    sourceCode: 'private learner source token=auth-secret',
    problemId: 'contains-duplicate',
  };
  const failure = Object.assign(new Error('postgres://user:password@host/db?token=secret'), {
    name: 'NeonDbError',
    sourceError: Object.assign(new TypeError('fetch failed with credential=secret'), {
      cause: Object.assign(new Error('private network details'), { code: 'ENOTFOUND' }),
    }),
    stage: 'reservation_query',
  });
  let runnerCalls = 0;
  const logged = [];
  const originalError = console.error;
  console.error = (...args) => logged.push(args);
  try {
    const result = await handleExecuteCode(request, {}, { CLERK_SECRET_KEY: 'test-secret' }, {
      authenticate: async () => 'verified-user',
      reserve: async () => { throw failure; },
      execute: async () => { runnerCalls += 1; throw new Error('must not run'); },
    });
    assert.deepEqual(result, { status: 503, data: { ok: false, error: 'Code execution API is unavailable.' } });
  } finally {
    console.error = originalError;
  }

  assert.equal(runnerCalls, 0);
  assert.equal(logged.length, 1);
  assert.deepEqual(logged[0][1], {
    stage: 'reservation_query', category: 'network', errorType: 'NeonDbError', code: 'ENOTFOUND',
  });
  const diagnosticText = JSON.stringify(logged);
  for (const secret of ['password', 'auth-secret', 'token=secret', 'private learner source', 'test-secret']) {
    assert.equal(diagnosticText.includes(secret), false);
  }

  const arbitraryCode = Object.assign(new Error('sensitive exception message'), { code: 'credential=leaked' });
  assert.deepEqual(getSafeAdmissionDiagnostic(arbitraryCode), {
    stage: 'configuration', category: 'unknown', errorType: 'Error',
  });
  assert.deepEqual(getSafeAdmissionDiagnostic(Object.assign(new Error('private SQL details'), {
    name: 'NeonDbError', code: '23505', stage: 'reservation_query',
  })), {
    stage: 'reservation_query', category: 'database', errorType: 'NeonDbError', sqlState: '23505',
  });
});

test('local admission bounds active leases and request counts per verified user', async () => {
  const userId = `local-admission-${randomUUID()}`;
  const env = { NODE_ENV: 'test' };
  const first = await reserveCodeExecution(userId, env);
  const second = await reserveCodeExecution(userId, env);
  assert.equal(first.admitted, true);
  assert.equal(second.admitted, true);
  assert.equal(EXECUTION_CONCURRENCY_LIMIT, 2);

  const atCapacity = await reserveCodeExecution(userId, env);
  assert.equal(atCapacity.admitted, false);
  assert.ok(atCapacity.retryAfterSeconds >= 1);

  await releaseCodeExecution(userId, first.leaseId, env);
  for (let index = 2; index < EXECUTION_REQUEST_LIMIT; index += 1) {
    const next = await reserveCodeExecution(userId, env);
    assert.equal(next.admitted, true);
    await releaseCodeExecution(userId, next.leaseId, env);
  }
  const overQuota = await reserveCodeExecution(userId, env);
  assert.equal(overQuota.admitted, false);
  assert.ok(overQuota.retryAfterSeconds >= 1);
});

test('local admission coalesces concurrent learning-event execution identities', async () => {
  const userId = `learning-event-admission-${randomUUID()}`;
  const env = { NODE_ENV: 'test' };
  const requestIdentity = {
    eventId: randomUUID(),
    eventKey: 'mission_completed:mission:code-max-profit',
  };
  const first = await reserveCodeExecution(userId, env, requestIdentity);
  const duplicate = await reserveCodeExecution(userId, env, requestIdentity);
  assert.equal(first.admitted, true);
  assert.equal(duplicate.admitted, false);
  assert.equal(duplicate.duplicate, true);

  await releaseCodeExecution(userId, first.leaseId, env);
  const afterRelease = await reserveCodeExecution(userId, env, requestIdentity);
  assert.equal(afterRelease.admitted, true);
  await releaseCodeExecution(userId, afterRelease.leaseId, env);
});

test('production admission fails closed without shared storage', async () => {
  await assert.rejects(
    reserveCodeExecution(`production-admission-${randomUUID()}`, { NODE_ENV: 'production' }),
    /Shared execution admission storage is unavailable/,
  );
});

test('runner rejects unsigned, replayed, and command-shaped requests before execution', async (t) => {
  let executions = 0;
  const runner = await startRunner(async () => { executions += 1; return {}; });
  t.after(runner.close);
  const endpoint = `${runner.url}/internal/execute`;
  const body = JSON.stringify({ problemId: 'contains-duplicate', sourceCode: 'def containsDuplicate(nums):\n    return False', trace: false });
  const unsigned = await invokeRunner(runner.server, { url: endpoint, method: 'POST', headers: { 'content-type': 'application/json' }, body });
  assert.equal(unsigned.status, 401);

  const timestamp = String(Date.now());
  const nonce = 'unique_test_nonce_1234567890';
  const headers = {
    'content-type': 'application/json',
    'x-algonook-timestamp': timestamp,
    'x-algonook-nonce': nonce,
    'x-algonook-signature': createRunnerSignature(SECRET, timestamp, nonce, body),
  };
  const first = await invokeRunner(runner.server, { url: endpoint, method: 'POST', headers, body });
  assert.equal(first.status, 503); // fake result is deliberately invalid
  const replay = await invokeRunner(runner.server, { url: endpoint, method: 'POST', headers, body });
  assert.equal(replay.status, 409);

  const commandBody = JSON.stringify({ command: 'id', args: [], problemId: 'contains-duplicate', sourceCode: 'x', trace: false });
  const commandNonce = 'unique_test_nonce_abcdefghij';
  const commandHeaders = {
    'content-type': 'application/json',
    'x-algonook-timestamp': timestamp,
    'x-algonook-nonce': commandNonce,
    'x-algonook-signature': createRunnerSignature(SECRET, timestamp, commandNonce, commandBody),
  };
  const command = await invokeRunner(runner.server, { url: endpoint, method: 'POST', headers: commandHeaders, body: commandBody });
  assert.equal(command.status, 400);
  assert.equal(executions, 1);
});

test('runner bounds concurrency and turns executor failures into a clean 503', async (t) => {
  let started;
  const hasStarted = new Promise((resolve) => { started = resolve; });
  let release;
  const waitForRelease = new Promise((resolve) => { release = resolve; });
  const runner = await startRunner(async () => {
    started();
    await waitForRelease;
    throw new Error('private runner internals');
  }, { maxConcurrent: 1 });
  t.after(async () => { release(); await runner.close(); });

  const payload = { problemId: 'contains-duplicate', sourceCode: 'def containsDuplicate(nums):\n    return False', trace: false };
  const signedRequest = buildSignedRequest(runner.url, payload);
  const first = invokeRunner(runner.server, signedRequest);
  await hasStarted;
  const atCapacity = await invokeRunner(runner.server, buildSignedRequest(runner.url, payload));
  assert.equal(atCapacity.status, 429);
  release();
  const failed = await first;
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { ok: false, error: 'Execution service unavailable.' });
});

function buildSignedRequest(baseUrl, payload) {
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const nonce = `nonce_${randomUUID()}`;
  return {
    url: `${baseUrl}/internal/execute`,
    method: 'POST',
    headers: new Headers({
      'content-type': 'application/json',
      'x-algonook-timestamp': timestamp,
      'x-algonook-nonce': nonce,
      'x-algonook-signature': createRunnerSignature(SECRET, timestamp, nonce, body),
    }),
    body,
  };
}

test('Vercel configuration fails closed when the external runner is missing', async () => {
  const execution = await executePythonJob({
    sourceCode: 'print(1)',
    problem: getCodeProblemById('contains-duplicate'),
    env: { NODE_ENV: 'development', VERCEL: '1' },
  });
  assert.equal(execution.status, 503);
  assert.equal(execution.result.status, 'SANDBOX_ERROR');
});
