import { test, expect } from '@playwright/test';
import { CONCEPT_MAP } from '../src/data/concepts.js';
import { GAME_LAB_BY_NODE } from '../src/data/games/index.js';
import { getPracticeForNode } from '../src/data/practice.js';
import { MISSION_MAP } from '../src/data/missions/index.js';

test.use({ storageState: 'auth.json', video: 'on', trace: 'on', screenshot: 'on' });
test.setTimeout(120_000);

test('pointer movement game rejects unsafe moves, finds pair, and retries', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.getByText('Learning Roadmap', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByText('Two Pointers', { exact: true }).first().click();
  await expect(page.locator('h1').filter({ hasText: 'Two Pointers' })).toBeVisible();
  await page.getByRole('button', { name: /Play Pointer Movement Game/ }).click();
  await expect(page.getByRole('heading', { name: 'Find a pair that sums to 10' })).toBeVisible();
  await page.getByRole('button', { name: 'Move left →' }).click();
  await expect(page.getByText(/is above 10/)).toBeVisible();
  await expect(page.getByText('Incorrect moves: 1')).toBeVisible();
  await page.getByRole('button', { name: 'Move right ←' }).click();
  await expect(page.getByText(/1 \+ 8 = 9/)).toBeVisible();
  await page.getByRole('button', { name: 'Move left →' }).click();
  await expect(page.getByText(/3 \+ 8 = 11/)).toBeVisible();
  await page.getByRole('button', { name: 'Move right ←' }).click();
  await page.getByRole('button', { name: 'Move left →' }).click();
  await expect(page.getByRole('button', { name: 'Record this pair' })).toBeVisible();
  await page.getByRole('button', { name: 'Record this pair' }).click();
  await expect(page.getByText(/Game complete/)).toBeVisible();
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.getByText('Incorrect moves: 0')).toBeVisible();
});

test('Two Pointers learning route reaches coding, explanation, transfer, and review', async ({ page }) => {
  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  page.setDefaultTimeout(10000);
  await page.goto('http://localhost:3000');
  await expect(page.getByText('Learning Roadmap', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByText('Two Pointers', { exact: true }).first().click();
  await page.getByRole('button', { name: /Start Learning/ }).click();

  const concept = CONCEPT_MAP['two-pointers'];
  await page.getByRole('button', { name: concept.conceptCheck.options.find((option) => option.correct).text, exact: true }).click();
  await page.getByRole('button', { name: /Continue to Visualization/ }).click();
  await page.getByRole('button', { name: 'Step →' }).click();
  await page.getByRole('button', { name: /Continue to Reasoning Game/ }).click();

  for (const stage of GAME_LAB_BY_NODE['two-pointers'].stages) {
    const correct = stage.options.find((option) => option.id === stage.answerId);
    await page.getByRole('button', { name: correct.label, exact: true }).click();
    await expect(page.getByRole('status')).toContainText(correct.feedback);
    await page.getByRole('button', { name: 'Continue →' }).click();
  }
  await page.getByRole('button', { name: /Continue to Pattern/ }).click();
  await page.getByRole('button', { name: /Continue to Practice/ }).click();

  for (const challenge of getPracticeForNode('two-pointers')) {
    const correct = challenge.options.find((option) => option.correct);
    await page.getByRole('button').filter({ hasText: correct.text }).first().click();
    await page.getByRole('button', { name: 'Continue →' }).click();
    await page.waitForTimeout(700);
  }

  await expect(page.getByRole('heading', { name: MISSION_MAP['arr-2'].title })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Start problem-solving exercise/ }).click();
  const flow = MISSION_MAP['arr-2'].problemFlow;
  await page.getByRole('button', { name: /Start with the input/ }).click();
  for (const id of ['pattern', 'complexity']) {
    const step = flow.steps.find((item) => item.id === id);
    const correct = step.options.find((option) => option.correct);
    await page.getByRole('button').filter({ hasText: correct.text }).first().click();
    await page.getByRole('button', { name: /Continue to/ }).click();
  }
  const algorithm = flow.steps.find((item) => item.id === 'algorithm').challenge;
  for (const item of algorithm.items) await page.getByRole('button', { name: item, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Implement the scan' })).toBeVisible();

  const editor = page.locator('.monaco-editor').first();
  await expect(editor).toBeVisible({ timeout: 30000 });
  const solution = 'function twoSumSorted(nums, target) {\n  let left = 0;\n  let right = nums.length - 1;\n  while (left < right) {\n    const sum = nums[left] + nums[right];\n    if (sum === target) return [left, right];\n    if (sum < target) { left++; } else { right--; }\n  }\n  return [];\n}';
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.evaluate(async (text) => navigator.clipboard.writeText(text), solution);
  await page.keyboard.press('Control+V');
  await page.getByRole('button', { name: 'Check implementation' }).click();

  const cases = flow.steps.find((item) => item.id === 'tests').cases;
  for (const testCase of cases) {
    const answer = testCase.options.find((option) => option.correct);
    await page.getByRole('button').filter({ hasText: answer.text }).first().click();
    await page.getByRole('button', { name: /Next test case|Review explanation/ }).click();
  }
  for (const id of ['explain', 'transfer']) {
    const step = flow.steps.find((item) => item.id === id);
    const answer = step.options.find((option) => option.correct);
    await page.getByRole('button').filter({ hasText: answer.text }).first().click();
    await page.getByRole('button', { name: /Continue to/ }).click();
  }
  await expect(page.getByText(/MISSION CLEAR/i)).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Review mastery' }).click();
  await expect(page.getByRole('heading', { name: /Review & Mastery/i })).toBeVisible();
  await expect(page.getByText('two-pointers-pair-sum')).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
