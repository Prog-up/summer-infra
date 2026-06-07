---
name: "🚀 Quick-start setup checklist"
about: One-time setup to get the plan summariser and Discord bot running
title: "Setup: get the planning environment live"
labels: ["setup"]
---

Work through these once. See `README.md`, `bot/README.md` and `CONTRIBUTING.md`
for details.

## Discord
- [ ] Create a channel webhook (Server Settings → Integrations → Webhooks)
- [ ] Create a bot app at https://discord.com/developers/applications
- [ ] Invite the bot with the `bot` + `applications.commands` scopes

## Repo secrets (Settings → Secrets and variables → Actions)
- [ ] `DISCORD_WEBHOOK_URL` (required — push summaries)
- [ ] `ANTHROPIC_API_KEY` (optional — enables AI summaries)

## Run the bot
- [ ] `npm install`
- [ ] `cp bot/.env.example bot/.env` and fill it in
- [ ] `node bot/src/deploy-commands.mjs` (register slash commands)
- [ ] `node bot/src/index.mjs` (or `docker compose up -d --build`)
- [ ] Try `/help` and `/summary` in Discord

## Branch protection (so plan edits go through PRs)
- [ ] Protect `main` per `CONTRIBUTING.md` → require PR + the `summarize` check

## Smoke test
- [ ] Open a PR editing `plan/index.html` → confirm the AI preview comment
- [ ] Merge it → confirm the changelog lands in Discord
