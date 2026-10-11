import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth.json', video: 'on', trace: 'on', screenshot: 'on' });
test.setTimeout(60_000);

test('Hashing Frequency Map Builder counts keys, retries mistakes, and records mastery', async ({ page }) => {
  page.setDefaultTimeout(8000);
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));

  await page.goto('http://localhost:3000');
  await expect(page.getByText(/DSA Roadmap|Learning Roadmap/i).first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: /Hashing/i }).first().click();
  await page.getByRole('button', { name: /Play Frequency Map Builder/i }).click();
  await expect(page.getByRole('heading', { name: 'Count Each Key' })).toBeVisible();

  await page.getByRole('button', { name: 'Increment existing count' }).click();
  await expect(page.getByRole('status')).toContainText('pear is new');
  await page.getByRole('button', { name: 'Initialize key at 1' }).click();
  await expect(page.getByText('pear', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Initialize key at 1' }).click();
  await page.getByRole('button', { name: 'Increment existing count' }).click();
  await page.getByRole('button', { name: 'Initialize key at 1' }).click();
  await page.getByRole('button', { name: 'Increment existing count' }).click();
  await page.getByRole('button', { name: 'Increment existing count' }).click();

  await expect(page.getByText('Which key has the highest frequency?', { exact: true })).toBeVisible();
  await expect(page.getByText('pear', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'pear · 3' }).click();
  await expect(page.getByText('Frequency map complete.')).toBeVisible();
  await expect(page.getByText(/pear: 3 · plum: 2 · kiwi: 1/)).toBeVisible();
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(page.getByText('Key 1 of 6')).toBeVisible();
  await expect(page.getByText('Current frequency map')).toHaveCount(0);
  await page.getByRole('button', { name: /Back to Hashing/i }).click();
  await expect(page.getByText('Skill Mastery', { exact: true })).toBeVisible();
  await expect(page.getByText('hashing-frequency', { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(consoleErrors.filter((message) => !/401 \(Unauthorized\)/i.test(message))).toEqual([]);
});
