import { test, expect } from '@playwright/test';

test('AlgoNook full browser smoke test', async ({ page }) => {
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });

  await page.goto('http://localhost:3000', {
    waitUntil: 'networkidle',
  });

  await page.screenshot({
    path: 'test-results/01-home.png',
    fullPage: true,
  });

  console.log('\n=== BUTTONS FOUND ===');

  const buttons = page.locator('button');
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);

    if (await button.isVisible()) {
      console.log(
        `${i + 1}. ${await button.innerText().catch(() => '[no text]')}`
      );
    }
  }

  console.log('\n=== LINKS FOUND ===');

  const links = page.locator('a');
  const linkCount = await links.count();

  for (let i = 0; i < linkCount; i++) {
    const link = links.nth(i);

    if (await link.isVisible()) {
      console.log(
        `${i + 1}. ${await link.innerText().catch(() => '[no text]')}`
      );
    }
  }

  console.log('\n=== ERRORS ===');

  if (errors.length === 0) {
    console.log('NO BROWSER ERRORS');
  } else {
    errors.forEach(error => console.log(error));
  }

  expect(errors).toEqual([]);
});