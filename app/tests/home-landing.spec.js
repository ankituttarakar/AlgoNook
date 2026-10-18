import { test, expect } from '@playwright/test';

test.describe('signed-out AlgoNook Home', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows the cinematic landing, real roadmap destination, and existing feature sections', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Master DSA\. One mission at a time\./i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Start learning/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Get started/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore the AlgoNook roadmap' })).toHaveAttribute('href', '/roadmap');
    await expect(page.getByRole('heading', { name: 'Everything you need to prepare' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A structured path, not a dumping ground' })).toBeVisible();
    await expect(page.locator('.algorithm-field')).toHaveAttribute('aria-hidden', 'true');
  });

  test('keeps the roadmap route gated while signed out', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Explore the AlgoNook roadmap' }).click();

    await expect(page).toHaveURL(/\/roadmap$/);
    await expect(page.getByRole('heading', { name: /Master DSA\. One mission at a time\./i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in/i }).first()).toBeVisible();
  });

  test('reflows at tablet and mobile widths, scrolls normally, and honors reduced motion', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole('heading', { name: /Master DSA\. One mission at a time\./i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Start learning/i })).toBeVisible();
      const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);
      expect(scrolls).toBe(true);
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animationName = await page.locator('.algorithm-route-lime').evaluate((element) => getComputedStyle(element).animationName);
    expect(animationName).toBe('none');
    await expect(page.getByRole('link', { name: 'Explore the AlgoNook roadmap' })).toBeVisible();
  });
});
