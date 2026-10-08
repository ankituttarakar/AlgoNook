import { expect, test } from '@playwright/test';

// Error handling / recovery contract (hardening Section 2):
//   1. Normal startup renders the roadmap with no crash UI.
//   2. A crashing component renders a branded recovery screen — never a blank
//      page — and never leaks connection strings, keys, or tokens.
//   3. Retry re-renders the SAME screen in place.
//   4. Return to Roadmap leaves the crashed screen.
//   5. Progress API failure shows the HydrationGate error screen and recovers.
//   6. Auth (401) failure shows the HydrationGate error screen, not a blank page.
//   7. A signed-out visitor gets the landing screen, not a blank page.

test.use({ storageState: 'auth.json', video: 'off', trace: 'on-first-retry' });
test.setTimeout(240_000);

const APP = 'http://localhost:3000';
const PROGRESS_API = '**/api/progress*';

const ROADMAP_HEADING = () => /DSA Roadmap/i;
const SECRET_LEAK =
  /sk_(?:test|live)_|postgres(?:ql)?:\/\/|mongodb:\/\/|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|\bAKIA[0-9A-Z]{16}/;

async function bootToRoadmap(page) {
  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const jackIn = page.getByRole('button', { name: /Jack In/i });
  await expect(async () => {
    if (await jackIn.isVisible({ timeout: 2_000 }).catch(() => false)) await jackIn.click();
    await expect(page.getByRole('heading', { name: ROADMAP_HEADING() }).first()).toBeVisible({
      timeout: 3_000,
    });
  }).toPass({ timeout: 90_000 });
}

async function openFirstTopic(page) {
  const node = page.locator('button[title^="Open "]').first();
  await expect(node).toBeVisible({ timeout: 30_000 });
  const title = (await node.getAttribute('title')).replace(/^Open /, '');
  await node.click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({
    timeout: 30_000,
  });
  return title;
}

function injectCrash(page) {
  return page.evaluate(() => window.dispatchEvent(new Event('algonook:qa-crash')));
}

const fallback = (page) => page.getByTestId('error-boundary-fallback');

test('normal startup renders the roadmap with no crash UI', async ({ page }) => {
  await bootToRoadmap(page);
  await expect(fallback(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: ROADMAP_HEADING() }).first()).toBeVisible();
});

test('component crash shows a branded recovery screen and leaks nothing', async ({ page }) => {
  await page.goto(`${APP}/?qa_crash=screen`, { waitUntil: 'domcontentloaded' });

  const box = fallback(page);
  await expect(box).toBeVisible({ timeout: 30_000 });

  // Branding + what happened
  await expect(box.getByText('AlgoNook', { exact: true })).toBeVisible();
  await expect(box.getByText('Something went wrong')).toBeVisible();
  await expect(box.getByText(/A screen crashed while rendering/)).toBeVisible();
  await expect(box.getByText(/QA crash hook/)).toBeVisible();

  // Recovery actions
  await expect(box.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(box.getByRole('button', { name: 'Return to Roadmap' })).toBeVisible();

  // Safe technical error identifier
  await expect(box.getByTestId('error-id')).toHaveText(/^Error ID: ERR-[0-9A-Z]{6}$/);

  // No secrets / server internals on screen, and not a blank page
  const text = await box.innerText();
  expect(text).not.toMatch(SECRET_LEAK);
  expect(text).not.toMatch(/at\s+\w+Screen\b/);
  expect(text.length).toBeGreaterThan(50);
});

test('Retry re-renders the crashed screen in place', async ({ page }) => {
  await bootToRoadmap(page);
  const topic = await openFirstTopic(page);

  await injectCrash(page);
  await expect(fallback(page)).toBeVisible({ timeout: 15_000 });

  await fallback(page).getByRole('button', { name: 'Retry' }).click();

  // Same screen, not the roadmap
  await expect(fallback(page)).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1, name: topic })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('heading', { name: ROADMAP_HEADING() })).toHaveCount(0);
});

test('Return to Roadmap leaves the crashed screen', async ({ page }) => {
  await bootToRoadmap(page);
  await openFirstTopic(page);

  await injectCrash(page);
  await expect(fallback(page)).toBeVisible({ timeout: 15_000 });

  await fallback(page).getByRole('button', { name: 'Return to Roadmap' }).click();

  await expect(fallback(page)).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: ROADMAP_HEADING() }).first()).toBeVisible({
    timeout: 30_000,
  });
});

test('progress API failure shows the hydration error screen and recovers', async ({ page }) => {
  let failing = true;
  await page.route(PROGRESS_API, async (route) => {
    if (failing && route.request().method() === 'GET') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Internal server error' }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto(APP, { waitUntil: 'domcontentloaded' });

  // HydrationGate error screen — no progress UI, no blank page
  await expect(page.getByText('Progress sync unavailable')).toBeVisible({ timeout: 30_000 });
  const retryButton = page.getByRole('button', { name: /Retry loading progress/i });
  await expect(retryButton).toBeVisible();
  await expect(fallback(page)).toHaveCount(0);

  // Recovery once the API is healthy again
  failing = false;
  await page.unroute(PROGRESS_API);
  await retryButton.click();

  const jackIn = page.getByRole('button', { name: /Jack In/i });
  await expect(async () => {
    if (await jackIn.isVisible({ timeout: 2_000 }).catch(() => false)) await jackIn.click();
    await expect(page.getByRole('heading', { name: ROADMAP_HEADING() }).first()).toBeVisible({
      timeout: 3_000,
    });
  }).toPass({ timeout: 60_000 });
});

test('auth failure shows the hydration error screen, never a blank page', async ({ page }) => {
  await page.route(PROGRESS_API, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: 'Unauthorized: Invalid or expired authentication token',
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto(APP, { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Progress sync unavailable')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Unauthorized/)).toBeVisible();
  await expect(fallback(page)).toHaveCount(0);

  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(SECRET_LEAK);
  expect(text).not.toMatch(/JWT|not before|secret key/i);
  expect(text.trim().length).toBeGreaterThan(20);
});

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows the landing screen, not a blank page', async ({ page }) => {
    await page.goto(APP, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Sign in/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(fallback(page)).toHaveCount(0);
    await expect(page.getByText('DSA Learning Platform')).toBeVisible();
  });
});
