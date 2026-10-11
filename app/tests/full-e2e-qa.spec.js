import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { getPracticeForNode } from '../src/data/practice.js';
import { MISSION_1_DATA } from '../src/data/missions/mission1Data.js';

test.use({ storageState: 'auth.json', video: 'on', trace: 'on', screenshot: 'on' });
test.setTimeout(12 * 60 * 1000);

test('AlgoNook full end-to-end browser QA', async ({ page }, testInfo) => {
  page.setDefaultTimeout(6000);
  const outDir = testInfo.outputDir;
  const report = { startedAt: new Date().toISOString(), url: 'http://localhost:3000', checks: [], consoleErrors: [], pageErrors: [], networkFailures: [], httpErrors: [], pages: [] };
  const heading = async () => await page.locator('h1').first().innerText({ timeout: 1500 }).catch(() => '');
  const snap = async (name) => {
    const file = path.join(outDir, `${String(report.checks.length + 1).padStart(3, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
    try { await page.screenshot({ path: file, fullPage: true, timeout: 15000 }); } catch {}
    return file;
  };
  const check = async (name, fn, opts = {}) => {
    console.log(`CHECK START: ${name}`);
    const before = { url: page.url(), title: await heading(), body: (await page.locator('body').innerText({ timeout: 1500 }).catch(() => '')).slice(0, 3000) };
    try {
      await fn();
      report.checks.push({ name, status: 'PASS', before, after: { url: page.url(), title: await heading() } });
      console.log(`CHECK PASS: ${name}`);
    } catch (e) {
      const screenshot = await snap(name);
      report.checks.push({ name, status: opts.blocked ? 'BLOCKED' : 'FAIL', before, actual: e.message, screenshot, after: { url: page.url(), title: await heading(), body: (await page.locator('body').innerText({ timeout: 1500 }).catch(() => '')).slice(0, 3000) } });
      console.log(`CHECK ${opts.blocked ? 'BLOCKED' : 'FAIL'}: ${name}: ${e.message}`);
    }
  };
  const body = () => page.locator('body').innerText();
  const clickText = async (text, scope = page) => {
    const re = text instanceof RegExp ? text : new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const candidates = scope.getByRole('button', { name: re });
    const count = await candidates.count();
    for (let i = 0; i < count; i++) if (await candidates.nth(i).isVisible().catch(() => false) && await candidates.nth(i).isEnabled().catch(() => false)) { await candidates.nth(i).click({ timeout: 6000 }); await page.waitForTimeout(450); return; }
    const links = scope.getByRole('link', { name: re });
    if (await links.count()) { await links.first().click({ timeout: 6000 }); await page.waitForTimeout(450); return; }
    throw new Error(`Visible enabled control not found: ${text}`);
  };
  const chooseFirstCorrect = async () => {
    // In this app's declarative challenge data the correct answer is the first option.
    const buttons = page.locator('button').filter({ hasText: /^[A-D]\./ });
    const n = await buttons.count();
    if (!n) throw new Error('No answer options found');
    await buttons.first().click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(300);
  };
  const solvePracticeSet = async (nodeId) => {
    const challenges = getPracticeForNode(nodeId);
    for (let i = 0; i < challenges.length; i++) {
      const expected = challenges[i].options.find(option => option.correct)?.text;
      if (!expected) throw new Error(`No correct answer configured for ${nodeId} practice ${i + 1}`);
      const candidate = page.getByRole('button').filter({ hasText: new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
      if (!(await candidate.count())) throw new Error(`Correct practice choice not visible: ${expected}`);
      await candidate.first().click({ timeout: 1200 }).catch(() => {});
      await page.waitForTimeout(250);
      if (!/Correct!/.test(await body())) throw new Error(`Expected correct choice feedback for ${nodeId} practice ${i + 1}`);
      await clickText(/Continue →/); await page.waitForTimeout(900);
    }
    await page.waitForTimeout(500);
  };
  const nextVisibleButton = async () => {
    const b = page.getByRole('button').filter({ hasText: /^(Continue|Next|Review|Start with|Advance|Enter|Check|Go to|Back|Return)/i });
    const n = await b.count();
    for (let i = n - 1; i >= 0; i--) if (await b.nth(i).isVisible().catch(() => false) && await b.nth(i).isEnabled().catch(() => false)) { await b.nth(i).click(); await page.waitForTimeout(450); return; }
    throw new Error('No visible enabled progression control');
  };
  page.on('console', msg => { if (msg.type() === 'error') report.consoleErrors.push({ text: msg.text(), url: page.url() }); });
  page.on('pageerror', e => report.pageErrors.push({ text: e.message, url: page.url() }));
  page.on('requestfailed', req => report.networkFailures.push({ method: req.method(), url: req.url(), error: req.failure()?.errorText }));
  page.on('response', res => { if (res.status() >= 400) res.text().then(text => report.httpErrors.push({ status: res.status(), url: res.url(), body: text.slice(0, 500) })).catch(() => report.httpErrors.push({ status: res.status(), url: res.url() })); });

  await check('authenticated landing or entry', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const text = await body();
    if (!/DSA Roadmap|Learning Roadmap|Sign in|Sign up|AlgoNook/i.test(text)) throw new Error('Neither authenticated roadmap nor a usable auth entry rendered');
    report.pages.push({ page: 'entry', title: await page.locator('h1').first().innerText().catch(() => ''), controls: await page.locator('button:visible, a:visible, select:visible').evaluateAll(xs => xs.map(x => ({ tag: x.tagName, text: (x.innerText || x.getAttribute('aria-label') || x.getAttribute('title') || '').trim().slice(0, 100), disabled: !!x.disabled }))) });
  });

  if (!/DSA Roadmap|Learning Roadmap/i.test(await body())) {
    await check('auth entry controls', async () => { await snap('auth-entry'); });
  } else {
    const recordPage = async (name) => report.pages.push({ page: name, title: await page.locator('h1').first().innerText().catch(() => ''), controls: await page.locator('button:visible, a:visible, select:visible').evaluateAll(xs => xs.map(x => ({ tag: x.tagName, text: (x.innerText || x.getAttribute('aria-label') || x.getAttribute('title') || '').trim().slice(0, 100), disabled: !!x.disabled }))) });
    await recordPage('roadmap');

    await check('Review and Mastery open and return', async () => {
      await clickText(/Review & Mastery/); if (!/Review & Mastery/.test(await body())) throw new Error('Review screen did not render');
      await recordPage('review'); await clickText(/Back to Roadmap/); if (!/DSA Roadmap/.test(await body())) throw new Error('Back to Roadmap failed');
    });

    // Open each roadmap card. This covers each reachable implemented and Coming Soon topic state.
    const topics = ['Foundations', 'Arrays', 'Hashing', 'Two Pointers', 'Binary Search', 'Sliding Window', 'Stacks & Queues', 'Linked Lists', 'Trees', 'Heaps / Priority Queues', 'Graphs', 'Backtracking', 'Dynamic Programming', 'Interview Patterns'];
    for (const topic of topics) {
      await check(`roadmap topic: ${topic}`, async () => {
        if (!/DSA Roadmap/.test(await body())) await clickText(/Learning Roadmap|Back to Roadmap/);
        const card = page.getByRole('button', { name: new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
        if (!(await card.count())) throw new Error(`Roadmap card missing: ${topic}`);
        if (await card.first().isDisabled()) throw new Error(`Roadmap card is locked/unavailable: ${topic}`);
        await card.first().click(); await page.waitForTimeout(350);
        if (!(await body()).includes(topic)) throw new Error(`Topic screen did not identify ${topic}`);
        await recordPage(`topic:${topic}`);
        if (/Coming Soon/i.test(await body())) {
          if (await page.getByRole('button', { name: /Start Learning/ }).count()) throw new Error('Coming Soon topic exposes Start Learning');
          if (!/currently in development/i.test(await body())) throw new Error('Coming Soon explanatory state is absent');
        }
        await clickText(/Learning Roadmap|Back to Roadmap|← Back/i);
      });
    }

    // Foundations: concept → complexity → practice → topic. Exercise wrong answer/retry and correct answer.
    await check('Foundations concept, complexity and practice', async () => {
      await clickText(/Foundations/); await clickText(/Start Learning/);
      if (!/Algorithm Foundations|Foundations/i.test(await body())) throw new Error('Foundations concept missing'); await recordPage('foundations:concept');
      await clickText(/Continue/); if (!/Complexity Analysis/i.test(await body())) throw new Error('Complexity stage missing'); await recordPage('foundations:complexity');
      await clickText(/Continue/); if (!/Practice/i.test(await body())) throw new Error('Foundations practice stage missing'); await recordPage('foundations:practice');
      await solvePracticeSet('foundations');
      if (!/Foundations/.test(await body())) throw new Error('Practice did not return to Foundations topic');
      await recordPage('foundations:topic-after-practice');
    });

    // Arrays complete the learning path, then enter the fully declarative interview problem flow.
    await check('Arrays learning path and problem brief', async () => {
      await clickText(/Learning Roadmap|Back to Roadmap/); await clickText(/Arrays/); await clickText(/Start Learning/);
      if (!/Arrays/.test(await body())) throw new Error('Arrays concept missing'); await recordPage('arrays:concept');
      await clickText(/Continue/); if (!/Visualization/i.test(await body())) throw new Error('Arrays visualization missing'); await recordPage('arrays:visualization');
      // Exercise visualization playback controls if present, then proceed.
      const play = page.getByRole('button', { name: /Play|Pause|Step|Reset/i }); if (await play.count()) await play.first().click().catch(() => {});
      await clickText(/Continue to Pattern Recognition/); if (!/Pattern Recognition/.test(await body())) throw new Error('Pattern stage missing'); await recordPage('arrays:pattern');
      await clickText(/Continue to Practice/); if (!/Practice/.test(await body())) throw new Error('Arrays practice missing'); await recordPage('arrays:practice');
      // Work through all practice checks by choosing the first declared correct answer.
      await solvePracticeSet('arrays');
      if (!/Arrays/.test(await body())) throw new Error('Arrays practice did not return to topic');
      await recordPage('arrays:topic');
      await clickText(/Start →|Start$/); if (!/Mission Brief|CONTAINS DUPLICATE/i.test(await body())) throw new Error('Problem brief missing'); await recordPage('arrays:brief');
      await clickText(/Start problem-solving exercise|Deploy/i); await page.waitForTimeout(500);
      if (!/Read the specification/.test(await body())) throw new Error('Problem flow did not start'); await recordPage('arrays:problem');
    });

    // Work the first problem's interpret/pattern/approach/complexity/pseudocode/test/code/explain/transfer stages.
    await check('Arrays mission stages, editor, execution and debrief', async () => {
      if (!/Read the specification/.test(await body())) throw new Error('Mission test began outside the problem flow');
      for (let guard = 0; guard < 18; guard++) {
        const text = await body();
        const stepHeading = await page.locator('main > section > header h2').first().innerText({ timeout: 1500 }).catch(() => '');
        if (/MISSION CLEAR|Mission Complete|Mission Debrief/.test(text)) break;
        if (/Read the specification/.test(text)) { await clickText(/Start with the input/); continue; }
        if (/Interpret the requirement|Recognize the reusable pattern|Choose an approach|State the trade-off/i.test(stepHeading)) {
          await chooseFirstCorrect(); await clickText(/Continue to/); continue;
        }
        if (/Order the algorithm/i.test(stepHeading)) {
          const order = [
            'Create an empty set named seen.',
            'For each num in nums, check whether seen already contains num.',
            'If num is present, return true; otherwise add num to seen.',
            'After the loop, return false.',
          ];
          for (const item of order) await clickText(new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
          continue;
        }
        if (/Verify edge cases/i.test(stepHeading)) {
          const cases = MISSION_1_DATA.problemFlow.steps.find(step => step.type === 'tests').cases;
          for (let index = 0; index < cases.length; index++) {
            const correct = cases[index].options.find(option => option.correct)?.text;
            if (!correct) throw new Error(`No correct answer configured for test case ${index + 1}`);
            const answer = page.getByRole('button', { name: correct, exact: true });
            if (!(await answer.count())) throw new Error(`Expected test answer unavailable: ${correct}`);
            await answer.click({ timeout: 1200 }).catch(() => {}); await page.waitForTimeout(200);
            if (!(await page.getByRole('button', { name: /Next test case|Review explanation/ }).count())) throw new Error(`Test case ${index + 1} did not accept its correct answer`);
            await clickText(/Next test case|Review explanation/);
          }
          continue;
        }
        if (/Implement the function/i.test(stepHeading)) {
          await page.waitForTimeout(1800);
          const lang = page.locator('#dsa-language-selector');
          if (await lang.count()) {
            await lang.selectOption('python');
            const editor = page.locator('.monaco-editor').first();
            await editor.waitFor({ state: 'visible', timeout: 15000 }); await editor.click(); await page.keyboard.press('Control+A');
            const pythonSolution = 'def containsDuplicate(nums):\n    seen = set()\n    for num in nums:\n        if num in seen:\n            return True\n        seen.add(num)\n    return False\n';
            await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
            await page.evaluate(async source => navigator.clipboard.writeText(source), pythonSolution);
            await page.keyboard.press('Control+V');
            await clickText(/Run Code/); await page.waitForTimeout(5000);
            const status = await body();
            if (/Could not reach|Execution request failed|session could not be verified|Unauthorized|sign in again/i.test(status)) {
              const screenshot = await snap('python-run-failure');
              report.checks.push({ name: 'Python Run Code API', status: 'FAIL', expected: 'Run Python against trusted test cases and show results', actual: status.slice(-900), screenshot });
              console.log('CHECK FAIL: Python Run Code API returned an error; continuing with editor validation');
            }
            // Check/reset in multiple editor states, and validate a real solution via the JS structure checker.
            await lang.selectOption('javascript');
            const jsEditor = page.locator('.monaco-editor').first(); await jsEditor.click(); await page.keyboard.press('Control+A');
            const javascriptSolution = 'function containsDuplicate(nums) {\n  const seen = new Set();\n  for (const num of nums) {\n    if (seen.has(num)) { return true; }\n    seen.add(num);\n  }\n  return false;\n}';
            await page.evaluate(async source => navigator.clipboard.writeText(source), javascriptSolution);
            await page.keyboard.press('Control+V');
            await clickText(/Check implementation/); await page.waitForTimeout(450);
            if (/Implement the function/.test(await body())) throw new Error('Structure check did not accept the complete JS solution');
            continue;
          }
          throw new Error('Code editor language selector absent');
        }
        if (/explain|proof|reason|why|invariant/i.test(stepHeading)) { await chooseFirstCorrect(); await clickText(/Continue to Transfer/); continue; }
        if (/transfer|adapt the pattern/i.test(stepHeading)) { await chooseFirstCorrect(); await clickText(/Continue to Finish/); continue; }
        // Generic declarative checkpoint progression, preserving recovery after an unexpected control.
        if (/Continue|Next|Start|Review|Check|Complete|Finish/.test(text)) { await nextVisibleButton(); continue; }
        throw new Error(`No known progression for mission screen: ${text.slice(0, 650)}`);
      }
      await page.waitForTimeout(600);
      if (!/MISSION CLEAR/.test(await body())) throw new Error('Mission did not reach the successful debrief screen');
      await recordPage('arrays:debrief');
      // Exercise replay and map/continue navigation without erasing completed progress.
      const replay = page.getByRole('button', { name: /Replay/i }); if (await replay.count()) { await replay.click(); await page.waitForTimeout(400); await clickText(/Back|Exit/i).catch(() => {}); }
      const map = page.getByRole('button', { name: /Roadmap|Map/i }); if (await map.count()) await map.last().click();
      await page.waitForTimeout(300);
    });

    // Binary Search and Hashing stages are separately visited, including their back buttons.
    for (const topic of ['Hashing', 'Two Pointers', 'Binary Search']) {
      await check(`${topic} concept and stage navigation`, async () => {
        if (!/DSA Roadmap/.test(await body())) {
          if (await page.getByRole('button', { name: /Exit problem/i }).count()) await clickText(/Exit problem/);
          if (!/DSA Roadmap/.test(await body())) await clickText(/Learning Roadmap|Back to Roadmap/);
        }
        await clickText(new RegExp(topic, 'i')); await clickText(/Start Learning/);
        await recordPage(`${topic.toLowerCase()}:concept`);
        if (topic === 'Hashing') {
          await clickText(/Continue/); await recordPage('hashing:visualization');
          await clickText(/Continue to Pattern Recognition/); await recordPage('hashing:pattern');
        } else if (topic === 'Two Pointers') {
          await clickText(/Continue/); await recordPage('two-pointers:visualization');
          await clickText(/Continue to Pattern Recognition/); await recordPage('two-pointers:pattern');
        } else {
          await clickText(/Continue/); await recordPage('binary-search:visualization');
          await clickText(/Continue to Pattern Recognition/); await recordPage('binary-search:pattern');
        }
        await clickText(/Continue to Practice/); await recordPage(`${topic.toLowerCase()}:practice`);
        await clickText(/Back to Patterns/); await clickText(/Back to Visualization/); await clickText(/Back to Concept/);
        await clickText(new RegExp(`Back to ${topic}`, 'i'));
        await clickText(/Learning Roadmap|Back to Roadmap/);
      });
    }
  }

  report.finishedAt = new Date().toISOString();
  report.summary = {
    pass: report.checks.filter(x => x.status === 'PASS').length,
    fail: report.checks.filter(x => x.status === 'FAIL').length,
    blocked: report.checks.filter(x => x.status === 'BLOCKED').length,
    consoleErrors: report.consoleErrors.length, pageErrors: report.pageErrors.length,
    failedRequests: report.networkFailures.length, httpErrors: report.httpErrors.length,
  };
  fs.writeFileSync(path.join(outDir, 'qa-report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, 'console-page-network.json'), JSON.stringify({ consoleErrors: report.consoleErrors, pageErrors: report.pageErrors, networkFailures: report.networkFailures, httpErrors: report.httpErrors }, null, 2));
  console.log(JSON.stringify(report.summary));
  console.log(`QA_REPORT=${path.join(outDir, 'qa-report.json')}`);
});
