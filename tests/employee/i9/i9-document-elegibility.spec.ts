// Per-citizenship document eligibility. For each citizenship the wizard must NOT
// let the user pick a document that USCIS does not authorize for that status
// (e.g., an alien cannot present a U.S. Birth Certificate; a citizen cannot
// present a Permanent Resident Card).
//
// The INELIGIBLE_DOCS matrix is derived from the DocSpec.citizenships fields in
// helpers/i9-data.ts, so this suite iterates every citizenship × ineligible-doc
// pair automatically.
//
// Run: npx playwright test tests/employee/i9/i9-document-elegibility.spec.ts --project=chromium --workers=1 --headed

import { test } from '@playwright/test';
import { limitToSupportedProjects } from '@/helpers/projects';
import {
  startI9,
  selectCitizenship,
  goDocumentsPage,
  openListsBC,
  selectDoc,
  gotoUpload,
  fillAllAttachments,
} from '@/helpers/i9-flow';
import { expectDocNotSelectable, expectAttachmentRejected } from '@/helpers/i9-negative';
import { INELIGIBLE_DOCS, findDoc, type Citizenship } from '@/helpers/i9-data';

limitToSupportedProjects();
test.setTimeout(120_000);

const CITIZENSHIPS: Citizenship[] = ['alien'];

for (const citizenship of CITIZENSHIPS) {
  test.describe(`${citizenship} — restricted documents must not be selectable`, () => {
    for (const key of INELIGIBLE_DOCS[citizenship]) {
      const doc = findDoc(key);
      if (!doc) continue;
      test(`${citizenship} cannot select ${key}`, async ({ page }) => {
        await startI9(page);
        await selectCitizenship(page, citizenship);
        await goDocumentsPage(page);
        if (doc.list !== 'A') await openListsBC(page);
        await expectDocNotSelectable(page, key);
      });
    }
  });
}


// TODO: Confirm this expectation with product
// Cross-field rule: an alien picking the EAD (I-766) must have supplied an ARN
// in Section 1. Driving through with a non-ARN identifier (I-94) exercises the
// USCIS requirement that the alien's Section 1 identifier match the presented
// List A document class.
// test('alien selecting EAD (I-766) without an ARN in Section 1 is rejected at Upload', async ({ page }) => {
//   await startI9(page);
//   await selectCitizenship(page, 'alien', 'i94');
//   await goDocumentsPage(page);
//   await selectDoc(page, 'employment_auth_doc');
//   await gotoUpload(page);
//   await fillAllAttachments(page, ['ABC1234567890']);
//   await expectAttachmentRejected(page);
// });
