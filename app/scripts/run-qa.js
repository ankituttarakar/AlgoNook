import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFreshAuthState } from './qa-auth-bootstrap.js';
import { assertSafeTarget } from './qa-safety.js';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function runQa({
  authenticate = createFreshAuthState,
  spawn = spawnSync,
} = {}) {
  let authTempDir;
  const { url, target } = assertSafeTarget({ deployedCommand: true });
  if (!['preview', 'staging'].includes(target)) {
    throw new Error('test:e2e:qa only accepts an identified Preview or staging target.');
  }
  if (!process.env.QA_EXPECTED_CLERK_USER_ID) {
    throw new Error('Set QA_EXPECTED_CLERK_USER_ID to the dedicated QA Clerk user ID before running deployed QA.');
  }
  console.log(`Starting deployed QA for ${url.origin} (${target}).`);
  authTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'algonook-qa-auth-'));
  const authPath = path.join(authTempDir, 'auth.json');
  process.env.QA_SAFE_REPORTS = 'true';
  process.env.QA_AUTH_STATE = authPath;

  try {
    await authenticate({ url, authPath, expectedUserId: process.env.QA_EXPECTED_CLERK_USER_ID });

    const playwrightCli = path.join(APP_DIR, 'node_modules', '@playwright', 'test', 'cli.js');
    console.log('Authentication bootstrap complete. Starting Playwright test suite.');
    const result = spawn(process.execPath, [playwrightCli, 'test'], {
      cwd: APP_DIR,
      env: process.env,
      stdio: 'inherit',
      shell: false,
    });
    if (result.error) {
      throw new Error(`Unable to start Playwright: ${result.error.message}`);
    }
    if (result.signal) {
      console.error(`Playwright stopped after signal ${result.signal}.`);
      return 1;
    }
    const exitCode = result.status ?? 1;
    console.log(`Playwright process finished with exit code ${exitCode}.`);
    return exitCode;
  } finally {
    fs.rmSync(authTempDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await runQa();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'QA safety validation failed.');
    process.exitCode = 1;
  }
}
