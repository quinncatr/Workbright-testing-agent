# workbright-testing-agent

## Local setup

1. Install dependencies:

   - npm install
   - npx playwright install

2. Create your environment file:

   Copy-Item .env.example .env

3. Add the QA Url and test account Username and Password to ".env"

4. Run:

   npx playwright test tests/simple I-9 path.spec.ts --headed

## I-9 branch-coverage suite

A data-driven suite that walks the employee-facing I-9 wizard through every
branch of the form. Selectors were verified against the QA DOM, not guessed.

### Layout

- `helpers/i9.ts` — original low-level helpers (sign in, begin resubmission, click Next).
- `helpers/i9-data.ts` — the branch matrix as data: every citizenship designation and
  every submittable List A/B/C document (which citizenships each is valid for, sample
  document numbers that satisfy each input mask, and which docs have multiple upload pages).
- `helpers/i9-flow.ts` — reusable flow building blocks (`startI9`, `selectCitizenship`,
  `selectDoc`, `fillAllAttachments`, `setPreparer`, `signEmployee`, `finishWithSignature`,
  `expectSubmittable`, `fillFormForDocs`, …).
- `tests/i9-stage1.spec.ts` — Section 1: all citizenship paths + the alien ARN / I-94 /
  foreign-passport identifier options.
- `tests/i9-documents.spec.ts` — every submittable document (List A alone; List B and List C
  each paired). Asserts each reaches the signature step (i.e. is submittable) without submitting.
- `tests/i9-signature-preparer.spec.ts` — signature present (real submission) vs. absent
  (blocked), and the Preparer/Translator (Supplement A) used vs. not-used branch.

### Running

These drive ONE shared QA employee account, so run serially on one browser:

```
npx playwright test tests/i9-stage1.spec.ts            --project=chromium --workers=1
npx playwright test tests/i9-documents.spec.ts         --project=chromium --workers=1
npx playwright test tests/i9-signature-preparer.spec.ts --project=chromium --workers=1
```

Notes:
- The specs `test.skip` themselves on non-chromium projects (single account).
- All but one test stop at the signature step; only “Signature present” actually submits.
  `startI9` recovers from a transient post-submit 404 by reloading the dashboard, and the
  “signature absent” test asserts the I-9 simply did not complete (so it's robust to the
  app's occasional post-state 404). Run the signature spec standalone for cleanest results;
  add `--retries=1` if your network to QA is flaky.
- To add a document, add a row to the relevant list in `helpers/i9-data.ts` — no new test code.
