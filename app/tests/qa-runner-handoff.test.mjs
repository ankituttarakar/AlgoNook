import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runQa } from '../scripts/run-qa.js';

test('deployed QA awaits auth, starts Playwright with inherited output, and propagates exit status', async () => {
  const envNames = [
    'QA_BASE_URL',
    'QA_TARGET_ENV',
    'QA_DATA_ENV',
    'QA_EXPECTED_CLERK_USER_ID',
    'QA_AUTH_STATE',
    'QA_SAFE_REPORTS',
  ];
  const priorEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    QA_BASE_URL: 'https://algonook-git-qa-branch-team.vercel.app',
    QA_TARGET_ENV: 'preview',
    QA_DATA_ENV: 'isolated',
    QA_EXPECTED_CLERK_USER_ID: 'user_dedicated_qa',
  });
  let authResolved = false;
  let spawnCalled = false;
  let temporaryAuthPath;
  try {
    const exitCode = await runQa({
      authenticate: async ({ authPath }) => {
        temporaryAuthPath = authPath;
        await new Promise((resolve) => setTimeout(resolve, 20));
        fs.writeFileSync(authPath, '{}');
        authResolved = true;
      },
      spawn: (executable, args, options) => {
        spawnCalled = true;
        assert.equal(authResolved, true, 'Playwright must not start before auth bootstrap resolves');
        assert.equal(fs.existsSync(temporaryAuthPath), true, 'temporary auth state must exist when Playwright starts');
        assert.equal(executable, process.execPath);
        assert.match(args[0], /node_modules[\\/]@playwright[\\/]test[\\/]cli\.js$/);
        assert.deepEqual(args.slice(1), ['test']);
        assert.equal(options.stdio, 'inherit');
        assert.equal(options.shell, false);
        return { status: 7, signal: null };
      },
    });
    assert.equal(spawnCalled, true);
    assert.equal(exitCode, 7);
    assert.equal(fs.existsSync(path.dirname(temporaryAuthPath)), false, 'temporary auth directory is cleaned after child completion');
  } finally {
    for (const name of envNames) {
      if (priorEnv[name] === undefined) delete process.env[name];
      else process.env[name] = priorEnv[name];
    }
  }
});
