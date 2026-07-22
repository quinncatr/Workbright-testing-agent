# workbright-testing-agent

## Local setup

1. Install dependencies:
   - `npx playwright install`

2. Create your environment file:

   Copy-Item .env.example .env

3. Set values for the `DOMAIN`, `EMAIL` and `PASSWORD` to .env

4. Run:
   - `npx playwright test`
