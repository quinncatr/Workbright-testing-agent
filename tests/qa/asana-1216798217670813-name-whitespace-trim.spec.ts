import { test, expect, Page } from '@playwright/test';
import { signIn } from '../../helpers/i9-flow';

// Asana 1216798217670813 — "Test Agent: Trim special whitespace from selected attributes"
// https://app.asana.com/1/1110661684743291/project/1215576041936942/task/1216798217670813
// (Same AC as Engineering Lifecycle task 1214649321828179; this spec covers the FULL AC —
// both junk classes at BOTH ends, em space included, and internal preservation asserted.)
//
// AC: normalize names by trimming — BEGINNING AND END ONLY — whitespace (incl. Unicode
// spaces: en space, em space, NBSP) and invisible space-like characters (zero-width space,
// word joiner, BOM). Internal characters (whitespace OR invisible) are intentionally
// PRESERVED for now (tracked in a separate spike).
//
// Verification: persisted values on the QA profile page after save + reload.
//
// Run: npx playwright test tests/qa/asana-1216798217670813-name-whitespace-trim.spec.ts --project=chromium --workers=1

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'single QA account; chromium only');
});
test.setTimeout(90_000);

const FIRST = '#employee_profile_first_name';
const MIDDLE = 'input[name="employee_profile[middle_name]"]';
const LAST = 'input[name="employee_profile[last_name]"]';

// Every character class from the AC, mixed together and applied to BOTH ends:
// en space, em space, NBSP + zero-width space, word joiner, BOM.
const SPACES = '   ';
const INVISIBLES = '​⁠﻿';
const LEAD = INVISIBLES + SPACES; // invisibles first, then unicode spaces
const TRAIL = SPACES + INVISIBLES; // unicode spaces first, then invisibles

async function gotoProfile(page: Page) {
  await page.goto(new URL('/user/profile', page.url()).toString());
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator(FIRST)).toBeVisible();
}

async function saveProfile(page: Page) {
  await page.getByRole('button', { name: 'Update Profile' }).click();
  await page.waitForTimeout(2500);
}

test('trims all AC junk classes from both ends; internal space preserved', async ({ page }) => {
  await signIn(page);
  await gotoProfile(page);

  await page.locator(FIRST).fill(`${LEAD}Quinten${TRAIL}`);
  await page.locator(MIDDLE).fill(`${LEAD}Ann Marie${TRAIL}`);
  await page.locator(LAST).fill(`${LEAD}Roberts${TRAIL}`);

  // Sanity: the junk really is in the fields pre-submit, so a green result proves the
  // SERVER trimmed it rather than the input having silently dropped it.
  expect(await page.locator(FIRST).inputValue()).not.toBe('Quinten');
  expect(await page.locator(LAST).inputValue()).not.toBe('Roberts');

  await saveProfile(page);

  // Reload so fields reflect PERSISTED (server-normalized) values, not what we typed.
  await gotoProfile(page);

  await expect(page.locator(FIRST), 'both junk classes trimmed from both ends').toHaveValue('Quinten');
  await expect(page.locator(LAST), 'both junk classes trimmed from both ends').toHaveValue('Roberts');
  await expect(page.locator(MIDDLE), 'ends trimmed, internal space preserved').toHaveValue('Ann Marie');

  // Restore the shared account (middle name is not part of its normal state).
  await page.locator(MIDDLE).fill('');
  await saveProfile(page);
});

test('internal invisible character is preserved (AC scope: ends only)', async ({ page }) => {
  await signIn(page);
  await gotoProfile(page);

  // Word joiner INSIDE the value; ends also wrapped in junk. Per the AC, only the ends may
  // be trimmed — the internal invisible char must persist (its removal is deferred to the
  // internal-spaces spike). A failure here means the fix trims more than its approved scope.
  await page.locator(MIDDLE).fill(`${LEAD}Ann⁠Marie${TRAIL}`);
  await saveProfile(page);

  await gotoProfile(page);
  await expect(page.locator(MIDDLE), 'internal word joiner preserved').toHaveValue('Ann⁠Marie');

  // Restore the shared account.
  await page.locator(MIDDLE).fill('');
  await saveProfile(page);
});
