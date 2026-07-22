import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { startI9, selectCitizenship, goDocumentsPage, openListsBC, selectDoc, gotoUpload, clickNext } from '@/helpers/i9-flow';

// Documentation Upload Negative cases
// Run: npx playwright test tests/i9-documents-negative.spec.ts --project=chromium --workers=1 --headed

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'I-9 suite uses a single QA account; chromium only');
});
test.setTimeout(120_000);

const IMG = path.resolve(process.cwd(), 'data', 'IMG_5733.jpg');
const UPLOAD = 'Upload Your Documentation';
const IA = 'input[name="issuing_authority"]';
const NUM = 'input[name="document_number"]';
const EXP = 'input[name="expiration_date"]';

//Reach the driver's license attachment page
async function reachDriversLicense(page: Page) {
  await startI9(page);
  await selectCitizenship(page, 'citizen');
  await goDocumentsPage(page);
  await openListsBC(page);
  await selectDoc(page, 'drivers_license');
  await selectDoc(page, 'ssn_card');
  await gotoUpload(page);
}

//Reach the US Passport attachment page
async function reachUsPassport(page: Page) {
  await startI9(page);
  await selectCitizenship(page, 'citizen');
  await goDocumentsPage(page);
  await selectDoc(page, 'us_passport');
  await gotoUpload(page);
}

async function uploadPhotos(page: Page, opts: { front?: boolean; back?: boolean } = {}) {
  const { front = true, back = true } = opts;
  const files = page.locator('input[type="file"]');
  if (front) await files.nth(0).setInputFiles(IMG);
  if (back) await files.nth(1).setInputFiles(IMG);
  const expected = (front ? 1 : 0) + (back ? 1 : 0);
  if (expected > 0) {
    await expect(page.getByRole('button', { name: /Remove/ })).toHaveCount(expected, { timeout: 30_000 });
  }
}

//Assert the attachment was rejected
async function expectDocRejected(page: Page, docTitle: string, errorText?: string) {
  await clickNext(page);
  await page.waitForTimeout(2500);
  await expect(page.getByRole('heading', { name: UPLOAD, exact: true }).first()).toBeVisible();
  await expect(page.locator('[name="document_title"]').first()).toHaveValue(docTitle);
  if (errorText) {
    await expect(page.getByText(errorText, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  }
}

const DL = "Driver's license";

test('Missing front photo is rejected', async ({ page }) => {
  await reachDriversLicense(page);
  await uploadPhotos(page, { front: false }); //back only
  await page.locator(IA).fill('State of Utah Department of Licensing');
  await page.locator(NUM).fill('D1234567');
  await page.locator(EXP).fill('12/31/2030');
  await expectDocRejected(page, DL, 'You must upload a copy of the front');
});

test('Missing back photo is rejected', async ({ page }) => {
  await reachDriversLicense(page);
  await uploadPhotos(page, { back: false }); //front only
  await page.locator(IA).fill('State of Utah Department of Licensing');
  await page.locator(NUM).fill('D1234567');
  await page.locator(EXP).fill('12/31/2030');
  await expectDocRejected(page, DL, 'You must upload a copy of the back');
});

test('Missing Issuing Authority is rejected', async ({ page }) => {
  await reachDriversLicense(page);
  await uploadPhotos(page);
  await page.locator(NUM).fill('D1234567');
  await page.locator(EXP).fill('12/31/2030');
  await expectDocRejected(page, DL, 'Must contain a full state name');
});

test('Missing Document Number is rejected', async ({ page }) => {
  await reachDriversLicense(page);
  await uploadPhotos(page);
  await page.locator(IA).fill('State of Utah Department of Licensing');
  await page.locator(EXP).fill('12/31/2030');
  await expectDocRejected(page, DL, 'This field is required');
});

test('Missing Expiration Date is rejected', async ({ page }) => {
  await reachDriversLicense(page);
  await uploadPhotos(page);
  await page.locator(IA).fill('State of Utah Department of Licensing');
  await page.locator(NUM).fill('D1234567');
  await expectDocRejected(page, DL, 'This field is required');
});

test('Invalid (unparseable) Expiration Date is rejected', async ({ page }) => {
  await reachDriversLicense(page);
  await uploadPhotos(page);
  await page.locator(IA).fill('State of Utah Department of Licensing');
  await page.locator(NUM).fill('D1234567');
  await page.locator(EXP).fill('not-a-date');
  await expectDocRejected(page, DL, 'You did not enter a valid date');
});

test('Invalid Document Number format (US Passport) is rejected', async ({ page }) => {
  await reachUsPassport(page);
  await uploadPhotos(page);
  await page.locator(NUM).fill('12'); 
  await page.locator(EXP).fill('12/31/2030');
  await expectDocRejected(page, 'U.S. Passport'); 
});
