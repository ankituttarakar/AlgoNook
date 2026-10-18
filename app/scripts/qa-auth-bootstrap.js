import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { chromium } from '@playwright/test';
import { validateAuthState } from './qa-safety.js';

const AUTH_TIMEOUT_MS = 60_000;

async function confirmSignIn() {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('Deployed QA authentication requires an interactive terminal so you can confirm sign-in.');
  }
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    await terminal.question('After signing in to the dedicated QA account and returning to AlgoNook, press Enter here to continue.\n');
  } finally {
    terminal.close();
  }
}

export async function createFreshAuthState({
  url,
  authPath,
  expectedUserId,
  launchBrowser = () => chromium.launch({ headless: false }),
  confirm = confirmSignIn,
}) {
  if (!expectedUserId) {
    throw new Error('Set QA_EXPECTED_CLERK_USER_ID to the dedicated QA Clerk user ID before signing in.');
  }

  const resolvedAuthPath = path.resolve(authPath);
  const temporaryRoot = path.resolve(os.tmpdir());
  if (!resolvedAuthPath.startsWith(`${temporaryRoot}${path.sep}`)) {
    throw new Error('Fresh deployed QA auth state must be stored in a temporary directory outside the repository.');
  }
  fs.mkdirSync(path.dirname(resolvedAuthPath), { recursive: true });

  const browser = await launchBrowser();
  try {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(url.origin, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      console.log(`Sign in to ${url.origin} in the visible browser using the dedicated QA Clerk account.`);
      console.log('Do not use a personal account. The browser remains open until you confirm sign-in in this terminal.');
      await confirm();

      await page.waitForFunction(
        (targetOrigin) => location.origin === targetOrigin
          && window.Clerk?.loaded
          && window.Clerk?.user?.id,
        url.origin,
        { timeout: AUTH_TIMEOUT_MS },
      ).catch(() => {
        throw new Error('Clerk did not report a signed-in user at the exact target origin after confirmation.');
      });

      const identity = await page.evaluate(() => ({
        origin: location.origin,
        userId: window.Clerk?.user?.id,
        signedIn: Boolean(window.Clerk?.isSignedIn),
      }));
      if (identity.origin !== url.origin) {
        throw new Error('Authentication did not return to the exact QA_BASE_URL origin.');
      }
      if (!identity.signedIn || identity.userId !== expectedUserId) {
        throw new Error('The signed-in Clerk account does not match QA_EXPECTED_CLERK_USER_ID. No auth state was saved.');
      }

      const progressCheck = await page.evaluate(async () => {
        const token = await window.Clerk.session.getToken();
        if (!token) return { status: 0, ok: false };
        const response = await fetch('/api/progress', {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json().catch(() => null);
        return { status: response.status, ok: body?.ok === true };
      });
      if (progressCheck.status !== 200 || !progressCheck.ok) {
        throw new Error(`Authenticated /api/progress check failed with HTTP ${progressCheck.status}. No auth state was saved.`);
      }

      await context.storageState({ path: resolvedAuthPath });
      validateAuthState(resolvedAuthPath, url);
      console.log('Fresh Clerk identity, target origin, and /api/progress checks passed.');
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
