# Navigation reference: where things are

Where features live and who can reach them. This file changes when routes change, not
when the UI changes; how to drive each page lives in `patterns/`. The source of truth
for routes is the Rails-App router (read-only reference).

Environment: one QA tier. Origin comes from `DOMAIN` in `.env`. One test account
(employee role), credentials in `.env`.

| Feature | Route / entry point | Access |
|---|---|---|
| Sign in | `/users/sign_in` | public |
| Employee dashboard | `/` after sign-in; contains the `View/Change` link | test account |
| Employee profile (name fields) | `/user/profile` | test account |
| I-9 wizard | from dashboard: `View/Change`, then `Resubmit`, then confirm; URL matches `/submission/new` | test account |

Add a row the first time a new area gets touched. The moment a second environment or a
second login exists, split this into one section per environment, keep credentials in
clearly separate `.env` keys (for example `QA_...` and `STAGING_...`), and never assume
quirks or sessions carry over between them.
