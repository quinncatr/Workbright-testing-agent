# Patterns: employee profile

Runnable reference: `tests/qa/asana-1216798217670813-name-whitespace-trim.spec.ts`.

## Edit fields and verify persisted values
1. Go to `/user/profile`; wait for `#employee_profile_first_name` to be visible.
2. Fill the `employee_profile[...]` inputs, click the `Update Profile` button.
3. No deterministic save-completion signal has been found yet; the current pattern waits
   about 2.5 s, then reloads the page. Assert field values after the reload so you are
   reading persisted server state, not what you typed.
4. Restore any fields the test changed (shared account).
