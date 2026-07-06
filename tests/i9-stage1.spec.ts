// Section coverage the I-9 form
// Tests each supported citizenship/status branch

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
