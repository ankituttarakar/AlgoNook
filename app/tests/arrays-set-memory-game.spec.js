import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth.json', video: 'on', trace: 'on', screenshot: 'on' });
test.setTimeout(60_000);

test('Arrays Set Memory Sprint records a correct duplicate trace and can replay', async ({ page }) => {
  page.setDefaultTimeout(8000);
  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));

  await page.goto('http://localhost:3000');
  await expect(page.getByText(/DSA Roadmap|Learning Roadmap/i).first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: /Arrays/i }).first().click();
  await page.getByRole('button', { name: /Play Set Memory Sprint/i }).click();
  await expect(page.getByRole('heading', { name: 'Catch the Duplicate' })).toBeVisible();

  // Deliberately make one incorrect decision first to prove retry feedback is real.
  await page.getByRole('button', { name: /Duplicate found — stop/i }).click();
  await expect(page.getByRole('status')).toContainText('not in the processed set');
  await page.getByRole('button', { name: /Add to seen and continue/i }).click();
  await expect(page.getByText('Processed set: {4}')).toBeVisible();
  await page.getByRole('button', { name: /Add to seen and continue/i }).click();
  await expect(page.getByText('Processed set: {4, 7}')).toBeVisible();
  await page.getByRole('button', { name: /Add to seen and continue/i }).click();
  await expect(page.getByText('Processed set: {4, 7, 2}')).toBeVisible();
  await page.getByRole('button', { name: /Duplicate found — stop/i }).click();
  await expect(page.getByText(/Duplicate found at index 3/)).toBeVisible();
  await expect(page.getByText(/incorrect choices: 1/)).toBeVisible();
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(page.getByText('Position 1 of 5')).toBeVisible();
  await expect(page.getByText('Processed set: {}')).toBeVisible();
  await page.getByRole('button', { name: /Back to Arrays/i }).click();
  await expect(page.getByText('Skill Mastery', { exact: true })).toBeVisible();
  await expect(page.getByText('contains-duplicate', { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
