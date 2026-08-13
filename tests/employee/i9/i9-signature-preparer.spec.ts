import { test } from '@playwright/test';
import { limitToSupportedProjects } from '@/helpers/projects';
import {
  fillFormForDocs,
  expectSubmittable,
  finishWithSignature,
  expectSignatureRequired,
} from '@/helpers/i9-flow';
import { LIST_A } from '@/helpers/i9-data';

//npx playwright test tests\employee\i9\i9-signature-preparer.spec.ts --project=chromium --workers=1 --headed

limitToSupportedProjects();
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
