# workbright-testing-agent

Playwright E2E tests for the WorkBright QA environment. Additionally an AI agent that
turns Asana tasks into regression specs automatically.

Two ways to use this repo:

1. **Run the test suite** — Playwright specs that drive the QA site (I-9 flows, profile,
   QA regression specs). Needs Node + the QA test account.
2. **Run the QA agent** — a containerized Claude agent that reads Asana tasks moved to QA,
   decides whether the change is verifiable in the browser, writes a Playwright spec for it,
   runs it against QA, and records everything in [`qa-manifest.yml`](qa-manifest.yml).
   Needs Docker + API credentials.

## Quick start (test suite)

Prerequisites: [Node.js](https://nodejs.org) LTS, access to the QA test account and the
Cloudflare bypass token (ask the team / check 1Password).

```
git clone https://github.com/quinncatr/workbright-testing-agent.git
cd workbright-testing-agent
npm ci
npx playwright install
```

Create your environment file and fill in the four values under "QA environment":

```
# Windows
Copy-Item .env.example .env

# macOS/Linux
cp .env.example .env
```

Run the suite:

```
npm test
```

## Running tests

| Command | What it runs |
|---|---|
| `npm test` | Everything, desktop + mobile, sequential |
| `npm run test:desktop` | Desktop Chrome only |
| `npm run test:mobile` | Pixel 7 Chrome + iPhone 15 Safari emulation |
| `npm run test:mobile-chrome` / `test:mobile-safari` | One mobile project |
| `npm run test:headed` | Watch the browser while it runs |
| `npm run test:debug` | Playwright inspector (step through) |
| `npm run test:report` | Open the HTML report from the last run |
| `npm run qa:verify` | Run every manifest spec (desktop, then mobile) and stamp results into `qa-manifest.yml` |

Every run starts with a `setup` project ([tests/auth.setup.ts](tests/auth.setup.ts)) that
signs in once and saves the session to `playwright/.auth/` (gitignored). The supported
projects reuse that storage state, so individual tests skip the login form; `signIn`
detects the live session and falls back to the form only if it expired.

Useful variations:

```
# One spec file
npx playwright test tests/qa/asana-1216798217670813-name-whitespace-trim.spec.ts --project=chromium

# Tests whose title matches a string
npx playwright test -g "accented"

# Record a trace you can replay in the viewer
npx playwright test <spec> --project=chromium --trace on
```

**Do not raise the worker count.** The whole suite drives one shared QA account;
`playwright.config.ts` pins `workers: 1` so runs never collide on it. Tests are expected
to leave the account the way they found it.

## Repo layout

| Path | What it is |
|---|---|
| `tests/` | Playwright specs (`tests/qa/` = generated Asana regression specs, named `asana-<gid>-<slug>.spec.ts`) |
| `helpers/` | Shared flow code: `signIn`, I-9 wizard steps, `limitToSupportedProjects()` |
| `qa-manifest.yml` | Master index: every Asana QA task → spec + result, or a recorded skip with reason |
| `agent/` | The containerized QA agent (Dockerfile, entrypoint, sweep prompt) |
| `agent-docs/` | The agent's knowledge base: navigation, per-area driving patterns, known fragile spots, expected console noise, evidence tiers |
| `CLAUDE.md` | Rules loaded by Claude Code at session start (shared-account etiquette, write-back requirements) |
| `.claude/skills/qa-gen/` | The `/qa-gen <asana-gid>` workflow definition |

## The QA agent (Docker)

The agent behaves like a QA engineer: for each Asana task in the target board it applies a
**visible-change gate** — only tasks whose change can be observed and asserted in the
browser on QA get a spec; everything else (back-end-only, email/SMS content, spikes) is
recorded in the manifest as a skip with the reason. It never commits or pushes: all output
lands in your working tree for review.

The agent validates each new spec on desktop chromium only and records
`mobile_status: pending`; the full desktop+mobile matrix is a mechanical job that needs
no LLM — see "Verifying the manifest" below. This keeps agent runs (and token usage)
short: the expensive part of a sweep was running every spec on three browser projects.

Prerequisites: [Docker](https://docs.docker.com/get-docker/), plus two more `.env` values:

- `CLAUDE_CODE_OAUTH_TOKEN` — generated from your Claude Pro/Max subscription. Run:

  ```
  docker compose -f docker-compose.agent.yml run --rm -it --entrypoint claude qa-agent setup-token
  ```

  Open the printed URL in your browser, sign in to your Claude account and approve, paste
  the code back into the terminal, then copy the printed token (starts with `sk-ant-oat`)
  into `.env` as `CLAUDE_CODE_OAUTH_TOKEN=`. The token authenticates as you and draws from
  your subscription's usage limits — treat it like a password.
- `ASANA_TOKEN` — your personal access token: app.asana.com → Settings → Apps →
  Developer apps → Personal access tokens.

Build once, then verify your setup:

```
docker compose -f docker-compose.agent.yml build
docker compose -f docker-compose.agent.yml run --rm qa-agent --check
```

`--check` prints tool versions and tells you exactly which `.env` values are missing.

Run it:

```
# Sweep the default target (Engineering Lifecycle project, QA section)
docker compose -f docker-compose.agent.yml run --rm qa-agent

# Process one specific Asana task
docker compose -f docker-compose.agent.yml run --rm qa-agent <asana-task-gid>
```

### Agent overrides (set in `.env` or inline)

| Variable | Default | Effect |
|---|---|---|
| `QA_PROJECT_GID` | `1212777014402169` (Engineering Lifecycle) | Which Asana project to sweep |
| `QA_SECTION_NAME` | `QA` | Sweep tasks in this section |
| `QA_TAG_NAME` | unset | Sweep by tag instead of section |
| `CLAUDE_MODEL` | Claude Code default | Model override (e.g. a faster model for routine sweeps) |

Example — sweep a different board by tag:

```
QA_PROJECT_GID=1215576041936942 QA_TAG_NAME=Test docker compose -f docker-compose.agent.yml run --rm qa-agent
```

### After an agent run

1. `git status` / `git diff` — review new specs in `tests/qa/`, manifest entries, and any
   dependency the agent added to `package.json`.
2. If `package.json` changed, run `npm install` on your machine before running the new spec
   locally (the agent installed it inside the container, not on your host).
3. A **red** result is not automatically a bug in the spec: if the fix isn't deployed to QA
   yet, the manifest marks it `red-until-deployed` — the spec should go green when the fix
   ships. Red on a deployed fix is a real finding.
4. New entries have `mobile_status: pending` — run `npm run qa:verify` to execute the
   desktop+mobile matrix and stamp the results.
5. Commit what you accept.

### Verifying the manifest (no agent)

`npm run qa:verify` ([scripts/verify-manifest.mjs](scripts/verify-manifest.mjs)) runs every
spec recorded in `qa-manifest.yml` and updates the status fields in place. It needs only
Node and the QA credentials — no Claude, no Docker. Use it to stamp pending mobile
results, to re-check `red-until-deployed` entries after a deploy, and as a regression
sweep over everything that was green.

```
npm run qa:verify                      # all specs
npm run qa:verify -- --gid <gid>       # one task (comma-separate for several)
npm run qa:verify -- --desktop-only    # skip the mobile projects
```

Windows PowerShell strips the `--` separator, which makes npm swallow the flags. There,
either pass bare GIDs (`npm run qa:verify 123456`) or call the script directly:

```bash
node scripts/verify-manifest.mjs --gid <gid> --desktop-only
```

Per spec it runs chromium first and only runs the mobile projects when desktop passes
(a spec that is red because the fix isn't deployed would fail identically on mobile and
just burn the timeouts twice more). Status rules: desktop pass → `green` + `verified_on`;
desktop fail on a `red-until-deployed` entry → left unchanged; desktop fail on anything
else → `red` (a regression if it was green); mobile pass/fail → `mobile_status` +
`mobile_verified_on`. Exit code is non-zero if anything regressed or failed on mobile.
Failed runs keep Playwright traces under `test-results/verify-<gid>-*`.

There is also a manual GitHub Actions workflow
([.github/workflows/qa-verify.yml](.github/workflows/qa-verify.yml)) that runs the same
script and uploads the updated manifest and reports as artifacts. It is
`workflow_dispatch` only for now — an unattended schedule could collide with local runs
on the single shared QA account.

## Environment variables reference

| Variable | Needed for | Where to get it |
|---|---|---|
| `DOMAIN` | tests + agent | QA subdomain, e.g. `yourco.workbright-qa.dev` |
| `EMAIL` / `PASSWORD` | tests + agent | Shared QA test account (1Password) |
| `CF_BYPASS_TOKEN` | tests + agent | Secret header value matched by the Cloudflare WAF skip rule; without it runs may hit a bot challenge |
| `CLAUDE_CODE_OAUTH_TOKEN` | agent only | Generated via the `setup-token` command above (Claude Pro/Max subscription) |
| `ASANA_TOKEN` | agent only | Your Asana personal access token |

`.env` is gitignored — real values never go in `.env.example` or any committed file.

## Troubleshooting

- **`Cannot find module '<package>'` running a spec locally** — an agent run added a
  dependency; run `npm install`.
- **Cloudflare challenge page / tests stuck on a "verify you are human" screen** —
  `CF_BYPASS_TOKEN` is missing or wrong in `.env`.
- **`env: INCOMPLETE` from the agent** — the `--check` output lists exactly which variables
  to fill in.
- **Tests interfering with each other** — you ran with more than one worker or two people
  ran against the shared account at once; rerun sequentially.
- **A spec fails only on mobile** — that's a real finding, not flakiness; the mobile
  projects exist to catch it (see `helpers/projects.ts`).
