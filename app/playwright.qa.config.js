import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  outputDir: './test-results/arrays-game-engine',
  use: {
    browserName: 'chromium',
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  },
});
