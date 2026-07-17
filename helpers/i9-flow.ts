import { expect, type Page, type Locator } from '@playwright/test';
import path from 'node:path';
import { signIn, beginI9Resubmission, clickNext } from './i9';
import type { Citizenship, AlienOption, DocSpec } from './i9-data';

export { signIn, beginI9Resubmission, clickNext };

const IMG = path.resolve(process.cwd(), 'data', 'IMG_5733.jpg');
const SLOW = 30_000;

//step synchronization
const STEP = {
  citizenship: 'Citizenship',
  documents: 'Choose Your Documentation',
  upload: 'Upload Your Documentation',
  preparer: 'Preparer & Translator Certification',
  signature: 'Employee Signature',
} as const;

export async function expectStep(page: Page, name: string): Promise<void> {
  await expect(page.getByRole('heading', { name, exact: true }).first()).toBeVisible({ timeout: SLOW });
}

async function onStep(page: Page, name: string): Promise<boolean> {
  return page.getByRole('heading', { name, exact: true }).first().isVisible().catch(() => false);
}

//Sign in, start resubmission, and go past the autofilled personal info
export async function startI9(page: Page): Promise<void> {
  await signIn(page);
  const origin = new URL(process.env.DOMAIN ?? '').origin; // recovery target = scheme+host of DOMAIN
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await beginI9Resubmission(page);
      await clickNext(page);        
      await expectStep(page, STEP.citizenship);
      return;
    } catch (err) {
      if (attempt === 3) throw err;
      await page.goto(origin);  //recover from a old 404
      await page.waitForTimeout(2500);
    }
  }
}

export async function selectCitizenship(
  page: Page,
  citizenship: Citizenship,
  alienOption: AlienOption = 'arn',
): Promise<void> {
  await page.locator(`input[name="i9_submission[citizenship_designation]"][value="${citizenship}"]`).check();
  await page.waitForTimeout(800); 

  if (citizenship === 'permanent_resident') {
    await page.locator('input[name="i9_submission[alien_reg_number]"]').fill('123456789');
  }

  if (citizenship === 'alien') {
    if (alienOption === 'arn') {
      await page.locator('input[name="i9_submission[alien_reg_number]"]').fill('123456789');
    } else if (alienOption === 'i94') {
      await page.locator('input[name="i9_submission[i94_admission_number]"]').fill('123456789A1');
    } else {
      await page.locator('input[name="i9_submission[foreign_passport_number]"]').fill('ABC123456789');
      const country = page.locator('select[name="i9_submission[country_of_issuance]"]');
      await country.selectOption({ index: 1 }); //the first real country as index 0 is a placeholder
    }
    await page.locator('input[name="i9_submission[alien_exp_date]"]').fill('12/31/2030');
  }
}

export async function goDocumentsPage(page: Page): Promise<void> {
  await clickNext(page);
  await expectStep(page, STEP.documents);
}

//Negative path helper
export async function expectSection1Rejected(page: Page, errorText?: string): Promise<void> {
  await clickNext(page);
  await page.waitForTimeout(2000);
  await expect(page.getByRole('heading', { name: STEP.documents, exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: STEP.citizenship, exact: true }).first()).toBeVisible();
  if (errorText) {
    await expect(page.getByText(errorText, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  }
}

//Document selection
export async function openListsBC(page: Page): Promise<void> {
  await page.locator('#documentation-lists-nav a').filter({ hasText: 'Lists B' }).first().click();
  await page.waitForTimeout(600);
}

export async function selectDoc(page: Page, key: string): Promise<void> {
  const opt = page.locator(`.document-option[data-key="${key}"]`).first();
  await expect(opt, `document option [${key}] should be enabled for this citizenship`)
    .not.toHaveClass(/disabled/);
  await opt.click();
  await expect(opt).toHaveClass(/active/, { timeout: 5_000 });
}

export async function gotoUpload(page: Page): Promise<void> {
  await clickNext(page);
  await expectStep(page, STEP.upload);
}

//Only press real form controls, not a label/wrapper that is similar 
function control(page: Page, name: string): Locator {
  return page.locator(`input[name="${name}"], select[name="${name}"], textarea[name="${name}"]`).first();
}

//Some fields are multiselects, open them and pick the first valid option
async function selectWbMultiselect(page: Page, name: string): Promise<boolean> {
  const ms = page.locator(`.wb-multiselect[name="${name}"]`).first();
  if (!(await ms.count())) return false;
  const inner = ms.locator('.multiselect');
  //Some are locked/prefilled, therefore nothing to pick, treat as handled
  const disabled = await inner.evaluate((el) => el.classList.contains('multiselect--disabled')).catch(() => false);
  if (disabled) return true;
  await inner.click();
  await page.waitForTimeout(300);
  const option = ms.locator('.multiselect__content li[role="option"]').first();
  await option.waitFor({ state: 'visible', timeout: 8_000 });
  await option.click();
  await page.waitForTimeout(200);
  return true;
}

async function selectValue(field: Locator, predicate: (v: string) => boolean): Promise<string | null> {
  const opts: string[] = await field.evaluate((el) =>
    Array.from((el as HTMLSelectElement).options).map((o) => o.value));
  const value = opts.find(predicate);
  if (value !== undefined) {
    await field.selectOption(value);
    return value;
  }
  return null;
}

//Fill one attachment page
export async function fillAttachment(page: Page, sampleNumber: string): Promise<void> {
  let optionalSkip = false;

  const title = control(page, 'document_title');
  if (await title.count()) {
    const tag = await title.evaluate((e) => e.tagName.toLowerCase());
    if (tag === 'select') {
      const na = await selectValue(title, (v) => /^n\/?a$/i.test(v));
      if (na !== null) optionalSkip = true;
      else await selectValue(title, (v) => v.trim() !== '' && !/^n\/?a$/i.test(v));
    } else if (!(await title.isDisabled()) && !(await title.inputValue())) {
      await title.fill('Test Document');
    }
  }

  if (optionalSkip) return; 

  const files = page.locator('input[type="file"]');
  await files.nth(0).setInputFiles(IMG);
  const hasBack = (await page.locator('label:has-text("Document Back")').count()) > 0;
  if (hasBack && (await files.count()) > 1) await files.nth(1).setInputFiles(IMG);
  await expect(page.getByRole('button', { name: /Remove/ })).toHaveCount(hasBack ? 2 : 1, { timeout: SLOW });

  if (!(await selectWbMultiselect(page, 'issuing_authority'))) {
    const ia = control(page, 'issuing_authority');
    if (await ia.count()) {
      const tag = await ia.evaluate((e) => e.tagName.toLowerCase());
      if (tag === 'select') {
        await selectValue(ia, (v) => v.trim() !== '');
      } else if (!(await ia.isDisabled()) && !(await ia.inputValue())) {
        await ia.fill('State of Utah Department of Licensing');
      }
    }
  }

  const num = page.locator('input[name="document_number"]').first();
  if ((await num.count()) && (await num.isEnabled()) && !(await num.inputValue())) {
    await num.fill(sampleNumber || 'TEST12345');
  }

  const exp = page.locator('input[name="expiration_date"]').first();
  if ((await exp.count()) && (await exp.isEnabled()) && !(await exp.inputValue())) {
    await exp.fill('12/31/2030');
  }
}

export async function fillAllAttachments(page: Page, numbers: string[] = []): Promise<void> {
  for (let i = 0, guard = 0; guard < 8; guard++) {
    if (!(await onStep(page, STEP.upload))) break;
    await fillAttachment(page, numbers[i] ?? numbers[numbers.length - 1] ?? 'TEST12345');
    i++;
    await clickNext(page);
    await page.waitForTimeout(1500);
  }
}

//Preparer/translator helpers
export async function setPreparer(page: Page, include: boolean): Promise<void> {
  await expectStep(page, STEP.preparer);
  const id = include ? '#showPreparerForm-true' : '#showPreparerForm-false';
  await page.locator(id).check({ force: true });
  await page.waitForTimeout(800);

  if (include) {
    const form = page.locator('form#supplement-a');
    await form.locator('[name="first_name"]').fill('Pat');
    await form.locator('[name="last_name"]').fill('Preparer');
    await form.locator('[name="address"]').fill('123 Main St');
    await form.locator('[name="city"]').fill('Springfield');
    await selectWbMultiselect(page, 'state'); //State is a vue-multiselect
    await form.locator('[name="zip"]').fill('90210');
    await form.locator('[name="supplement_a_signature_name"]').fill('Pat Preparer');
    await page.waitForTimeout(300);
    await drawSignature(page, page.locator('canvas').first()); //preparer signature pad
    await page.waitForTimeout(300);
  }
}

export interface PreparerFillOpts {
  text?: boolean;      //First/Last name, Address, City, Zip etc...
  state?: boolean;     
  name?: boolean;      
  signature?: boolean; 
}

//Begins Preparer Form
export async function fillPreparerYes(page: Page, opts: PreparerFillOpts = {}): Promise<void> {
  const { text = true, state = true, name = true, signature = true } = opts;
  await expectStep(page, STEP.preparer);
  await page.locator('#showPreparerForm-true').check({ force: true });
  await page.waitForTimeout(800);

  const form = page.locator('form#supplement-a');
  if (text) {
    await form.locator('[name="first_name"]').fill('Pat');
    await form.locator('[name="last_name"]').fill('Preparer');
    await form.locator('[name="address"]').fill('123 Main St');
    await form.locator('[name="city"]').fill('Springfield');
    await form.locator('[name="zip"]').fill('90210');
  }
  if (state) await selectWbMultiselect(page, 'state'); // State is a vue-multiselect
  if (name) await form.locator('[name="supplement_a_signature_name"]').fill('Pat Preparer');
  if (signature) {
    await page.waitForTimeout(300);
    await drawSignature(page, page.locator('canvas').first()); // preparer signature pad
    await page.waitForTimeout(300);
  }
}

//Reach the Preparer/Translator with the simplest valid path.
export async function goToPreparerStep(
  page: Page,
  citizenship: Citizenship = 'citizen',
  docKey = 'us_passport',
): Promise<void> {
  await startI9(page);
  await selectCitizenship(page, citizenship);
  await goDocumentsPage(page);
  await selectDoc(page, docKey);
  await gotoUpload(page);
  await fillAllAttachments(page, ['123456789']);
  await expectStep(page, STEP.preparer);
}

//Assert Preparer next step was rejected
export async function expectPreparerRejected(page: Page, errorText = 'This field is required'): Promise<void> {
  await clickNext(page);
  await page.waitForTimeout(2000);
  await expect(page.getByRole('heading', { name: STEP.signature, exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: STEP.preparer, exact: true }).first()).toBeVisible();
  if (errorText) {
    await expect(page.getByText(errorText, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  }
}

export async function gotoSignature(page: Page): Promise<void> {
  await clickNext(page);
  await expectStep(page, STEP.signature);
}

//Must draw with the real Playwright mouse, with canvas scrolled into view 
export async function drawSignature(page: Page, canvas: Locator): Promise<void> {
  await canvas.waitFor({ state: 'visible' });
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const b = await canvas.boundingBox();
  if (!b) throw new Error('signature canvas not found / not visible');
  await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.5);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(
      b.x + b.width * (0.2 + 0.6 * i / 20),
      b.y + b.height * (0.5 + 0.25 * Math.sin(i / 2)),
      { steps: 2 },
    );
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
}

export async function signEmployee(page: Page): Promise<void> {
  await drawSignature(page, page.locator('canvas').first());
}

//Run reached the signature step, WITHOUT actually submitting.
export async function expectSubmittable(page: Page): Promise<void> {
  await expectStep(page, STEP.signature);
  await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();
}

//Assert run completes
export async function finishWithSignature(page: Page): Promise<void> {
  await signEmployee(page);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).not.toHaveURL(/submission\/new/, { timeout: SLOW });
}

export async function expectSignatureRequired(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.waitForTimeout(2500);
  await expect(page, 'unsigned Finish must not complete the I-9').toHaveURL(/submission\/new/);
  const msg = page.getByText('Please sign this form', { exact: false }).first();
  if (await msg.count()) await expect(msg).toBeVisible();
}

//Run through a complete employee form for one document selection and stop at the signature step
export async function fillFormForDocs(
  page: Page,
  citizenship: Citizenship,
  docs: DocSpec[],
  opts: { includePreparer?: boolean; alienOption?: AlienOption } = {},
): Promise<void> {
  await startI9(page);
  await selectCitizenship(page, citizenship, opts.alienOption ?? 'arn');
  await goDocumentsPage(page);

  const usingListA = docs[0].list === 'A';
  if (!usingListA) await openListsBC(page);
  for (const d of docs) await selectDoc(page, d.key);

  await gotoUpload(page);
  const numbers = docs.flatMap((d) => d.numbers ?? []);
  await fillAllAttachments(page, numbers);

  await setPreparer(page, opts.includePreparer ?? false);
  await gotoSignature(page);
}
