// Negative/edge-case helpers for the I-9 wizard.
// Wraps the primitives in i9-flow.ts so edge-case specs stay declarative:
// - Section 1: build an invalid alien/LPR submission and assert it is rejected.
// - Documents: inspect whether a document option is disabled for the current citizenship.
// - Attachments: fill one attachment page with a targeted invalid override and
//   assert the wizard did not advance.
//
// USCIS-correct behavior is encoded in the assertions; tests using these helpers
// will fail against app-side gaps, which is by design.

import { expect, type Page } from '@playwright/test';
import path from 'node:path';
import { clickNext } from '@/helpers/i9';
import { expectSection1Rejected } from '@/helpers/i9-flow';

const IMG = path.resolve(process.cwd(), 'data', 'IMG_5733.jpg');
const SLOW = 30_000;

// ---- Section 1: alien branch -----------------------------------------------

export type AlienIdentifier = 'arn' | 'i94' | 'passport';
export type ArnSubtype = 'arn' | 'uscis';

export interface AlienAttempt {
  identifier?: AlienIdentifier;    // which of the three radio branches to use
  arnSubtype?: ArnSubtype;         // 'arn' (A-Number) vs 'uscis' when using ARN branch
  arn?: string;                    // value for alien_reg_number
  i94?: string;                    // value for i94_admission_number
  passportNumber?: string;         // value for foreign_passport_number
  countryIndex?: number | 'skip';  // country dropdown position, or 'skip' to leave blank
  expDate?: string;                // value for alien_exp_date
}

// Selectors matching the DOM already exercised by i9-stage1-negative.spec.ts.
const ALIEN_RADIO = 'input[name="i9_submission[citizenship_designation]"][value="alien"]';
const ARN_TYPE   = 'select.arn-type';
const ARN        = 'input[name="i9_submission[alien_reg_number]"]';
const I94        = 'input[name="i9_submission[i94_admission_number]"]';
const PASSPORT   = 'input[name="i9_submission[foreign_passport_number]"]';
const COUNTRY    = 'select[name="i9_submission[country_of_issuance]"]';
const EXP        = 'input[name="i9_submission[alien_exp_date]"]';
const LPR_RADIO  = 'input[name="i9_submission[citizenship_designation]"][value="permanent_resident"]';
const LPR_ARN    = 'input[name="i9_submission[alien_reg_number]"]';

// Set the alien radio and wait for its subform to render.
export async function selectAlienRadio(page: Page): Promise<void> {
  await page.locator(ALIEN_RADIO).check();
  await page.waitForTimeout(800);
}

// Fill the alien Section 1 fields per the attempt spec. Skips fields whose
// values are undefined; empties get cleared explicitly so the attempt can
// exercise a blank input.
export async function fillAlienSection1(page: Page, a: AlienAttempt): Promise<void> {
  await selectAlienRadio(page);

  if (a.identifier === 'i94') {
    if (a.i94 !== undefined) await page.locator(I94).fill(a.i94);
  } else if (a.identifier === 'passport') {
    if (a.passportNumber !== undefined) await page.locator(PASSPORT).fill(a.passportNumber);
    if (a.countryIndex !== 'skip') {
      const idx = a.countryIndex ?? 1; // 0 is the placeholder
      await page.locator(COUNTRY).selectOption({ index: idx });
    }
  } else if (a.identifier === 'arn') {
    if (a.arnSubtype) await page.locator(ARN_TYPE).selectOption(a.arnSubtype);
    if (a.arn !== undefined) await page.locator(ARN).fill(a.arn);
  }

  if (a.expDate !== undefined) await page.locator(EXP).fill(a.expDate);
}

// Fill and assert rejection. `errorText` is passed through to expectSection1Rejected
// so specs can pin the exact validation message when one is expected.
export async function attemptAlienSection1(
  page: Page,
  a: AlienAttempt,
  errorText?: string,
): Promise<void> {
  await fillAlienSection1(page, a);
  await expectSection1Rejected(page, errorText);
}

// LPR branch: only A-Number is user-supplied.
export async function attemptLprSection1(
  page: Page,
  arnValue: string | undefined,
  errorText?: string,
): Promise<void> {
  await page.locator(LPR_RADIO).check();
  await page.waitForTimeout(800);
  if (arnValue !== undefined) await page.locator(LPR_ARN).fill(arnValue);
  await expectSection1Rejected(page, errorText);
}

// ---- Documents: option-state inspection ------------------------------------

export type DocOptionState = 'active' | 'available' | 'disabled' | 'missing';

// Inspect whether a document option (by data-key) is available, disabled, or absent.
// 'available' = present and clickable but not currently selected;
// 'active'    = present and currently selected;
// 'disabled'  = present but visibly disabled;
// 'missing'   = not rendered on this documents page (also a valid restriction).
export async function docOptionState(page: Page, key: string): Promise<DocOptionState> {
  const opt = page.locator(`.document-option[data-key="${key}"]`).first();
  if ((await opt.count()) === 0) return 'missing';
  const cls = (await opt.getAttribute('class')) ?? '';
  if (/\bdisabled\b/.test(cls)) return 'disabled';
  if (/\bactive\b/.test(cls)) return 'active';
  return 'available';
}

// Assert a document key is NOT selectable for the current citizenship — either
// disabled or absent from the list. Fails with a clear message when the option
// is instead selectable, which would indicate a USCIS eligibility gap.
export async function expectDocNotSelectable(page: Page, key: string): Promise<void> {
  const state = await docOptionState(page, key);
  expect(
    state === 'disabled' || state === 'missing',
    `document [${key}] must not be selectable for this citizenship (state=${state})`,
  ).toBeTruthy();
}

// ---- Attachment upload page: targeted invalid submissions -------------------

export interface AttachmentOverrides {
  documentNumber?: string;   // value to force into #document_number
  expirationDate?: string;   // value to force into #expiration_date
  skipFrontUpload?: boolean; // don't upload front image
  skipBackUpload?: boolean;  // don't upload back image (even if slot exists)
  skipIssuingAuthority?: boolean; // don't select/fill issuing authority
}

// Fill the current attachment page with the supplied overrides. Any field not
// overridden is filled with a valid default so the ONLY reason for rejection
// is the mutation. Returns after clicking Next; caller asserts the outcome.
export async function submitAttachmentWithOverrides(
  page: Page,
  overrides: AttachmentOverrides,
  sampleNumber = 'TEST12345',
): Promise<void> {
  const files = page.locator('input[type="file"]');

  if (!overrides.skipFrontUpload) {
    await files.nth(0).setInputFiles(IMG);
  }
  const hasBack = (await page.locator('label:has-text("Document Back")').count()) > 0;
  if (hasBack && !overrides.skipBackUpload && (await files.count()) > 1) {
    await files.nth(1).setInputFiles(IMG);
  }

  // Issuing authority: only touch it when not skipping. Left as-is otherwise.
  if (!overrides.skipIssuingAuthority) {
    const ms = page.locator('.wb-multiselect[name="issuing_authority"]').first();
    if (await ms.count()) {
      const inner = ms.locator('.multiselect');
      const disabled = await inner.evaluate((el) => el.classList.contains('multiselect--disabled')).catch(() => false);
      if (!disabled) {
        await inner.click();
        await page.waitForTimeout(300);
        await ms.locator('.multiselect__content li[role="option"]').first().click();
      }
    } else {
      const ia = page.locator('input[name="issuing_authority"], select[name="issuing_authority"]').first();
      if (await ia.count()) {
        const tag = await ia.evaluate((e) => e.tagName.toLowerCase());
        if (tag === 'select') {
          const opts: string[] = await ia.evaluate((el) =>
            Array.from((el as HTMLSelectElement).options).map((o) => o.value));
          const first = opts.find((v) => v.trim() !== '');
          if (first !== undefined) await ia.selectOption(first);
        } else if (!(await ia.isDisabled()) && !(await ia.inputValue())) {
          await ia.fill('State of Utah Department of Licensing');
        }
      }
    }
  }

  const num = page.locator('input[name="document_number"]').first();
  if ((await num.count()) && (await num.isEnabled())) {
    const value = overrides.documentNumber ?? sampleNumber;
    await num.fill(value);
  }

  const exp = page.locator('input[name="expiration_date"]').first();
  if ((await exp.count()) && (await exp.isEnabled())) {
    const value = overrides.expirationDate ?? '12/31/2030';
    await exp.fill(value);
  }

  await clickNext(page);
  await page.waitForTimeout(1500);
}

// Assert the Upload step did NOT advance. Optionally pin an error message.
export async function expectAttachmentRejected(page: Page, errorText?: string): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Upload Your Documentation', exact: true }).first(),
    'attachment submission must remain on Upload Your Documentation',
  ).toBeVisible({ timeout: SLOW });
  if (errorText) {
    await expect(page.getByText(errorText, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  }
}
