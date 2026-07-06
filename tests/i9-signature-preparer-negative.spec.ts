import { test } from '@playwright/test';
import { goToPreparerStep, fillPreparerYes, expectPreparerRejected } from '../helpers/i9-flow';

// Preparer/Translator error cases: 
// Run: npx playwright test tests/i9-signature-preparer-negative.spec.ts --project=chromium --workers=1 --headed

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'I-9 suite uses a single QA account; chromium only');
});
test.setTimeout(120_000);

test('Preparer with an empty form is rejected', async ({ page }) => {
  await goToPreparerStep(page);
  await fillPreparerYes(page, { text: false, state: false, name: false, signature: false }); // pick Yes, fill nothing
  await expectPreparerRejected(page, 'This field is required');
});

test('Preparer without a signature is rejected', async ({ page }) => {
  await goToPreparerStep(page);
  await fillPreparerYes(page, { signature: false });
  await expectPreparerRejected(page, 'This field is required');
});

test('Preparer without a State is rejected', async ({ page }) => {
  await goToPreparerStep(page);
  await fillPreparerYes(page, { state: false });
  await expectPreparerRejected(page, 'This field is required');
});

test('Preparer without the name/address text fields is rejected', async ({ page }) => {
  await goToPreparerStep(page);
  await fillPreparerYes(page, { text: false });
  await expectPreparerRejected(page, 'This field is required');
});
