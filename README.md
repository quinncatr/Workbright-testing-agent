# workbright-testing-agent

## Local setup

1. Install dependencies:
   - `npx playwright install`

2. Create your environment file:

   Copy-Item .env.example .env

3. Set values for the `DOMAIN`, `EMAIL` and `PASSWORD` to .env

4. Run:
   - `npx playwright test`

## Testing Agent Docker Setup

1. Copy `.env.example` to `.env` and fill in:
   - `DOMAIN`, `EMAIL`, `PASSWORD` — QA environment + test account
   - `ANTHROPIC_API_KEY` — for the headless Claude agent
   - `ASANA_TOKEN` — your Asana personal access token (app.asana.com → Settings → Apps → Developer apps)

2. Build and verify:

   ```
   docker compose -f docker-compose.agent.yml build
   docker compose -f docker-compose.agent.yml run --rm qa-agent --check
   ```

3. Run:

   ```
   # Sweep the default board 
   docker compose -f docker-compose.agent.yml run --rm qa-agent

   # Sweep a different board/section/tag (set in .env or inline)
   QA_PROJECT_GID=1215576041936942 QA_TAG_NAME=Test docker compose -f docker-compose.agent.yml run --rm qa-agent

   # Process one specific Asana task
   docker compose -f docker-compose.agent.yml run --rm qa-agent 1216798217670813
   ```

The agent applies the visible change to each uncovered task (see `.claude/skills/qa-gen/SKILL.md`), writes specs to `tests/qa/asana-<gid>-<slug>.spec.ts`, runs them against QA, and updates `qa-manifest.yml`. 
