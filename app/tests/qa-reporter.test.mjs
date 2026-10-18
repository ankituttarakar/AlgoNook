import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import QaReporter from '../scripts/qa-reporter.js';

test('QA reporter falls back to test-results when Playwright omits outputDir', async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'algonook-qa-reporter-test-'));
  const reporter = new QaReporter();
  const config = {
    rootDir,
    projects: [{ name: 'desktop', use: { baseURL: 'https://preview.example', browserName: 'chromium' } }],
  };
  try {
    reporter.onBegin(config, { allTests: () => [] });
    await reporter.onEnd();
    const output = path.join(rootDir, 'test-results');
    assert.equal(fs.existsSync(path.join(output, 'qa-report.json')), true);
    assert.equal(fs.existsSync(path.join(output, 'QA_REPORT.md')), true);
    assert.equal(fs.existsSync(path.join(output, 'screenshots')), true);
    assert.equal(fs.existsSync(path.join(output, 'traces')), true);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
