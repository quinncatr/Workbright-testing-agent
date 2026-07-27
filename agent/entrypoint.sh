#!/bin/sh
# Entrypoint for the containerized QA agent.
# Usage (via docker compose -f docker-compose.agent.yml):
#   run qa-agent                 -> sweep the configured project/section (or tag)
#   run qa-agent <asana-gid>     -> process exactly one task
#   run qa-agent --check         -> validate environment and exit (no API calls)
set -e

cd /work

check_env() {
  ok=1
  if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    echo "MISSING: ANTHROPIC_API_KEY (or CLAUDE_CODE_OAUTH_TOKEN)"; ok=0
  fi
  [ -z "$ASANA_TOKEN" ] && { echo "MISSING: ASANA_TOKEN (Asana personal access token)"; ok=0; }
  [ -z "$DOMAIN" ] && { echo "MISSING: DOMAIN (QA env domain)"; ok=0; }
  [ -z "$EMAIL" ] && { echo "MISSING: EMAIL (QA test account)"; ok=0; }
  [ -z "$PASSWORD" ] && { echo "MISSING: PASSWORD (QA test account)"; ok=0; }
  [ "$ok" = "1" ]
}

if [ "$1" = "--check" ]; then
  echo "node:       $(node --version)"
  if [ -x node_modules/.bin/playwright ]; then
    echo "playwright: $(node_modules/.bin/playwright --version)"
  else
    echo "playwright: not installed yet (npm ci runs on first real run)"
  fi
  echo "claude:     $(claude --version)"
  if check_env; then echo "env:        OK"; else echo "env:        INCOMPLETE (see above)"; exit 1; fi
  exit 0
fi

check_env || { echo "Set the missing variables in .env (see .env.example)."; exit 1; }

# The repo is volume-mounted from the host; node_modules lives in a container-side named
# volume (host node_modules may be Windows/macOS-flavored). Install if empty.
if [ ! -x node_modules/.bin/playwright ]; then
  echo "Installing npm dependencies (first run on this volume)..."
  npm ci --no-audit --no-fund
fi

PROMPT="$(cat /agent/qa-sweep-prompt.md)"
if [ -n "$1" ]; then
  PROMPT="$PROMPT

SINGLE-TASK MODE: process ONLY Asana task GID $1. Ignore project/section/tag selection."
fi

exec claude -p "$PROMPT" \
  --dangerously-skip-permissions \
  ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"}
