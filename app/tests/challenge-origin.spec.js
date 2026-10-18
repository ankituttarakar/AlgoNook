import { test, expect } from '@playwright/test';

test('challenge-origin coding lab keeps Challenges selected through refresh and abort', async ({ page }) => {
  await page.goto('/challenge/code-kth-largest/brief?from=challenges');
  await expect(page.getByRole('heading', { name: 'FIND THE KTH LARGEST' })).toBeVisible();
  await expect(page.getByText('/ Challenge Coding Lab')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Challenges' })).toHaveAttribute('aria-current', 'page');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'FIND THE KTH LARGEST' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Challenges' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: /Start problem-solving exercise/ }).click();
  await expect(page).toHaveURL(/\/challenge\/code-kth-largest\/run\?from=challenges$/);
  await expect(page.getByRole('button', { name: 'Challenges' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: '← Exit problem' }).click();
  await expect(page).toHaveURL(/\/challenges$/);
  await expect(page.getByRole('heading', { name: /Choose your challenge/i })).toBeVisible();
});
