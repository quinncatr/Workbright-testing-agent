import { test, expect } from '@playwright/test';
// @ts-ignore - no bundled types for pdf-parse
import pdfParse from 'pdf-parse';
import {
  startI9,
  selectCitizenship,
  goDocumentsPage,
  selectDoc,
  gotoUpload,
  fillAllAttachments,
  setPreparer,
  gotoSignature,
  finishWithSignature,
} from '../../helpers/i9-flow';

// Asana 1216925412790266 — "I-9: Fix v8 2026 PDF dropping accented letters"
// https://app.asana.com/1/1110661684743291/project/1215576041936942/task/1216925412790266
//
// AC (visible-change slice only; see notes below for AC items out of QA-UI scope):
//   Accented names render correctly on the flattened I-9 PDF.
//
// Root cause per task notes: the v8 2026 template's per-field font lacked an encoding, so
// PDFtk dropped non-ASCII glyphs when flattening (e.g. "Óscar" -> "scar"). Stored data and
// E-Verify submission were unaffected — only the printed/flattened PDF.
//
// The shared QA account's profile first name is genuinely accented ("Óscar"), so this spec
// completes a real I-9 resubmission, downloads the resulting flattened PDF via the same
// "Download PDF" link the employee uses on the submission page, and asserts the accented
// name is intact in the extracted PDF text (not silently dropped to "scar").
//
// Out of QA-UI scope (not asserted here): regression test/rake task in the Rails-App repo,
// golden-PDF fixture in CI, W-4/W-9 template audit, and re-generation of already-rendered PDFs
// — none of these are observable via this account's browser session.
//
// Run: npx playwright test tests/qa/asana-1216925412790266-i9-pdf-accented-name.spec.ts --project=chromium --workers=1

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'single QA account; chromium only');
});
test.setTimeout(120_000);

test('accented employee name renders correctly on the flattened I-9 PDF', async ({ page }) => {
  await startI9(page);
  await selectCitizenship(page, 'citizen');
  await goDocumentsPage(page);
  await selectDoc(page, 'us_passport');
  await gotoUpload(page);
  await fillAllAttachments(page, ['123456789']);
  await setPreparer(page, false);
  await gotoSignature(page);
  await finishWithSignature(page);

  // Land back on the dashboard; its I-9 "View/Change" link points at the submission we just created.
  const viewLink = page.getByRole('link', { name: 'View/Change' });
  await expect(viewLink).toBeVisible({ timeout: 30_000 });
  const href = await viewLink.getAttribute('href');
  expect(href, 'dashboard should link to the new I-9 submission').toMatch(/^\/submissions\/(\d+)$/);
  const submissionId = href!.match(/^\/submissions\/(\d+)$/)![1];

  // Pull the flattened PDF the same way the employee would, via the submission page's Download PDF link.
  const fileUrl = new URL(`/api/submissions/${submissionId}/file?download=1`, page.url()).toString();
  const resp = await page.request.get(fileUrl);
  expect(resp.status(), 'flattened PDF should download').toBe(200);

  const pdf = await pdfParse(await resp.body());
  expect(pdf.text, 'accented first name must render intact, not dropped to "scar"').toContain('Óscar');
  expect(pdf.text, 'last name should render on the same flattened form').toContain('Roberts');
});
