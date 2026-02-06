import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for LocalStack Deployment Validation
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*e2e*.spec.mjs',

  // Test execution settings
  fullyParallel: false, // Run tests sequentially for resource validation
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid resource conflicts

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // Global test settings
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Test timeouts
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // LocalStack services should be running
  globalSetup: undefined,
  globalTeardown: undefined,
});
