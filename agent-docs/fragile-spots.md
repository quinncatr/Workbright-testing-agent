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

## 2026-07-30 (pre-existing): Cloudflare WAF challenge on QA
The QA env is behind a Cloudflare managed challenge. Test traffic bypasses it with the
`X-WB-Test-Bypass` header (value from `CF_BYPASS_TOKEN`), applied to every request in
`playwright.config.ts`. A browser session without the header can get challenged. That is
the environment, not an app bug; do not attempt to solve the challenge.
