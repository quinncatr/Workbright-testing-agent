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

```
npx playwright test tests/i9-stage1.spec.ts            --project=chromium --workers=1 --headed
npx playwright test tests/i9-stage1-negative.spec.ts   --project=chromium --workers=1 --headed
npx playwright test tests/i9-documents.spec.ts         --project=chromium --workers=1 --headed
npx playwright test tests/i9-signature-preparer.spec.ts --project=chromium --workers=1 --headed
npx playwright test tests/i9-signature-preparer-negative.spec.ts --project=chromium --workers=1 --headed
```