import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';
import { AUTH_FILE } from './helpers/projects';
dotenv.config({
  path: path.resolve(__dirname, '.env'),
  quiet: true,
});

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /*
   * Single worker everywhere, not just CI: the suite drives one shared QA account, and
   * with mobile projects enabled a bare `npx playwright test` now matches multiple
   * projects. One worker keeps those runs sequential so they never collide on the account.
   */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { open: 'never'}],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /*
     * Secret header that a Cloudflare WAF "Skip" custom rule matches to bypass
     * the managed challenge / bot check for our own test traffic. Applied to
     * every request, including the initial document navigation. The value lives
     * only in .env (local) and the CF_BYPASS_TOKEN GitHub secret (CI).
     */
    extraHTTPHeaders: process.env.CF_BYPASS_TOKEN
      ? { 'X-WB-Test-Bypass': process.env.CF_BYPASS_TOKEN }
      : {},
  },

  /* Configure projects for major browsers */
  projects: [
    /*
     * Signs in once per invocation (tests/auth.setup.ts) and saves the session to
     * AUTH_FILE. The supported projects below depend on it and load that storage
     * state, so individual tests skip the login form entirely; signIn() in
     * helpers/i9.ts stays callable as a fast already-signed-in check.
     */
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /*
     * Mobile emulation projects (isMobile + hasTouch + device viewport/UA). Specs opt in
     * via limitToSupportedProjects() in helpers/projects.ts. Run one explicitly with e.g.
     * `npx playwright test --project=mobile-chrome --workers=1`.
     */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
