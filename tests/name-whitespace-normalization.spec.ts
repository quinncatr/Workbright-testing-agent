import { test, expect } from '@playwright/test';
import { signIn } from '../helpers/i9-flow';

// Asana 1214649321828179 — "Bugfix: Trim special whitespace from selected attributes"
// https://app.asana.com/1/1110661684743291/project/1212777014402169/task/1214649321828179
//
// AC: normalize names by trimming — BEGINNING AND END ONLY — whitespace (incl. Unicode
// spaces: en/em space, NBSP) and invisible chars (zero-width space, word joiner, BOM),
// so names don't render as "???" on forms. Internal characters are intentionally PRESERVED.
//
// Visible-change verification: enter names wrapped in special whitespace on the profile,
// save, reload, and assert the persisted (normalized) values have the junk trimmed while
// an internal space survives. Fails until the fix is deployed to the target env — which is
// the correct QA signal that the bug is still present.
//
// Run: npx playwright test tests/name-whitespace-normalization.spec.ts --project=chromium --workers=1

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'single QA account; chromium only');
});
test.setTimeout(90_000);

const FIRST = '#employee_profile_first_name';
const MIDDLE = 'input[name="employee_profile[middle_name]"]';
const LAST = 'input[name="employee_profile[last_name]"]';

// leading/trailing "junk": NBSP + en-space, and zero-width space + word joiner + BOM
const LEAD = '  ';
const TRAIL = '​⁠﻿';

async function gotoProfile(page: import('@playwright/test').Page) {
  await page.goto(new URL('/user/profile', page.url()).toString());
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator(FIRST)).toBeVisible();
}

test('Name attributes trim leading/trailing special whitespace and preserve internal spaces', async ({ page }) => {
  await signIn(page);
  await gotoProfile(page);

  // Wrap each name in special whitespace + invisible chars; middle name has an internal
  // space that MUST survive (AC: internal preserved).
  await page.locator(FIRST).fill(`${LEAD}Quinten${TRAIL}`);
  await page.locator(MIDDLE).fill(`${LEAD}Ann Marie${TRAIL}`);
  await page.locator(LAST).fill(`${LEAD}Roberts${TRAIL}`);

  // Sanity: the junk is really in the fields before we submit — so a green result
  // proves the server trimmed it, not that the input silently dropped it.
  expect(await page.locator(FIRST).inputValue()).not.toBe('Quinten');
  expect(await page.locator(LAST).inputValue()).not.toBe('Roberts');

  await page.getByRole('button', { name: 'Update Profile' }).click();
  await page.waitForTimeout(2500);

  // Reload so the fields reflect the PERSISTED (server-normalized) values, not what we typed.
  await gotoProfile(page);

  await expect(page.locator(FIRST), 'leading/trailing junk trimmed').toHaveValue('Quinten');
  await expect(page.locator(LAST), 'leading/trailing junk trimmed').toHaveValue('Roberts');
  await expect(page.locator(MIDDLE), 'ends trimmed, internal space preserved').toHaveValue('Ann Marie');

  // Restore the account to a clean state (clear the middle name we added).
  await page.locator(MIDDLE).fill('');
  await page.getByRole('button', { name: 'Update Profile' }).click();
  await page.waitForTimeout(1500);
});
