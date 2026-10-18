import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { sanitizeUrl, sanitizeValue } from './qa-safety.js';

function safeName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'test';
}

function readJsonFiles(root, basename) {
  const found = [];
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name === basename) {
        try { found.push(JSON.parse(fs.readFileSync(full, 'utf8'))); } catch { /* malformed per-test report is summarized as a warning */ }
      }
    }
  };
  visit(root);
  return found;
}

function markdownTable(headers, rows) {
  if (!rows.length) return '_None recorded._';
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')).join(' | ')} |`),
  ].join('\n');
}

export default class QaReporter {
  onBegin(config, suite) {
    this.config = config;
    this.tests = new Map();
    this.totalDiscovered = suite.allTests().length;
    this.steps = new Map();
    this.startedAt = new Date().toISOString();
    this.commit = '';
    try {
      this.commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: config.rootDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch { /* git metadata is optional */ }
  }

  onStepBegin(test, result, step) {
    const key = `${test.id}:${result.retry}`;
    const entries = this.steps.get(key) || [];
    entries.push({ title: step.title, category: step.category, startedAt: new Date().toISOString() });
    this.steps.set(key, entries);
  }

  onStepEnd(test, result, step) {
    const key = `${test.id}:${result.retry}`;
    const entries = this.steps.get(key) || [];
    const entry = entries.at(-1);
    if (entry && entry.title === step.title) {
      entry.duration = step.duration;
      if (step.error?.message) entry.error = step.error.message;
    }
  }

  onTestEnd(test, result) {
    const old = this.tests.get(test.id);
    if (!old || result.retry >= old.retry) {
      this.tests.set(test.id, {
        id: test.id,
        title: test.titlePath().join(' › '),
        project: test.parent.project()?.name || 'unknown',
        status: result.status,
        retry: result.retry,
        duration: result.duration,
        error: result.error?.message || '',
        steps: this.steps.get(`${test.id}:${result.retry}`) || [],
        attachments: result.attachments.map(({ name, path: attachmentPath }) => ({ name, path: attachmentPath })),
      });
    }
  }

  async onEnd() {
    const rootDir = this.config?.rootDir || process.cwd();
    const outputDir = this.config?.outputDir || 'test-results';
    const output = path.isAbsolute(outputDir)
      ? outputDir
      : path.resolve(rootDir, outputDir);
    const screenshotsDir = path.join(output, 'screenshots');
    const tracesDir = path.join(output, 'traces');
    fs.mkdirSync(screenshotsDir, { recursive: true });
    fs.mkdirSync(tracesDir, { recursive: true });

    const completed = [...this.tests.values()];
    const results = completed.map((test) => {
      const failure = test.status !== 'passed' && test.status !== 'skipped';
      const evidence = [];
      for (const attachment of test.attachments) {
        if (!attachment.path || !fs.existsSync(attachment.path)) continue;
        if (attachment.name.toLowerCase().includes('screenshot') || /\.(png|jpe?g)$/i.test(attachment.path)) {
          const destination = path.join(screenshotsDir, `${safeName(test.project + '-' + test.title)}${path.extname(attachment.path)}`);
          fs.copyFileSync(attachment.path, destination);
          evidence.push(path.relative(output, destination));
        }
      }
      return {
        ...test,
        expected: failure ? 'The existing Playwright assertion should pass.' : '',
        actual: failure ? test.error : '',
        severity: failure ? 'MEDIUM' : '',
        classification: failure ? 'BUG' : '',
        reproductionSteps: failure ? [`Run test: ${test.title}`, `Project: ${test.project}`] : [],
        evidence,
      };
    });
    const qaReports = readJsonFiles(output, 'qa-report.json');
    const fullE2e = qaReports.filter((report) => Array.isArray(report.checks));
    const routeRows = [];
    const interactionRows = [];
    const findings = [];
    const failures = [];
    for (const report of fullE2e) {
      const checkByName = new Map(report.checks.map((check) => [check.name, check]));
      for (const route of report.pages || []) {
        const associated = [...checkByName.values()].find((check) =>
          check.name.toLowerCase().includes(String(route.page).toLowerCase()));
          routeRows.push({ route: route.page, result: associated?.status || 'WARNING', notes: route.title || 'Visited screen was not associated with a named assertion.' });
      }
      for (const check of report.checks) {
        interactionRows.push({
          control: check.name,
          location: check.before?.title || check.before?.url || '',
          result: check.status,
          expected: check.name,
          actual: check.actual || (check.status === 'PASS' ? 'Completed' : check.status),
        });
        if (check.status === 'FAIL') failures.push({
          severity: 'MEDIUM',
          classification: 'BUG',
          title: check.name,
          page: check.before?.url || '',
          reproductionSteps: [`Run the full-e2e-qa Playwright test.`, `Follow check: ${check.name}`],
          expected: check.name,
          actual: check.actual || 'The check failed.',
          evidence: check.screenshot ? path.relative(output, check.screenshot) : '',
        });
      }
      for (const [kind, entries] of Object.entries({
        CONSOLE: report.consoleErrors || [],
        PAGE: report.pageErrors || [],
        NETWORK: report.networkFailures || [],
        HTTP: report.httpErrors || [],
      })) {
        for (const entry of entries) {
          findings.push({
            type: kind,
            page: entry.url || entry.page || '',
            error: entry.text || entry.error || entry.body || `${entry.status || ''}`,
          });
        }
      }
    }
    const groupedFindings = new Map();
    for (const item of findings) {
      const safe = sanitizeValue({ ...item, page: sanitizeUrl(item.page) });
      const key = `${safe.type}\n${safe.page}\n${safe.error}`;
      const current = groupedFindings.get(key) || { ...safe, count: 0 };
      current.count += 1;
      groupedFindings.set(key, current);
    }
    for (const test of results) {
      if (test.classification === 'BUG') failures.push({
        severity: test.severity,
        classification: 'BUG',
        title: test.title,
        page: '',
        reproductionSteps: test.reproductionSteps,
        expected: test.expected,
        actual: test.actual,
        evidence: test.evidence.join(', '),
      });
    }

    const passed = results.filter((item) => item.status === 'passed').length;
    const failed = results.filter((item) => item.status === 'failed' || item.status === 'timedOut' || item.status === 'interrupted').length;
    const blocked = results.filter((item) => item.status === 'skipped').length;
    const warnings = blocked
      + results.filter((item) => item.retry > 0 && item.status === 'passed').length
      + interactionRows.filter((item) => item.result === 'BLOCKED').length
      + routeRows.filter((item) => item.result === 'WARNING').length
      + groupedFindings.size;
    const target = this.config.projects[0]?.use?.baseURL || process.env.QA_BASE_URL || 'http://localhost:3000';
    const browserDevice = this.config.projects.map((project) => `${project.name}: ${project.use.browserName || 'chromium'} ${project.use.defaultBrowserType || ''} ${project.use.viewport ? `${project.use.viewport.width}x${project.use.viewport.height}` : ''}`.trim());
    const report = sanitizeValue({
      targetUrl: sanitizeUrl(target),
      timestamp: this.startedAt,
      finishedAt: new Date().toISOString(),
      browserDevice,
      gitCommit: this.commit || null,
      totalTests: this.totalDiscovered,
      completedTests: results.length,
      passed,
      failed,
      blocked,
      warnings,
      routeCoverage: routeRows,
      interactionCoverage: interactionRows,
      consoleNetworkFindings: [...groupedFindings.values()],
      failures,
      featureOpportunities: [],
      tests: results,
      artifacts: { screenshots: 'screenshots/', traces: 'traces/' },
    });
    for (const test of results.filter((item) => item.status !== 'passed' && item.status !== 'skipped')) {
      const traceFile = path.join(tracesDir, `${safeName(test.project + '-' + test.title)}.json`);
      fs.writeFileSync(traceFile, JSON.stringify(sanitizeValue({
        test: test.title,
        project: test.project,
        status: test.status,
        retry: test.retry,
        expected: test.expected,
        actual: test.actual,
        reproductionSteps: test.reproductionSteps,
        steps: test.steps,
        evidence: test.evidence,
        timestamp: new Date().toISOString(),
      }), null, 2));
    }
    fs.writeFileSync(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2));
    const failureRows = report.failures.map((item) => [
      item.severity, item.classification, item.title, item.page,
      item.reproductionSteps.join('; '), item.expected, item.actual, item.evidence,
    ]);
    const markdown = [
      '# AlgoNook QA Report',
      '',
      `- Target: ${report.targetUrl}`,
      `- Started: ${report.timestamp}`,
      `- Browser/device projects: ${report.browserDevice.join(', ')}`,
      `- Git commit: ${report.gitCommit || 'unavailable'}`,
      `- Tests: ${report.totalTests} total; ${report.passed} passed; ${report.failed} failed; ${report.blocked} blocked; ${report.warnings} warnings`,
      '',
      '## Route coverage',
      '',
      markdownTable(['Route/screen', 'Result', 'Notes'], report.routeCoverage.map((item) => [item.route, item.result, item.notes])),
      '',
      '## Interaction coverage',
      '',
      markdownTable(['Control', 'Location', 'Result', 'Expected', 'Actual'], report.interactionCoverage.map((item) => [item.control, item.location, item.result, item.expected, item.actual])),
      '',
      '## Console/network findings',
      '',
      markdownTable(['Type', 'Page', 'Error', 'Count'], report.consoleNetworkFindings.map((item) => [item.type, item.page, item.error, item.count])),
      '',
      '## Failures',
      '',
      markdownTable(['Severity', 'Type', 'Title', 'Page', 'Reproduction steps', 'Expected', 'Actual', 'Evidence'], failureRows),
      '',
      '## Feature opportunities',
      '',
      '_No feature opportunities are inferred automatically; record only independently requested product capabilities._',
      '',
      '## Artifacts',
      '',
      '- Screenshots: `screenshots/`',
      '- Sanitized failure traces: `traces/` (test step titles/timing/errors only; excludes request headers, cookies, and credentials)',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(output, 'QA_REPORT.md'), markdown);
  }
}
