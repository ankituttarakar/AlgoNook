import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createFreshAuthState } from '../scripts/qa-auth-bootstrap.js';

test('fresh QA auth waits for explicit confirmation before identity and progress validation', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'algonook-qa-bootstrap-test-'));
  const authPath = path.join(tempDir, 'auth.json');
  const expectedUserId = 'user_dedicated_qa';
  const url = new URL('https://algonook-git-preview-team.vercel.app');
  const priorExpectedUserId = process.env.QA_EXPECTED_CLERK_USER_ID;
  process.env.QA_EXPECTED_CLERK_USER_ID = expectedUserId;
  let phase = 'launched';
  let browserClosed = false;

  const browser = {
    async newContext() {
      return {
        async newPage() {
          return {
            async goto(target) {
              assert.equal(target, url.origin);
              phase = 'page-open';
            },
            async waitForFunction() {
              assert.equal(phase, 'confirmed');
            },
            async evaluate(callback) {
              if (callback.toString().includes('window.Clerk.session.getToken')) {
                return { status: 200, ok: true };
              }
              return { origin: url.origin, userId: expectedUserId, signedIn: true };
            },
          };
        },
        async storageState({ path: targetPath }) {
          const payload = Buffer.from(JSON.stringify({
            sub: expectedUserId,
            exp: Math.floor(Date.now() / 1000) + 300,
          })).toString('base64url');
          fs.writeFileSync(targetPath, JSON.stringify({
            cookies: [{
              name: '__session',
              value: `header.${payload}.signature`,
              domain: url.hostname,
              expires: Math.floor(Date.now() / 1000) + 300,
            }],
            origins: [{ origin: url.origin, localStorage: [] }],
          }));
        },
        async close() {},
      };
    },
    async close() {
      browserClosed = true;
    },
  };

  try {
    await createFreshAuthState({
      url,
      authPath,
      expectedUserId,
      launchBrowser: async () => browser,
      confirm: async () => {
        assert.equal(phase, 'page-open');
        assert.equal(browserClosed, false);
        phase = 'confirmed';
      },
    });
    assert.equal(phase, 'confirmed');
    assert.equal(browserClosed, true);
    assert.equal(fs.existsSync(authPath), true);
  } finally {
    if (priorExpectedUserId === undefined) delete process.env.QA_EXPECTED_CLERK_USER_ID;
    else process.env.QA_EXPECTED_CLERK_USER_ID = priorExpectedUserId;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
