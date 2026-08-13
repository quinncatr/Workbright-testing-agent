/**
 * Asana: https://app.asana.com/1/1110661684743291/project/1215576041936942/task/1216798217670813
 * GID: 1216798217670813
 * "Test Agent: Trim special whitespace from selected attributes"
 *
 * Acceptance criteria being verified:
 * Normalize names by trimming, from the beginning and end only, whitespace (including
 * Unicode spaces like en/em space and NBSP) and invisible space-like characters
 * (zero-width space, word joiner, BOM), so names do not render as "???" on forms.
 * Current scope: beginning and end only — internal whitespace/invisible characters are
 * intentionally preserved (tracked separately), so this spec also asserts an internal
 * word joiner survives a round trip untouched.
 *
 * Run:
 *   npx playwright test tests/qa/asana-1216798217670813-name-whitespace-trim.spec.ts --project=chromium --workers=1
 *   npx playwright test tests/qa/asana-1216798217670813-name-whitespace-trim.spec.ts --project=mobile-chrome --project=mobile-safari --workers=1
 *
 * Shared QA account: the profile's first/middle/last name are edited then restored to
 * the values found at the start of the test.
 */
import { test, expect } from '@playwright/test';
import { signIn, siteOrigin } from '@/helpers/i9';
import { limitToSupportedProjects } from '@/helpers/projects';

limitToSupportedProjects();

const NBSP = ' ';
const EM_SPACE = ' ';
const ZERO_WIDTH_SPACE = '​';
const WORD_JOINER = '⁠';
const BOM = '﻿';

test('profile name fields trim leading/trailing junk, preserve internal characters', async ({ page }) => {
  await signIn(page);
  await page.goto(`${siteOrigin()}/user/profile`);

  const firstNameInput = page.locator('#employee_profile_first_name');
  const middleNameInput = page.locator('#employee_profile_middle_name');
  const lastNameInput = page.locator('#employee_profile_last_name');
  const updateButton = page.getByRole('button', { name: 'Update Profile', exact: true });

  await expect(firstNameInput).toBeVisible();
  const originalFirst = await firstNameInput.inputValue();
  const originalMiddle = await middleNameInput.inputValue();
  const originalLast = await lastNameInput.inputValue();

  async function saveAndReload(): Promise<void> {
    await updateButton.click();
    await page.waitForTimeout(2500);
    await page.goto(`${siteOrigin()}/user/profile`);
    await expect(firstNameInput).toBeVisible();
  }

  try {
    // Both junk classes (Unicode space + invisible chars) at both ends; a word joiner
    // planted in the middle of the middle name must survive (internal scope only).
    await firstNameInput.fill(`${NBSP}${EM_SPACE}${originalFirst}${ZERO_WIDTH_SPACE}${WORD_JOINER}`);
    await middleNameInput.fill(`${EM_SPACE}A${WORD_JOINER}B${ZERO_WIDTH_SPACE}`);
    await lastNameInput.fill(`${BOM}${originalLast}${NBSP}`);

    await saveAndReload();

    await expect(firstNameInput).toHaveValue(originalFirst);
    await expect(middleNameInput).toHaveValue(`A${WORD_JOINER}B`);
    await expect(lastNameInput).toHaveValue(originalLast);
  } finally {
    await firstNameInput.fill(originalFirst);
    await middleNameInput.fill(originalMiddle);
    await lastNameInput.fill(originalLast);
    await saveAndReload();
    await expect(firstNameInput).toHaveValue(originalFirst);
    await expect(middleNameInput).toHaveValue(originalMiddle);
    await expect(lastNameInput).toHaveValue(originalLast);
  }
});
