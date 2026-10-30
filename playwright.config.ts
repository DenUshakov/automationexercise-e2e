import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // One retry in CI absorbs a network blip on the public site; a second would hide flakiness.
  retries: isCI ? 1 : 0,
  // When the target is down every test fails the same way: stop early to stay inside the job
  // timeout, keep the report small and stop sending traffic to a site that is not responding.
  maxFailures: isCI ? 10 : 0,
  // The target is a shared public demo site, so CI parallelism stays moderate.
  // '50%' of CPU cores is Playwright's own default, written out to keep the config explicit.
  workers: env.workers ?? (isCI ? 2 : '50%'),
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'reports/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  expect: { timeout: 10_000 },
  use: {
    baseURL: env.baseUrl,
    // The site marks its controls with data-qa, so getByTestId('signup-name') works.
    testIdAttribute: 'data-qa',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
