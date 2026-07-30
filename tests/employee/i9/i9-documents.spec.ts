import { test } from '@playwright/test';
import { limitToSupportedProjects } from '@/helpers/projects';
import { fillFormForDocs, expectSubmittable } from '@/helpers/i9-flow';
import { LIST_A, LIST_B, LIST_C, PARTNER_B, PARTNER_C, firstCitizenship } from '@/helpers/i9-data';

// Every submittable document for List A and List B/C pairs

limitToSupportedProjects();
test.setTimeout(120_000);

test.describe('List A Document: ', () => {
  for (const doc of LIST_A) {
    test(`List A: ${doc.key}`, async ({ page }) => {
      await fillFormForDocs(page, firstCitizenship(doc), [doc], { alienOption: 'arn' });
      await expectSubmittable(page);
    });
  }
});

test.describe('List B Document: ', () => {
  for (const doc of LIST_B) {
    test(`List B: ${doc.key} + ${PARTNER_C.key}`, async ({ page }) => {
      await fillFormForDocs(page, 'citizen', [doc, PARTNER_C]);
      await expectSubmittable(page);
    });
  }
});

test.describe("List C Document: ", () => {
  for (const doc of LIST_C) {
    test(`List C: ${PARTNER_B.key} + ${doc.key}`, async ({ page }) => {
      await fillFormForDocs(page, 'citizen', [PARTNER_B, doc]);
      await expectSubmittable(page);
    });
  }
});
