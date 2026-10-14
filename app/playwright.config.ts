import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));
const targetUrl = process.env.QA_BASE_URL || 'http://localhost:3000';
const authState = path.resolve(APP_DIR, process.env.QA_AUTH_STATE || 'auth.json');
const target = new URL(targetUrl);
const isLocalTarget = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.js', '**/*.spec.ts'],
  testIgnore: ['**/example.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.QA_BASE_URL && !isLocalTarget
    ? [['line'], ['./scripts/qa-reporter.js']]
    : [
      ['html', { outputFolder: 'playwright-report', open: 'never' }],
      ['./scripts/qa-reporter.js'],
    ],
  globalSetup: './scripts/qa-global-setup.js',
  outputDir: 'test-results',
  use: {
    baseURL: targetUrl,
    storageState: authState,
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'tablet',
      testMatch: ['algonook.spec.js'],
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'mobile',
      testMatch: ['algonook.spec.js'],
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'desktop-firefox',
      testMatch: ['algonook.spec.js'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'desktop-webkit',
      testMatch: ['algonook.spec.js'],
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: isLocalTarget && target.protocol === 'http:'
    ? {
      command: `npm run dev -- --host 127.0.0.1 --port ${target.port || '3000'} --strictPort`,
      url: targetUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    }
    : undefined,
});
