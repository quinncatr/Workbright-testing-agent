# QA agent container — runs the Asana-driven Playwright test generation sweep headlessly.
# Base image version MUST match @playwright/test in package.json (browsers are baked in).
FROM mcr.microsoft.com/playwright:v1.60.0-noble

RUN apt-get update \
    && apt-get install -y --no-install-recommends git jq curl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g @anthropic-ai/claude-code

# Claude Code runs as root inside this container; IS_SANDBOX tells it that is intentional
# (it refuses --dangerously-skip-permissions as root otherwise).
ENV IS_SANDBOX=1

COPY qa-sweep-prompt.md /agent/qa-sweep-prompt.md
COPY entrypoint.sh /agent/entrypoint.sh
RUN chmod +x /agent/entrypoint.sh

WORKDIR /work
ENTRYPOINT ["/agent/entrypoint.sh"]
