# Fragile spots (dated)

Confusing failures and their workarounds. Check here before debugging anything that
looks weird. Trust recent entries outright; re-verify entries older than a few months
before relying on them. Add an entry the first time something breaks in a confusing way,
the same day, with the date.

## 2026-07-30: datepicker click picks an invalid date
`enterPassportDetails` used to open the expiration datepicker and click day "30" of the
current month. On or after the 30th that selects today or a past date, the app rejects
it ("Document must be unexpired, date must be be after today"), and the run fails later
at a step that looks unrelated (stuck on Upload with a generic "problem with your form"
banner). Fix: fill the input directly with a future date (`12/31/2030`). Assume the same
for any datepicker-backed field.

## 2026-07-30: fixed-coordinate canvas click fails on mobile
`signForm` used to click the signature canvas at x=511. On mobile viewports the canvas
is narrower than that, so the interaction fails. The reported error was misleading
("waiting for locator('canvas')") because the real blocker was the upstream form
rejection above; the flow never reached the signature step. Fix: stroke relative to
`boundingBox()` (see patterns/i9.md). Lesson: read the error-context snapshot in
`test-results/` before trusting the locator error message.

## 2026-07-30 (pre-existing, encoded in code): stale 404 entering the I-9 wizard
Starting a resubmission sometimes lands on an old 404. `startI9` (`helpers/i9-flow.ts`)
recovers by navigating back to the origin, waiting about 2.5 s, and retrying, up to 3
attempts. Symptom: the Citizenship heading never appears right after entry.

## 2026-07-30: single-sweep mouse stroke does not register on the signature pad
In the containerized headless run, `signForm`'s stroke (one `mouse.move` with
`steps: 10`) left the canvas empty and the submission blocked on "Please sign this
form", confirmed via screenshot. The same flow worked on a Windows host. The pad needs
many discrete pointer events: draw with a segmented stroke (a loop of ~20 short
`mouse.move` calls), as `drawSignature` in `helpers/i9-flow.ts` does. `signForm` in
`helpers/i9.ts` now uses the same segmented stroke. If a signature silently fails to
register, check the stroke granularity first.

## 2026-08-05: PowerShell 5.1 strips `--` before npm, so npm swallows script flags
`npm run qa:verify -- --gid <gid>` fails on Windows PowerShell: PS 5.1 drops the bare
`--`, npm then parses `--gid`/`--desktop-only` as its own config (warns "Unknown cli
config") and forwards only the bare value. Symptom: the script rejects your flag or
ignores it entirely. Workarounds: call `node scripts/verify-manifest.mjs --gid <gid>`
directly, or pass bare GIDs (`npm run qa:verify 123,456` — the script accepts numeric
positional args for exactly this reason). Applies to any `npm run <script> -- --flag`
invocation from PowerShell 5.1, not just this script.

## 2026-08-10: containerized sweep replied "What would you like to work on?"
One `docker compose run --rm qa-agent` invocation returned only "What would you like to
work on? I don't see a specific request in your message yet." — the model acting as if
the prompt were empty. Diagnosis found nothing wrong: the baked prompt file was intact
in the image, a PATH shim over `claude` showed the entrypoint passing exactly
`-p <full 5.8KB prompt> --dangerously-skip-permissions`, short and ~6KB positional
prompts both round-tripped fine, and the model summarized the real sweep prompt
correctly when re-sent. Not reproducible; treated as a one-off (stale pre-rebuild image
or a transient model fumble). If it recurs: rerun once; if it persists, shim `claude`
with a script that echoes its argv to confirm delivery, then capture the run with a
short test prompt. Note: the entrypoint now prefers the repo-mounted
`/work/agent/qa-sweep-prompt.md` over the baked copy, so prompt edits no longer need an
image rebuild (a change to entrypoint.sh itself still does).

## 2026-07-30 (pre-existing): Cloudflare WAF challenge on QA
The QA env is behind a Cloudflare managed challenge. Test traffic bypasses it with the
`X-WB-Test-Bypass` header (value from `CF_BYPASS_TOKEN`), applied to every request in
`playwright.config.ts`. A browser session without the header can get challenged. That is
the environment, not an app bug; do not attempt to solve the challenge.
