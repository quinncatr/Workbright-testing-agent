# Expected noise (dated)

Console errors, warnings, and other signals that appear routinely and mean nothing.
Check here before reporting a console error as a finding. Add an entry the first time a
false alarm gets investigated, so it never gets re-investigated. Re-verify entries older
than a few months before relying on them.

Format for new entries:

## YYYY-MM-DD: short name
Where it appears, the exact message (or a stable prefix of it), why it is harmless, and
what change would make it worth re-checking.

## 2026-07-30: transient 422 on POST /i9_submission mid-wizard
During the I-9 wizard, one or two `422 Unprocessable Entity` responses to
`POST /i9_submission` can appear in the network log before the final successful submit.
Observed on chromium, mobile-chrome, and mobile-safari during the 2026-07-30 container
sweep; looks like an autosave/partial-validation ping, and it never blocked completion.
Harmless as long as the final submission succeeds. Worth re-checking if a submission
actually fails or if the 422s start appearing on the final Finish click itself.
