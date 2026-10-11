import { test, expect } from '@playwright/test';
import { CONCEPT_MAP } from '../src/data/concepts.js';
import { GAME_LAB_BY_NODE } from '../src/data/games/index.js';
import { getPracticeForNode } from '../src/data/practice.js';
import { MISSION_MAP } from '../src/data/missions/index.js';

test.use({ storageState: 'auth.json', video: 'on', trace: 'on', screenshot: 'on' });
test.setTimeout(120_000);

test('Hashing learning path reaches coding mission, explanation, transfer, and mastery review', async ({ page }) => {
  page.setDefaultTimeout(9000);
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));

  await page.goto('http://localhost:3000');
  await expect(page.getByText(/DSA Roadmap|Learning Roadmap/i).first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: /Hashing/i }).first().click();
  await page.getByRole('button', { name: /Start Learning/i }).click();

  const check = CONCEPT_MAP.hashing.conceptCheck;
  await page.getByRole('button', { name: check.options.find((option) => option.correct).text, exact: true }).click();
  await page.getByRole('button', { name: /Continue to Visualization/i }).click();
  await page.getByRole('button', { name: 'Insert Next Key →' }).click();
  await page.getByRole('button', { name: /Continue to Reasoning Game/i }).click();

  for (const stage of GAME_LAB_BY_NODE.hashing.stages) {
    await expect(page.getByText(stage.label, { exact: true })).toBeVisible();
    const answer = stage.options.find((option) => option.id === stage.answerId);
    await page.getByRole('button', { name: answer.label, exact: true }).click();
    await expect(page.getByRole('status')).not.toBeEmpty();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  }
  await page.getByRole('button', { name: /Continue to Pattern/i }).click();
  await expect(page.getByText('Hashing Patterns', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Continue to Practice/i }).click();

  for (const challenge of getPracticeForNode('hashing')) {
    await expect(page.getByText(challenge.prompt, { exact: true })).toBeVisible();
    const correct = challenge.options.find((option) => option.correct);
    const escaped = correct.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await page.getByRole('button', { name: new RegExp(escaped) }).click();
    await expect(page.getByText('Correct!', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  }

  await page.getByRole('button', { name: /Start problem-solving exercise/i }).click();
  const mission = MISSION_MAP['hsh-1'].problemFlow;
  await expect(page.getByRole('heading', { name: 'Build a Frequency Map' })).toBeVisible();
  await page.getByRole('button', { name: /Start with the input/i }).click();

  for (const step of mission.steps.slice(1)) {
    await expect(page.getByRole('heading', { name: step.heading })).toBeVisible();
    if (step.type === 'choice') {
      const correct = step.options.find((option) => option.correct);
      await page.getByRole('button', { name: new RegExp(correct.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
      await page.getByRole('button', { name: new RegExp(`Continue to ${step.nextLabel}`) }).click();
    } else if (step.type === 'order') {
      for (const item of step.challenge.items) await page.getByRole('button', { name: item, exact: true }).click();
    } else if (step.type === 'implementation') {
      const solution = 'function countFrequencies(values) {\n  const counts = new Map();\n  for (const value of values) {\n    counts.set(value, (counts.get(value) || 0) + 1);\n  }\n  return Object.fromEntries(counts);\n}';
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.evaluate(async (source) => navigator.clipboard.writeText(source), solution);
      await page.locator('.monaco-editor').click();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Control+V');
      await page.getByRole('button', { name: 'Check implementation' }).click();
    } else if (step.type === 'tests') {
      for (const current of step.cases) {
        await expect(page.getByText(current.prompt, { exact: true })).toBeVisible();
        const answer = current.options.find((option) => option.correct);
        await page.getByRole('button', { name: new RegExp(answer.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
        await page.getByRole('button', { name: /Next test case|Review explanation/i }).click();
      }
    }
  }

  await expect(page.getByRole('heading', { name: 'MISSION CLEAR' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Review mastery' }).click();
  await expect(page.getByRole('heading', { name: 'Review & Mastery' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'hashing-frequency' })).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(consoleErrors.filter((message) => !/401 \(Unauthorized\)/i.test(message))).toEqual([]);
});
