---
name: qa-gen
description: Act as a QA engineer for an Asana task that moved to QA. Apply the visible-change gate; if the task's change is user-observable in the browser, write a Playwright spec against the QA env that reaches the change and verifies it, and record it in qa-manifest.yml. If not, record a skip. Use when a task reaches the QA section of the Engineering Lifecycle project, or when the user runs /qa-gen <asana-task-gid>.
---

# QA test generation (visible-change only)

Input: an Asana task GID (e.g. `1214649321828179`). If none was given, ask for it.

You are acting as a QA engineer. Everything happens in this repo
(`C:\Users\Quinn\workbright-testing-agent`). **Never create or modify anything in the Rails-App
repo** — it may be read as reference (selectors, validation rules, routes), but live-DOM
discovery against QA is preferred. Reference spec:
[tests/name-whitespace-normalization.spec.ts](../../../tests/name-whitespace-normalization.spec.ts).

## Steps

1. **Idempotency check.** If the GID already has an entry in `qa-manifest.yml` (spec or skip),
   stop and report it. Do not regenerate unless the user asks.

2. **Read the Asana task.** Asana MCP `get_task` (+ `get_attachments` if needed): name,
   acceptance criteria, comments, Dev Stage, linked PR/branch. If Asana MCP is unavailable,
   ask the user to paste the task details.

3. **Apply the visible-change gate.** Act only if the acceptance criteria describe a change a
   user can observe in the browser on the QA env (page content, form behavior, navigation,
   validation, persisted values shown in the UI). Skip and record in the manifest
   (`gate: skipped`, with `reason:`) anything that is: back-end-only, email/SMS content (QA has
   no outbound capture), jobs/integrations without UI surface, spikes/investigations,
   admin-internal tooling the test account can't reach, or copy that never renders in the app.
   When skipping, report the reason to the user — a recorded skip is a complete, correct outcome.

4. **Plan the verification like a QA engineer.** From the acceptance criteria, define: the
   route/flow that reaches the change, the action that exercises it, and the literal expected
   outcome. Prefer asserting persisted state after a reload over transient UI feedback.

5. **Ground selectors in the real DOM.** Sign in to the QA env (creds in `.env`: `DOMAIN`,
   `EMAIL`, `PASSWORD`) and inspect the actual pages before writing selectors — via the
   in-app browser, or `npx playwright codegen`, or a throwaway spec run. Do not invent
   selectors from imagination. Rails-App views/JS may be read to confirm names and IDs.

6. **Write the spec**: `tests/qa/asana-<gid>-<slug>.spec.ts`.
   - Header comment: Asana URL + GID + task name, the acceptance criteria being verified, and
     the run command.
   - Reuse `helpers/` (`signIn` in `i9-flow.ts`, etc.). Chromium only, `--workers=1` (single
     shared QA account) — guard with a `test.skip` on other projects like the reference spec.
   - Assert the approved behavior **literally** (exact values/copy), not loose matchers.
   - Leave the shared account the way you found it (restore any data the test changed).
   - If the fix is not yet deployed to QA (Dev Stage before "Ready to Release"), the spec is
     expected to FAIL — that is correct QA behavior. Note `status: red-until-deployed` in the
     manifest instead of weakening assertions.

7. **Update `qa-manifest.yml`**: GID, name, Asana URL, `gate:`, `spec:`, `run:`,
   `generated_on:`, `status:`, `notes:`.

8. **Run the spec** (`npx playwright test <spec> --project=chromium --workers=1`) and report
   the result honestly: green = change verified on QA; red on an undeployed fix = expected;
   red on a deployed fix = QA failure, flag it. If QA is unreachable, say so — never claim a
   result you didn't observe.

9. **Report.** Gate decision, what the spec drives and asserts, run output, manifest entry.
   Offer (do not do automatically): commit on branch `qa/asana-<gid>`, post results to the
   Asana task.
