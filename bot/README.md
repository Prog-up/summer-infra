# Discord bot — `summer-infra`

A small [discord.js](https://discord.js.org) bot that turns your Discord server
into the planning + brainstorming hub for the infra-as-code lab.

## Commands

| Command | What it does |
| --- | --- |
| `/summary` | Claude résumé of the current plan |
| `/plan` | Table of contents (sections) of the current plan — instant, no AI |
| `/ask <question>` | Brainstorm with Claude, grounded in the live plan |
| `/idea add\|list` | Capture ideas; each posted idea gets 👍/👎 for voting |
| `/poll` | Reaction poll (2–5 options) to settle a decision |
| `/todo add\|list\|done` | Shared task list |
| `/help` | Lists everything above |

The bot reads the **live** plan from GitHub raw (so it always reflects the
latest push), falling back to the bundled `plan/index.html`.

## Setup

1. Create an application + bot at <https://discord.com/developers/applications>.
   - Copy the **bot token** and the **application (client) ID**.
   - Under **Installation** / **OAuth2 → URL Generator**, give it the
     `bot` + `applications.commands` scopes and invite it to your server.
   - No privileged intents are required (the bot only uses slash commands).
2. From the **repo root**:
   ```bash
   npm install
   cp bot/.env.example bot/.env   # then fill it in
   ```
3. Register the slash commands (set `DISCORD_GUILD_ID` in `.env` for instant
   registration while developing):
   ```bash
   node --env-file bot/.env bot/src/deploy-commands.mjs
   ```
4. Run the bot:
   ```bash
   node --env-file bot/.env bot/src/index.mjs
   # or: npm run bot   (if your shell already exports the vars)
   ```

> `--env-file` needs Node 20+. On older Node, use a loader like `dotenv` or
> export the variables yourself.

## Docker

```bash
docker build -f bot/Dockerfile -t summer-infra-bot .
docker run --env-file bot/.env -v "$PWD/bot/data:/app/bot/data" summer-infra-bot
```

Or with Compose (persistent volume, auto-restart) from the repo root:

```bash
docker compose up -d --build
docker compose logs -f
# register/refresh slash commands:
docker compose run --rm bot node bot/src/deploy-commands.mjs
```

## Notes

- `/idea` and `/todo` persist to `bot/data/store.json`. On an ephemeral host
  this resets on restart — mount a volume (`BOT_DATA_DIR`) to keep it.
- Without `ANTHROPIC_API_KEY`, `/summary` and `/ask` report that AI is
  unavailable; everything else still works.
