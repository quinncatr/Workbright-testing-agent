# Agent entry point (read first, every session)

This repo drives the WorkBright QA environment with Playwright. Claude Code loads this
file automatically at the start of every session. It holds only the rules that apply to
every browser task and points to everything else. Keep it under a page or two: if a
section outgrows a few lines, move it into `agent-docs/` and leave a link here.

## Universal rules

- Credentials and target live in `.env` (`DOMAIN`, `EMAIL`, `PASSWORD`). Sign in with
  `signIn` from `helpers/i9.ts`. Never create or modify anything in the Rails-App repo;
  read it only as reference.
- One shared QA account. Always pass `--workers=1` (the config also pins `workers: 1`),
  and leave the account the way you found it: restore any data you changed.
- Supported projects: `chromium`, `mobile-chrome` (Pixel 7), `mobile-safari` (iPhone 15).
  Guard every spec with `limitToSupportedProjects()` from `helpers/projects.ts`.
- The QA env sits behind a Cloudflare WAF. Playwright runs bypass it automatically via
  `extraHTTPHeaders` in `playwright.config.ts` (`CF_BYPASS_TOKEN` in `.env`). A browser
  session without that header may hit a managed challenge: do not try to solve it, note
  it and stop.
- Identity check: the in-app browser keeps cookies between tasks. Before doing anything
  account-specific there, confirm who is signed in (open `/user/profile` and check the
  name/email fields). Playwright tests sign in per test, so this applies to interactive
  sessions.
- Script first: before hand-driving a page step by step, check `helpers/` and existing
  specs for a runnable version of the flow, and run that instead. If you catch yourself
  hand-driving the same look-then-click sequence a third time, stop and encode it as a
  helper or a spec.

## Where everything else lives

- `agent-docs/navigation.md`: where features live (routes, entry points, access). Stable.
- `agent-docs/patterns/`: how to drive them. One file per app area, pointing at runnable
  helpers, with end-to-end walkthroughs. Changes when the UI changes.
- `agent-docs/fragile-spots.md`: dated list of confusing failures and their workarounds.
  Check it before debugging anything that looks weird.
- `agent-docs/expected-noise.md`: dated list of console errors and warnings that mean
  nothing. Check it before flagging a console error as a finding.
- `agent-docs/evidence.md`: when a cheap check is enough and when to produce a full audit
  trail. Decide the tier before starting, not mid-task.
- `.claude/skills/qa-gen/SKILL.md`: the QA test generation workflow for Asana tasks.
- `scripts/verify-manifest.mjs` (`npm run qa:verify`): mechanical desktop+mobile matrix
  verification for every spec in `qa-manifest.yml`; stamps statuses and dates. Agents
  validate new specs on chromium only and leave the matrix to this script.

## Closing out any browser task

Before ending, write back what you learned. New tricky interaction: add it to the right
`agent-docs/patterns/` file, as runnable code or a pointer to code. New confusing
failure: add it to `fragile-spots.md` with today's date. New harmless console error: add
it to `expected-noise.md` with today's date. Update or delete entries you disproved.
This is part of finishing the task, not a separate cleanup phase.

## Browser lifecycle and sharing

Playwright launches and closes its own browsers; there is nothing to shut down manually.
The shared resources are the single QA account (protected by `--workers=1` plus
restore-state) and the in-app browser pane (identity check above). There is no collision
protocol yet on purpose: add one here, dated, the first time a real hang or collision
happens, based on what actually failed.
