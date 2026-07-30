# Evidence standard

Two tiers. Decide which tier a task needs before starting it, not in the moment.

## Tier 1: cheap check (the default)
For routine spec runs, exploration, and anything only the agent will act on: assertions
plus the list reporter output are enough. Failures already produce error-context
snapshots under `test-results/` and traces on CI retries. Do not generate screenshots
nobody asked for.

## Tier 2: audit trail (sign-off)
Required whenever a person will read and rely on the result: marking a manifest entry
verified or green for a deployed fix, posting results to an Asana task, or any explicit
sign-off before something ships.

For Playwright runs, rerun the passing spec with tracing on, which captures a screenshot
of every action automatically plus console and network:

    npx playwright test <spec> --project=<project> --workers=1 --trace on

The trace lands in `test-results/`; open it with `npx playwright show-trace <trace.zip>`.
This replaces hand-inserted screenshot calls in specs; do not add those.

For interactive (in-app browser) checks, take a real screenshot at each meaningful step
instead, since there is no trace.

Either way, write a short walkthrough that states, per step: what was being checked,
what was done, what was observed, and pass or fail, tied to the screenshot or trace
action it corresponds to. Put the walkthrough where the person will read it (the Asana
comment or the manifest `notes:`), with a pointer to the trace or screenshots.
