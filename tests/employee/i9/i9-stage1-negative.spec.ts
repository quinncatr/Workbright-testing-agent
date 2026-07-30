import { test, expect } from '@playwright/test';
import { limitToSupportedProjects } from '@/helpers/projects';
import { startI9, clickNext, expectSection1Rejected } from '@/helpers/i9-flow';

// Section 1 error cases: 
// Run: npx playwright test i9/i9-stage1-negative.spec.ts --project=chromium --workers=1 --headed

limitToSupportedProjects();
test.setTimeout(90_000);

const ALIEN = 'input[name="i9_submission[citizenship_designation]"][value="alien"]';
const PR = 'input[name="i9_submission[citizenship_designation]"][value="permanent_resident"]';
const ARN_TYPE = 'select.arn-type';
const ARN = 'input[name="i9_submission[alien_reg_number]"]';
const I94 = 'input[name="i9_submission[i94_admission_number]"]';
const FPN = 'input[name="i9_submission[foreign_passport_number]"]';
const COUNTRY = 'select[name="i9_submission[country_of_issuance]"]';
const EXP = 'input[name="i9_submission[alien_exp_date]"]';

async function alienStep(page: import('@playwright/test').Page) {
  await startI9(page);
  await page.locator(ALIEN).check();
  await page.waitForTimeout(800);
}

test('USCIS Number thats too short is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(ARN_TYPE).selectOption('uscis');
  await page.locator(ARN).fill('12345');
  await page.locator(EXP).fill('12/31/2030');
  await expectSection1Rejected(page, 'USCIS Number must contain 9 digits');
});

test('Work-authorization expiration date must be a valid date', async ({ page }) => {
  await alienStep(page);
  await page.locator(ARN_TYPE).selectOption('uscis');
  await page.locator(ARN).fill('123456789');
  await page.locator(EXP).fill('not-a-date');
  await expectSection1Rejected(page, 'valid date or N/A');
});

test('Alien work-authorization expiration date is required, if blank it is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(ARN_TYPE).selectOption('uscis');
  await page.locator(ARN).fill('123456789'); // valid identifier, leave the expiration date blank
  await expectSection1Rejected(page, 'Enter the expiration date of your work authorization');
});

test('An identifier option is required, if none are chosen, it is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(EXP).fill('12/31/2030');
  await expectSection1Rejected(page, 'Choose one of the 3 options');
});

test('I-94 Admission Number must be 11 characters, given the wrong length, it is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(I94).fill('123');
  await page.locator(EXP).fill('12/31/2030');
  await expectSection1Rejected(page, 'must be exactly 11 characters');
});

test('I-94 Admission Number with special characters is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(I94).fill('1234@#78A1'); // input mask blocks non-alphanumerics
  await page.locator(EXP).fill('12/31/2030');
  await expectSection1Rejected(page);         // blocked: only letters/numbers are accepted
});

test('Citizenship designation is required, if selecting none, it is rejected', async ({ page }) => {
  await startI9(page); 
  await expectSection1Rejected(page);
});

test('Possible Bug: an expired expiration date is accepted', async ({ page }) => {
  await alienStep(page);
  await page.locator(ARN_TYPE).selectOption('uscis');
  await page.locator(ARN).fill('123456789');
  await page.locator(EXP).fill('01/01/2020'); 
  await clickNext(page);
  await expect(
    page.getByRole('heading', { name: 'Choose Your Documentation', exact: true }),
    'the app currently accepts an expiration date in the past',
  ).toBeVisible({ timeout: 30_000 });
});

test('Foreign passport number thats too short is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(FPN).fill('abc');               
  await page.locator(COUNTRY).selectOption({ index: 1 }); 
  await page.locator(EXP).fill('12/31/2030');
  await expectSection1Rejected(page, 'between 6 and 12 characters');
});

test('Foreign passport number with special characters is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(FPN).fill('AB@12#CD');            
  await page.locator(COUNTRY).selectOption({ index: 1 });
  await page.locator(EXP).fill('12/31/2030');
  await expectSection1Rejected(page);                  
});

test('Foreign passport with no country of issuance is rejected', async ({ page }) => {
  await alienStep(page);
  await page.locator(EXP).fill('12/31/2030');
  await page.locator(FPN).click();
  await page.locator(FPN).pressSequentially('AB123456', { delay: 30 }); 
  await page.keyboard.press('Tab');                   
  await expectSection1Rejected(page);                  
});

test('Permanent resident with a blank A-Number/USCIS Number is rejected', async ({ page }) => {
  await startI9(page);
  await page.locator(PR).check(); 
  await page.waitForTimeout(800);
  await expectSection1Rejected(page, 'This field is required');
});

test('Permanent resident with an invalid A-Number/USCIS Number is rejected', async ({ page }) => {
  await startI9(page);
  await page.locator(PR).check();
  await page.waitForTimeout(800);
  await page.locator(ARN).fill('123'); 
  await expectSection1Rejected(page, 'USCIS Number must contain 9 digits');
});
