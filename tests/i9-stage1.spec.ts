import { test } from '@playwright/test';
import { startI9, selectCitizenship, gotoDocuments } from '../helpers/i9-flow';
import type { AlienOption, Citizenship } from '../helpers/i9-data';

// Stage 1 (Section 1) attestation: every citizenship designation, plus the three
// mutually-exclusive identifier options an authorized alien can use. Reaching the
// "Choose Your Documentation" step proves the Section 1 branch validated.
//
// One QA employee account drives all paths, so these must run serially on one
// browser. Run: npx playwright test tests/i9-stage1.spec.ts --project=chromium --workers=1

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'I-9 suite uses a single QA account; chromium only');
});
test.setTimeout(90_000);

const SIMPLE: Citizenship[] = ['citizen', 'noncitizen_national', 'permanent_resident'];

for (const citizenship of SIMPLE) {
  test(`Stage 1: ${citizenship}`, async ({ page }) => {
    await startI9(page);
    await selectCitizenship(page, citizenship);
    await gotoDocuments(page);
  });
}

const ALIEN_OPTIONS: AlienOption[] = ['arn', 'i94', 'passport'];

for (const option of ALIEN_OPTIONS) {
  test(`Stage 1: alien authorized to work — ${option} option`, async ({ page }) => {
    await startI9(page);
    await selectCitizenship(page, 'alien', option);
    await gotoDocuments(page);
  });
}
