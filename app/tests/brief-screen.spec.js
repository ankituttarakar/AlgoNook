import { test, expect } from '@playwright/test';

test('localhost coding-mission brief opens from its route and launches without crashing', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  // This is the route App uses when a learner chooses a chapter coding mission.
  await page.goto('/challenge/code-max-profit/brief');
  await expect(page.getByRole('heading', { name: 'BEST TIME TO BUY AND SELL' })).toBeVisible();
  await expect(page.getByText(/At each sell day, the best legal buy/)).toBeVisible();
  await expect(page.getByText(/O\(n\) time · O\(1\) extra space/)).toBeVisible();
  await expect(page.getByText('SEC-01 · ARRAYS')).toBeVisible();
  await page.getByRole('button', { name: /Start problem-solving exercise/ }).click();
  await expect(page).toHaveURL(/\/challenge\/code-max-profit\/run$/);
  await expect(page.getByText('BEST TIME TO BUY AND SELL')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
