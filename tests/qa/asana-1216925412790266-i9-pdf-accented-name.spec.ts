/**
 * Asana: https://app.asana.com/1/1110661684743291/project/1215576041936942/task/1216925412790266
 * GID: 1216925412790266
 * "I-9: Fix v8 2026 PDF dropping accented letters"
 *
 * Acceptance criterion being verified (the only one with a UI surface on this account):
 * accented names (e.g. "Óscar") render correctly on the flattened I-9 PDF instead of
 * being dropped ("Óscar" -> "scar"). The other AC items (rake task, golden-PDF fixture in
 * CI, W-4/W-9 template audit, re-rendering already-completed PDFs) have no browser-visible
 * surface on the shared QA account and are not asserted here.
 *
 * Flow: temporarily set the profile first name to an accented value, complete a real I-9
 * resubmission (citizen, U.S. Passport) so a fresh PDF is flattened with that name, download
 * it via the submission page's "file" link, and extract its text with pdf-parse. The profile
 * first name is restored to its original value afterward regardless of outcome.
 *
 * Run:
 *   npx playwright test tests/qa/asana-1216925412790266-i9-pdf-accented-name.spec.ts --project=chromium --workers=1
 *   npx playwright test tests/qa/asana-1216925412790266-i9-pdf-accented-name.spec.ts --project=mobile-chrome --project=mobile-safari --workers=1
 *
 * Shared QA account: each run creates one new I-9 resubmission (expected/idempotent,
 * consistent with the other I-9 specs in this repo) and leaves the profile name as found.
 */
import { test, expect } from '@playwright/test';
import {
  signIn,
  siteOrigin,
  beginI9Resubmission,
  clickNext,
  selectUsCitizen,
  selectUsPassport,
  uploadPassportImages,
  enterPassportDetails,
} from '@/helpers/i9';
import { signEmployee } from '@/helpers/i9-flow';
import { limitToSupportedProjects } from '@/helpers/projects';

const pdfParse = require('pdf-parse');

limitToSupportedProjects();

const ACCENTED_FIRST_NAME = 'Óscar';

test('accented name renders intact on the flattened I-9 PDF', async ({ page }) => {
  await signIn(page);
  await page.goto(`${siteOrigin()}/user/profile`);

  const firstNameInput = page.locator('#employee_profile_first_name');
  const updateButton = page.getByRole('button', { name: 'Update Profile', exact: true });
  const originalFirst = await firstNameInput.inputValue();

  try {
    await firstNameInput.fill(ACCENTED_FIRST_NAME);
    await updateButton.click();
    await page.waitForTimeout(2500);

    await page.goto(`${siteOrigin()}/`);
    await beginI9Resubmission(page);
    await clickNext(page);
    await selectUsCitizen(page);
    await clickNext(page);
    await selectUsPassport(page);
    await clickNext(page);
    await uploadPassportImages(page);
    await enterPassportDetails(page);
    await clickNext(page);
    await clickNext(page);
    await signEmployee(page);
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page).not.toHaveURL(/submission\/new/, { timeout: 45_000 });

    await page.getByRole('link', { name: 'View/Change' }).click();
    const downloadHref = await page.locator('a[href*="/file?download=1"]').first().getAttribute('href');
    expect(downloadHref).toBeTruthy();

    const resp = await page.request.get(`${siteOrigin()}${downloadHref}`);
    expect(resp.status()).toBe(200);
    const pdfBuffer = await resp.body();
    const { text } = await pdfParse(pdfBuffer);

    expect(text).toContain(ACCENTED_FIRST_NAME);
    expect(text).not.toMatch(/\bscar\b/); // the pre-fix bug dropped the accented "Ó", leaving bare "scar"
  } finally {
    await page.goto(`${siteOrigin()}/user/profile`);
    await firstNameInput.fill(originalFirst);
    await updateButton.click();
    await page.waitForTimeout(2500);
    await page.goto(`${siteOrigin()}/user/profile`);
    await expect(firstNameInput).toHaveValue(originalFirst);
  }
});
