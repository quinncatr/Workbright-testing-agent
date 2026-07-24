# workbright-testing-agent

## QA regression suite

When an Asana task reaches the QA section of "Engineering Lifecycle" (project 1212777014402169),
the QA agent acts like a QA engineer: it applies a **visible-change gate** — only tasks whose
change is user-observable in the browser on the QA env get a Playwright spec that reaches the
change and verifies it. Everything else (back-end-only, email/SMS content, spikes) is recorded
as a skip with a reason. Every decision is tracked by Asana task GID in
[`qa-manifest.yml`](qa-manifest.yml).

- Specs: `tests/qa/asana-<gid>-<slug>.spec.ts` (reference example:
  [`tests/name-whitespace-normalization.spec.ts`](tests/name-whitespace-normalization.spec.ts))
- Generate: `/qa-gen <asana-task-gid>` in Claude Code, or the scheduled `qa-test-generator`
  agent (weekday mornings)
- Run: `npx playwright test <spec> --project=chromium --workers=1` (single shared QA account)
- A spec for an undeployed fix is expected to fail — red until the fix reaches QA is the signal.
- The Rails-App repo is read-only reference; nothing is ever written there.

## Local setup

1. Install dependencies:
   - `npx playwright install`

2. Create your environment file:

   Copy-Item .env.example .env

3. Set values for the `DOMAIN`, `EMAIL` and `PASSWORD` to .env

4. Run:
   - `npx playwright test`
