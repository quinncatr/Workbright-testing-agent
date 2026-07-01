import { test } from '@playwright/test';
import {
  fillFormForDocs,
  expectSubmittable,
  finishWithSignature,
  expectSignatureRequired,
} from '../helpers/i9-flow';
import { LIST_A } from '../helpers/i9-data';

// Signature branch (sign vs. no signature) and the Preparer/Translator (Supplement A)
// branch (used vs. not used). All run on the simplest valid path (citizen + US passport).
//
// NOTE: every test here stops at the signature step EXCEPT the final one, which
// actually submits the I-9. It runs last so its state change can't disturb the others.
//
// Run: npx playwright test tests/i9-signature-preparer.spec.ts --project=chromium --workers=1

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'I-9 suite uses a single QA account; chromium only');
});
test.setTimeout(120_000);

const PASSPORT = LIST_A[0]; // us_passport, citizen

test('Signature absent — submission is blocked without a signature', async ({ page }) => {
  await fillFormForDocs(page, 'citizen', [PASSPORT]);
  await expectSignatureRequired(page);
});

test('Preparer/Translator NOT used (Supplement A omitted)', async ({ page }) => {
  await fillFormForDocs(page, 'citizen', [PASSPORT], { includePreparer: false });
  await expectSubmittable(page);
});

test('Preparer/Translator used, with signature (Supplement A included)', async ({ page }) => {
  await fillFormForDocs(page, 'citizen', [PASSPORT], { includePreparer: true });
  await expectSubmittable(page);
});

// Runs last: this is the only test that actually completes/submits the I-9.
test('Signature present — signs the canvas and completes the I-9', async ({ page }) => {
  await fillFormForDocs(page, 'citizen', [PASSPORT]); // stops at the signature step
  await finishWithSignature(page);
});
