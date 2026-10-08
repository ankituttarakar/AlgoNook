import { expect, test } from '@playwright/test';

// Cross-browser progress persistence (server-authoritative contract):
//   1. The authenticated UI must not render progress until the Neon snapshot loads.
//   2. Hydration failure must show an explicit error gate, never local/empty state.
//   3. A fresh browser profile with an EMPTY local cache must show the exact
//      same progress as the previous session — proving Neon, not localStorage,
//      is the source of truth.
test.use({ storageState: 'auth.json' });
test.setTimeout(240_000);

const APP = 'http://localhost:3000';
const CACHE_KEY = 'algonook.save.v1';
const ROADMAP = () => /DSA Roadmap|Learning Roadmap/i;
const isProgressPost = (response) =>
  new URL(response.url()).pathname === '/api/progress' &&
  response.request().method() === 'POST' &&
  response.status() === 200;

async function bootToRoadmap(page) {
  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const jackIn = page.getByRole('button', { name: /Jack In/i });
  await expect(async () => {
    if (await jackIn.isVisible().catch(() => false)) await jackIn.click();
    await expect(page.getByText(ROADMAP()).first()).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 90_000 });
}

async function getServerSnapshot(page) {
  return page.evaluate(async () => {
    const token = await window.Clerk.session.getToken();
    const res = await fetch('/api/progress', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`snapshot GET failed: ${res.status}`);
    return res.json();
  });
}

test('hydration gate blocks progress UI until the server snapshot arrives', async ({ page }) => {
  // Slow server: the loading gate must hold, and no progress UI may render.
  let release;
  const stalled = new Promise((resolve) => { release = resolve; });
  const delayPattern = '**/api/progress';
  await page.route(delayPattern, async (route) => {
    if (route.request().method() === 'GET') await stalled;
    await route.continue();
  });
  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await expect(page.getByText('Loading your progress from the server…')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(ROADMAP())).toHaveCount(0);
  await expect(page.getByText(/LV \d+ · \d+\/\d+ XP/)).toHaveCount(0);
  release();
  await expect(page.getByText(ROADMAP()).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Loading your progress from the server…')).toHaveCount(0);
  await page.unroute(delayPattern);

  // Failed server load: explicit error gate + retry, still no progress UI.
  const failPattern = '**/api/progress';
  await page.route(failPattern, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Unauthorized: Invalid or expired authentication token' }),
      });
    }
    return route.continue();
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  await expect(page.getByText('Progress sync unavailable')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Retry loading progress' })).toBeVisible();
  await expect(page.getByText(ROADMAP())).toHaveCount(0);
  await page.unroute(failPattern);

  // Recovery: without the failure, hydration succeeds and the roadmap renders.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  await expect(page.getByText(ROADMAP()).first()).toBeVisible({ timeout: 60_000 });
});

test('writes reach Neon and reproduce identically in a fresh browser profile', async ({ browser }) => {
  // ── Session 1: hydrated, empty cache does not matter — server fills state. ──
  const ctx1 = await browser.newContext({ storageState: 'auth.json' });
  const page1 = await ctx1.newPage();
  await bootToRoadmap(page1);

  const hud = (page) => page.getByText(/LV \d+ · \d+\/\d+ XP/).first();
  const hud1 = await hud(page1).innerText();
  const snapshot1 = await getServerSnapshot(page1);

  // Guaranteed write: flip sound, wait for the server to acknowledge it.
  const post1 = page1.waitForResponse(isProgressPost, { timeout: 30_000 });
  await page1.getByRole('button', { name: 'Toggle sound' }).click();
  await post1;
  const snapshot2 = await getServerSnapshot(page1);
  expect(snapshot2.progress.sound).toBe(!snapshot1.progress.sound);

  // Topic write: open a topic with no server record yet (topics are only
  // persisted server-side — completeStage/startTopic → /api/progress POST).
  const NODE_NAMES = {
    arrays: /Arrays/i,
    hashing: /Hashing/i,
    'two-pointers': /Two Pointers/i,
    'binary-search': /Binary Search/i,
  };
  const candidate = Object.keys(NODE_NAMES).find((id) => !snapshot2.topics[id]);
  let persistedTopic = null;
  if (candidate) {
    const post2 = page1.waitForResponse(isProgressPost, { timeout: 30_000 });
    await page1.getByRole('button', { name: NODE_NAMES[candidate] }).first().click();
    await expect(page1.getByRole('button', { name: /Start Learning/i })).toBeVisible({ timeout: 15_000 });
    await post2;
    const snapshot3 = await getServerSnapshot(page1);
    expect(snapshot3.topics[candidate]).toBeTruthy();
    expect(snapshot3.topics[candidate].startedAt).toBeTruthy();
    persistedTopic = snapshot3.topics[candidate];
  }

  const hudFinal1 = await hud(page1).innerText();
  const final1 = await getServerSnapshot(page1);
  await ctx1.close();

  // ── Session 2: same auth, local cache force-EMPTY before any app code runs. ──
  // auth.json may itself carry a stale progress cache (older snapshot) — exactly
  // the trap this architecture avoids. The init script records what a naive
  // app WOULD have read, wipes it, and proves the app boots with no cache at all.
  const ctx2 = await browser.newContext({ storageState: 'auth.json' });
  await ctx2.addInitScript((key) => {
    try {
      window.__staleCacheAtBoot = localStorage.getItem(key);
      localStorage.removeItem(key);
      localStorage.removeItem('bytebound.save.v1');
      window.__cacheWhenAppBoots = localStorage.getItem(key);
    } catch { /* noop */ }
  }, CACHE_KEY);
  const page2 = await ctx2.newPage();
  await bootToRoadmap(page2);

  // The cache was absent when the app booted, yet full progress renders:
  // it can only have come from Neon.
  expect(await page2.evaluate(() => window.__cacheWhenAppBoots)).toBeNull();
  expect(await hud(page2).innerText()).toBe(hudFinal1);

  const final2 = await getServerSnapshot(page2);
  expect(final2.progress).toEqual(final1.progress);
  expect(final2.missions).toEqual(final1.missions);
  expect(final2.skills).toEqual(final1.skills);
  expect(final2.topics).toEqual(final1.topics);
  if (persistedTopic) expect(final2.topics[candidate]).toEqual(persistedTopic);

  // After hydration the write-only cache is re-populated as a mirror.
  expect(await page2.evaluate((key) => localStorage.getItem(key), CACHE_KEY)).toBeTruthy();
  await ctx2.close();
});
