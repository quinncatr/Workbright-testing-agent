/**
 * Auth setup — runs once per `npx playwright test` invocation as the `setup` project
 * (see playwright.config.ts). Signs in to the shared QA account with the form and saves
 * the session to AUTH_FILE; the supported projects load that storage state, so specs
 * start already authenticated and `signIn` becomes a fast redirect check instead of a
 * full login per test.
 *
 * The filename deliberately does not match the default `*.spec.ts` pattern, so no other
 * project picks this file up.
 */
import { test as setup } from '@playwright/test';
import { signIn } from '@/helpers/i9';
import { AUTH_FILE } from '@/helpers/projects';

setup('authenticate shared QA account', async ({ page }) => {
  await signIn(page);
  await page.context().storageState({ path: AUTH_FILE });
});
