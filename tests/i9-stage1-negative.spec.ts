import { test, expect } from '@playwright/test';
import { startI9, clickNext, expectSection1Rejected } from '../helpers/i9-flow';

// Section 1 error cases: 
// Run: npx playwright test tests/i9-stage1-negative.spec.ts --project=chromium --workers=1

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'I-9 suite uses a single QA account; chromium only');
});
test.setTimeout(90_000);

const ALIEN = 'input[name="i9_submission[citizenship_designation]"][value="alien"]';
const ARN_TYPE = 'select.arn-type';
const ARN = 'input[name="i9_submission[alien_reg_number]"]';
const I94 = 'input[name="i9_submission[i94_admission_number]"]';
const EXP = 'input[name="i9_submission[alien_exp_date]"]';

async function alienStep(page: import('@playwright/test').Page) {
  await startI9(page);
  await page.locator(ALIEN).check();
  await page.waitForTimeout(800);
}

test('USCIS Number too short is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(ARN_TYPE).selectOption('uscis');
  await page.locator(ARN).fill('12345');
  await page.locator(EXP).fill('12/31/2030');
  await expectSection1Rejected(page, 'USCIS Number must contain 9 digits');
});

test('Work-authorization expiration date must be valid', async ({ page }) => {
  await alienStep(page);
  await page.locator(ARN_TYPE).selectOption('uscis');
  await page.locator(ARN).fill('123456789');
  await page.locator(EXP).fill('not-a-date');
  await expectSection1Rejected(page, 'valid date or N/A');
});

test('An identifier option is required, none is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(EXP).fill('12/31/2030');
  await expectSection1Rejected(page, 'Choose one of the 3 options');
});

test('I-94 Admission Number must be 11 characters, wrong length is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(I94).fill('123');
  await page.locator(EXP).fill('12/31/2030');
  await expectSection1Rejected(page, 'must be exactly 11 characters');
});

test('Citizenship designation is required, selecting none is rejected', async ({ page }) => {
  await startI9(page); 
  await expectSection1Rejected(page);
});

test('Possible Error: an already-expired expiration date is accepted', async ({ page }) => {
  await alienStep(page);
  await page.locator(ARN_TYPE).selectOption('uscis');
  await page.locator(ARN).fill('123456789');
  await page.locator(EXP).fill('01/01/2020'); 
  await clickNext(page);
  await expect(
    page.getByRole('heading', { name: 'Choose Your Documentation', exact: true }),
    'app currently accepts a past expiration date and advances',
  ).toBeVisible({ timeout: 30_000 });
});
