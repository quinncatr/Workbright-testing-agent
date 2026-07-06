import { test } from '@playwright/test';
import { fillFormForDocs, expectSubmittable } from '../helpers/i9-flow';
import { LIST_A, LIST_B, LIST_C, PARTNER_B, PARTNER_C, firstCitizenship } from '../helpers/i9-data';

// Every submittable document for List A and List B/C pairs

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'I-9 suite uses a single QA account; chromium only');
});
test.setTimeout(120_000);

test.describe('List A — single document (identity + work authorization)', () => {
  for (const doc of LIST_A) {
    test(`List A: ${doc.key}`, async ({ page }) => {
      await fillFormForDocs(page, firstCitizenship(doc), [doc], { alienOption: 'arn' });
      await expectSubmittable(page);
    });
  }
});

test.describe('List B — identity document, paired with a List C (SSN card)', () => {
  for (const doc of LIST_B) {
    test(`List B: ${doc.key} + ${PARTNER_C.key}`, async ({ page }) => {
      await fillFormForDocs(page, 'citizen', [doc, PARTNER_C]);
      await expectSubmittable(page);
    });
  }
});

test.describe("List C — work-authorization document, paired with a List B (driver's license)", () => {
  for (const doc of LIST_C) {
    test(`List C: ${PARTNER_B.key} + ${doc.key}`, async ({ page }) => {
      await fillFormForDocs(page, 'citizen', [PARTNER_B, doc]);
      await expectSubmittable(page);
    });
  }
});
