import { test } from '@playwright/test';
import {
  fillFormForDocs,
  expectSubmittable,
  finishWithSignature,
  expectSignatureRequired,
} from '../helpers/i9-flow';
import { LIST_A } from '../helpers/i9-data';

// Signature and the Preparer/Translator branch

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'I-9 suite uses a single QA account; chromium only');
});
test.setTimeout(120_000);

const PASSPORT = LIST_A[0]; 

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

// Run this last
test('Signature present — signs the canvas and completes the I-9', async ({ page }) => {
  await fillFormForDocs(page, 'citizen', [PASSPORT]);
  await finishWithSignature(page);
});
