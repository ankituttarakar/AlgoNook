import { test, expect } from '@playwright/test';
import { ARRAYS_GAME_LAB } from '../src/data/games/arrays.js';
import { CONCEPT_MAP } from '../src/data/concepts.js';
import { getPracticeForNode } from '../src/data/practice.js';
import { MISSION_1_DATA } from '../src/data/missions/mission1Data.js';

test.use({ storageState: 'auth.json', video: 'on', trace: 'on', screenshot: 'on' });
test.setTimeout(120_000);

test('Arrays reasoning lab solves each stage and records completion', async ({ page }, testInfo) => {
  page.setDefaultTimeout(7000);
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  await page.goto('http://localhost:3000');
  await expect(page.getByText(/DSA Roadmap|Learning Roadmap/i).first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: /Arrays/i }).first().click();
  await page.getByRole('button', { name: /Start Learning/i }).click();

  const conceptCheck = CONCEPT_MAP.arrays.conceptCheck;
  const correctConcept = conceptCheck.options.find((option) => option.correct);
  const conceptContinue = page.getByRole('button', { name: /Visualization|concept check/i });
  await expect(conceptContinue).toBeDisabled();
  await page.getByRole('button', { name: correctConcept.text, exact: true }).click();
  await expect(conceptContinue).toBeEnabled();
  await conceptContinue.click();

  const visualizationContinue = page.getByRole('button', { name: /Reasoning Game|visualization control/i });
  await expect(visualizationContinue).toBeDisabled();
  await page.getByRole('button', { name: 'Step →', exact: true }).click();
  await expect(visualizationContinue).toBeEnabled();
  await visualizationContinue.click();

  for (const stage of ARRAYS_GAME_LAB.stages) {
    await expect(page.getByText(stage.label, { exact: true }).first()).toBeVisible();
    if (stage.type === 'build') {
      for (const id of stage.expectedOrder) {
        const item = stage.items.find((entry) => entry.id === id);
        await page.getByRole('button', { name: item.label, exact: true }).click();
      }
    } else if (stage.options) {
      const correct = stage.options.find((option) => option.id === stage.answerId);
      await page.getByRole('button', { name: correct.label, exact: true }).click();
    } else {
      await page.getByRole('textbox', { name: 'Your answer' }).fill(stage.acceptedAnswers[0]);
      await page.getByRole('button', { name: 'Check reasoning' }).click();
    }
    await expect(page.getByRole('status')).not.toBeEmpty();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  }

  await expect(page.getByRole('heading', { name: 'Reasoning proof finished' })).toBeVisible();
  await expect(page.getByText(/solved all 8 stages/i)).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Pattern →' }).click();
  await expect(page.getByText('Pattern Recognition', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: /Continue to Practice/ }).click();

  for (const challenge of getPracticeForNode('arrays')) {
    const correct = challenge.options.find((option) => option.correct);
    const safeName = correct.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await page.getByRole('button', { name: new RegExp(safeName) }).click();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: /CONTAINS DUPLICATE/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Start problem-solving exercise/i }).click();
  await expect(page.getByRole('navigation', { name: 'Problem-solving stages' })).toContainText(/CODE/);
  await expect(page.getByRole('navigation', { name: 'Problem-solving stages' })).toContainText(/TEST/);
  await expect(page.getByRole('navigation', { name: 'Problem-solving stages' })).toContainText(/EXPLAIN/);
  await expect(page.getByRole('navigation', { name: 'Problem-solving stages' })).toContainText(/TRANSFER/);

  for (const step of MISSION_1_DATA.problemFlow.steps) {
    if (step.type === 'problem') {
      await page.getByRole('button', { name: 'Start with the input →' }).click();
    } else if (step.type === 'choice') {
      const correct = step.options.find((option) => option.correct);
      await page.getByRole('button', { name: correct.text }).click();
      await page.getByRole('button', { name: new RegExp(`Continue to ${step.nextLabel}`) }).click();
    } else if (step.type === 'order') {
      for (const item of step.challenge.items) await page.getByRole('button', { name: item, exact: true }).click();
    } else if (step.type === 'implementation') {
      const editor = page.locator('.monaco-editor').first();
      await editor.waitFor({ state: 'visible', timeout: 20000 });
      await editor.click();
      await page.keyboard.press('Control+A');
      const solution = 'function containsDuplicate(nums) {\n  const seen = new Set();\n  for (const num of nums) {\n    if (seen.has(num)) { return true; }\n    seen.add(num);\n  }\n  return false;\n}';
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.evaluate(async (source) => navigator.clipboard.writeText(source), solution);
      await page.keyboard.press('Control+V');
      await page.getByRole('button', { name: 'Check implementation' }).click();
      await expect(page.getByText(/A one-element array has no pair of positions/)).toBeVisible({ timeout: 8000 });
    } else if (step.type === 'tests') {
      for (let caseIndex = 0; caseIndex < step.cases.length; caseIndex += 1) {
        const correct = step.cases[caseIndex].options.find((option) => option.correct);
        await page.getByRole('button', { name: correct.text, exact: true }).click();
        await page.getByRole('button', { name: /Next test case|Review explanation/ }).click();
      }
    }
  }

  await expect(page.getByRole('heading', { name: 'MISSION CLEAR' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Review mastery' }).click();
  await expect(page.getByRole('heading', { name: 'Review & Mastery' })).toBeVisible();

  expect(pageErrors, 'uncaught page errors').toEqual([]);
  const auth401Errors = consoleErrors.filter((text) => /401 \(Unauthorized\)/i.test(text));
  const applicationConsoleErrors = consoleErrors.filter((text) => !/401 \(Unauthorized\)/i.test(text));
  if (auth401Errors.length) await testInfo.attach('authenticated-api-401-console-log', { body: auth401Errors.join('\n'), contentType: 'text/plain' });
  expect(applicationConsoleErrors, 'unexpected browser console errors').toEqual([]);
  expect(failedRequests, 'failed requests').toEqual([]);
});
