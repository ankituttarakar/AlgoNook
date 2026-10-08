import { test, expect } from '@playwright/test';
import { CONCEPT_MAP } from '../src/data/concepts.js';
import { GAME_LAB_BY_NODE } from '../src/data/games/index.js';
import { getPracticeForNode } from '../src/data/practice.js';

test.use({ storageState: 'auth.json', video: 'on', trace: 'on', screenshot: 'on' });
test.setTimeout(120_000);

test('Foundations completes concept, interactive visualization, complexity theory, reasoning, and practice', async ({ page }) => {
  page.setDefaultTimeout(8000);
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));

  await page.goto('http://localhost:3000');
  await expect(page.getByText(/DSA Roadmap|Learning Roadmap/i).first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: /Foundations/i }).first().click();
  await page.getByRole('button', { name: /Start Learning/i }).click();

  const check = CONCEPT_MAP.foundations.conceptCheck;
  const rightAnswer = check.options.find((option) => option.correct);
  const conceptContinue = page.getByRole('button', { name: /Continue to Complexity Analysis|Answer the concept check/i });
  await expect(conceptContinue).toBeDisabled();
  await page.getByRole('button', { name: rightAnswer.text, exact: true }).click();
  await expect(conceptContinue).toBeEnabled();
  await conceptContinue.click();

  const slider = page.getByRole('slider', { name: 'Input size n' });
  await expect(slider).toBeVisible();
  const vizContinue = page.getByRole('button', { name: /Complexity Analysis|visualization control/i });
  await expect(vizContinue).toBeDisabled();
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(vizContinue).toBeEnabled();
  await vizContinue.click();

  await expect(page.getByRole('heading', { name: /Understanding Big-O Notation/i })).toBeVisible();
  await page.getByRole('button', { name: /Continue to Complexity Game/i }).click();

  const lab = GAME_LAB_BY_NODE.foundations;
  for (const stage of lab.stages) {
    await expect(page.getByText(stage.label, { exact: true })).toBeVisible();
    if (stage.options) {
      const answer = stage.options.find((item) => item.id === stage.answerId);
      await page.getByRole('button', { name: answer.label, exact: true }).click();
    } else {
      await page.getByRole('textbox', { name: 'Your answer' }).fill(stage.acceptedAnswers[0]);
      await page.getByRole('button', { name: 'Check reasoning' }).click();
    }
    await expect(page.getByRole('status')).not.toBeEmpty();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Reasoning proof finished' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Practice →' }).click();
  for (const challenge of getPracticeForNode('foundations')) {
    await expect(page.getByText(challenge.prompt, { exact: true })).toBeVisible();
    if (challenge.type === 'short_answer') {
      await page.getByRole('textbox', { name: 'Your answer' }).fill(challenge.acceptedAnswers[0]);
      await page.getByRole('button', { name: 'Check answer' }).click();
    } else {
      const answer = challenge.options.find((option) => option.correct);
      const optionPattern = answer.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await page.getByRole('button', { name: new RegExp(optionPattern) }).click();
    }
    await expect(page.getByText('Correct!', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: /Start Learning/i })).toBeVisible();
  await page.getByRole('button', { name: 'AlgoNook' }).click();
  await page.getByRole('button', { name: /Review & Mastery/i }).click();
  await expect(page.getByRole('heading', { name: 'complexity-analysis' })).toBeVisible();
  await expect(page.getByText(/Attempts:/).first()).toBeVisible();
  expect(pageErrors, 'uncaught page errors').toEqual([]);
  expect(failedRequests, 'failed network requests').toEqual([]);
  // Browser extensions and intentionally rejected API authorization requests can log console errors;
  // capture the list in the test output so they are visible for triage without masking page failures.
  test.info().annotations.push({ type: 'console-errors', description: JSON.stringify(consoleErrors) });
});
