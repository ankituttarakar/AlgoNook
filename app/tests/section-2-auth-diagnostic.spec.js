import { expect, test } from '@playwright/test';

test.use({ storageState: 'auth.json', video: 'on', trace: 'on', screenshot: 'on' });
test.setTimeout(240_000);

test('Section 2 authenticated API diagnostic', async ({ page, request }) => {
  const auth = { requests: [], tokenClaims: null };
  const clerkDateHeaders = [];
  let requestToken = null;
  let syncPayload = null;
  const browserTimes = {};
  page.on('request', (request) => {
    if (!/\/api\/(sync-user|progress)$/.test(request.url())) return;
    const headers = request.headers();
    const token = headers.authorization?.startsWith('Bearer ') ? headers.authorization.slice(7) : null;
    if (token && !requestToken) requestToken = token;
    if (/\/api\/sync-user$/.test(request.url())) {
      try { syncPayload = request.postDataJSON(); } catch {}
    }
    if (token && !auth.tokenClaims) {
      try {
        const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);
        auth.tokenClaims = Object.fromEntries(['iat', 'nbf', 'exp'].map((name) => [
          name,
          { unix: claims[name] ?? null, offsetSeconds: claims[name] == null ? null : claims[name] - now },
        ]));
      } catch {
        auth.tokenClaims = { decodeError: true };
      }
    }
    auth.requests.push({ url: request.url(), method: request.method() });
  });
  page.on('response', async (response) => {
    if (new URL(response.url()).hostname.endsWith('.clerk.accounts.dev') || new URL(response.url()).hostname.endsWith('.clerk.com')) {
      const date = response.headers().date;
      if (date) clerkDateHeaders.push({ host: new URL(response.url()).hostname, date, observedAt: new Date().toISOString() });
    }
    if (!/\/api\/(sync-user|progress)$/.test(response.url())) return;
    const entry = auth.requests.findLast((item) => item.url === response.url() && item.status === undefined);
    if (entry) {
      entry.status = response.status();
      entry.body = (await response.text().catch(() => '')).slice(0, 500);
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(8_000);
  browserTimes.nodeAtCapture = Date.now();
  browserTimes.browserAtCapture = await page.evaluate(() => Date.now());

  const tokenDetails = await page.evaluate(async () => {
    const session = window.Clerk?.session;
    if (!session?.getToken) return null;
    const token = await session.getToken();
    const user = window.Clerk?.user;
    return {
      token,
      user: {
        email: user?.primaryEmailAddress?.emailAddress || null,
        username: user?.username || null,
        firstName: user?.firstName || null,
      },
    };
  }).catch(() => null);
  const token = tokenDetails?.token || requestToken;
  let claimData = null;
  if (token) {
    try {
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);
      claimData = Object.fromEntries(['iat', 'nbf', 'exp'].map((name) => [
        name,
        { unix: claims[name] ?? null, offsetSeconds: claims[name] == null ? null : claims[name] - now },
      ]));
    } catch {
      claimData = { decodeError: true };
    }
  }

  const apiResults = [];
  let waitSeconds = 0;
  if (token && claimData?.iat?.unix) {
    const waitMs = Math.max(0, (claimData.iat.unix - Math.floor(Date.now() / 1000) + 6) * 1000);
    waitSeconds = Math.ceil(waitMs / 1000);
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    const headers = { Authorization: `Bearer ${token}` };
    const getProgress = await request.get('http://localhost:3000/api/progress', { headers });
    const progressBody = await getProgress.json().catch(() => ({}));
    apiResults.push({ endpoint: 'progress GET', status: getProgress.status(), body: progressBody });

    if (getProgress.ok() && progressBody.progress) {
      const saveProgress = await request.post('http://localhost:3000/api/progress', {
        headers: { ...headers, 'Content-Type': 'application/json' },
        data: { xp: progressBody.progress.xp, level: progressBody.progress.level },
      });
      apiResults.push({ endpoint: 'progress POST same values', status: saveProgress.status(), body: await saveProgress.json().catch(() => ({})) });
    }

    if (tokenDetails?.user || syncPayload) {
      const sync = await request.post('http://localhost:3000/api/sync-user', {
        headers: { ...headers, 'Content-Type': 'application/json' },
        data: tokenDetails?.user || syncPayload,
      });
      const syncBody = await sync.json().catch(() => ({}));
      apiResults.push({ endpoint: 'sync-user POST', status: sync.status(), ok: syncBody.ok });
    }

    const execute = await request.post('http://localhost:3000/api/code/execute', {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        problemId: 'contains-duplicate',
        language: 'python',
        sourceCode: 'def containsDuplicate(nums):\n    return len(nums) != len(set(nums))',
      },
    });
    const executeBody = await execute.json().catch(() => ({}));
    apiResults.push({ endpoint: 'code execution auth', status: execute.status(), body: executeBody });
  }

  expect(token, 'An authenticated Clerk session token should be available').toBeTruthy();
  expect(apiResults.find((result) => result.endpoint === 'progress GET')?.status).toBe(200);
  expect(apiResults.find((result) => result.endpoint === 'progress POST same values')?.status).toBe(200);
  expect(apiResults.find((result) => result.endpoint === 'sync-user POST')?.status).toBe(200);
  const execution = apiResults.find((result) => result.endpoint === 'code execution auth');
  expect([200, 503], 'Code execution must pass authentication; 503 is reserved for unavailable sandbox infrastructure').toContain(execution?.status);
  if (execution?.status === 503) expect(execution.body.status || execution.body.error?.code).toMatch(/SANDBOX/);
  console.log(`AUTH_DIAGNOSTIC=${JSON.stringify({ requests: auth.requests, tokenClaims: claimData, clerkDateHeaders, browserTimes, waitSeconds, apiResults, browserTitle: await page.title() })}`);
});
