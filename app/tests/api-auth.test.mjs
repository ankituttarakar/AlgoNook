import assert from 'node:assert/strict';
import test from 'node:test';
import { handleSyncUser } from '../api/sync-user.ts';
import { handleGetProgress, handleSaveProgress } from '../api/progress.ts';
import { handleExecuteCode } from '../api/code/execute.ts';

const env = {
  CLERK_SECRET_KEY: 'sk_test_placeholder_for_invalid-token-tests',
  DATABASE_URL: 'postgresql://placeholder.invalid/test',
};
const invalidHeaders = { authorization: 'Bearer malformed-token' };

test('invalid Clerk credentials are rejected as generic 401 responses', async () => {
  const cases = [
    handleSyncUser({}, invalidHeaders, env),
    handleGetProgress(invalidHeaders, env),
    handleSaveProgress({ xp: 10, level: 1 }, invalidHeaders, env),
    handleExecuteCode({
      problemId: 'contains-duplicate',
      language: 'python',
      sourceCode: 'print("unused")',
    }, invalidHeaders, env),
  ];

  for (const result of await Promise.all(cases)) {
    assert.equal(result.status, 401);
    assert.equal(result.data.ok, false);
    assert.equal(result.data.error, 'Unauthorized: Invalid or expired authentication token');
    assert.doesNotMatch(result.data.error, /JWT|not before|secret|token verification failed/i);
  }
});

test('missing credentials are rejected without contacting Neon or the runner', async () => {
  const sync = await handleSyncUser({}, {}, env);
  const progress = await handleGetProgress({}, env);
  const execute = await handleExecuteCode({}, {}, env);

  assert.equal(sync.status, 401);
  assert.equal(progress.status, 401);
  assert.equal(execute.status, 401);
});
