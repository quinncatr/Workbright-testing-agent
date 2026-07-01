// Stage 1 coverage for the I-9 citizenship flow.
// These tests verify that each supported citizenship/status branch can be selected
// and successfully reaches the document selection page. They intentionally stop
// before document upload/submission; document-specific coverage is handled by
// later List A and List B + C tests.

import { test } from '@playwright/test';
import { startI9, selectCitizenship, goDocumentsPage } from '../helpers/i9-flow';
import type { AlienOption, Citizenship } from '../helpers/i9-data';

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'I-9 suite uses a single QA account; chromium only');
});
test.setTimeout(90_000);

const CITIZENSHIP_OPTIONS: Citizenship[] = ['citizen', 'noncitizen_national', 'permanent_resident'];

for (const citizenship of CITIZENSHIP_OPTIONS) {
  test(`Stage 1: ${citizenship}`, async ({ page }) => {
    await startI9(page);
    await selectCitizenship(page, citizenship);
    await goDocumentsPage(page);
  });
}

const ALIEN_OPTIONS: AlienOption[] = ['arn', 'i94', 'passport'];

for (const option of ALIEN_OPTIONS) {
  test(`Stage 1: alien authorized to work — ${option} option`, async ({ page }) => {
    await startI9(page);
    await selectCitizenship(page, 'alien', option);
    await goDocumentsPage(page);
  });
}
