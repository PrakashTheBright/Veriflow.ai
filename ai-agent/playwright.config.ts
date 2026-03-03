import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: ['api-test/**/*.spec.js', 'api-test/**/*.spec.ts'],
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json']],
  use: {
    trace: 'off',
  },
});
