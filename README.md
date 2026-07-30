# workbright-testing-agent

## Local setup

1. Install dependencies:
   - `npx playwright install`

2. Create your environment file:

   Copy-Item .env.example .env

3. Set values for the `DOMAIN`, `EMAIL` and `PASSWORD` to .env

4. Run:
   - `npx playwright test` — all supported projects (desktop + mobile, sequential)
   - `npm run test:desktop` — desktop Chrome only
   - `npm run test:mobile` — mobile emulation (Pixel 7 Chrome + iPhone 15 Safari)


