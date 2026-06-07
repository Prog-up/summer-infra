# Build context is the REPO ROOT (the bot imports shared code from ../../lib).
# Build & run from the repo root:
#   docker build -f bot/Dockerfile -t summer-infra-bot .
#   docker run --env-file bot/.env -v "$PWD/bot/data:/app/bot/data" summer-infra-bot
FROM node:20-slim

WORKDIR /app

# Install production deps using the root lockfile.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Shared library + bot source + a local fallback copy of the plan.
COPY lib ./lib
COPY bot ./bot
COPY plan ./plan

ENV NODE_ENV=production
# Persist /idea and /todo here; mount a volume to keep it across restarts.
ENV BOT_DATA_DIR=/app/bot/data

CMD ["node", "bot/src/index.mjs"]
