# summer-infra — planning hub for a self-managed Kubernetes / IaC summer lab

This repo is the **planning environment** for a two-person educational project:
building, operating and tearing down a complete self-managed Kubernetes platform
on Infomaniak's OpenStack public cloud — control plane included — driven entirely
by Infrastructure-as-Code and GitOps, on an ephemeral `apply`/`destroy` budget
model. The full project dossier lives in [`plan/index.html`](plan/index.html).

It does two things:

1. **Versions the plan.** You push the evolving HTML dossier to `plan/`. Every
   push that changes it triggers a GitHub Action that **summarises what changed**
   and posts the changelog to your Discord channel.
2. **Powers brainstorming.** A Discord bot lets you query the plan, ask Claude
   questions grounded in it, capture ideas, run polls, and track to-dos.

```
            push plan/index.html
  you ──────────────────────────────►  GitHub
                                          │
                          GitHub Action (.github/workflows/plan-update.yml)
                                          │  diff old vs new → Claude summary
                                          ▼
                                    Discord channel  ◄──────────┐
                                          ▲                     │
                            /ask /summary /plan /idea /poll /todo│
                                          │                     │
                                    Discord bot (bot/) ─────────┘
                                          │ reads live plan from GitHub raw
                                          ▼
                                  Claude API (claude-opus-4-8)
```

## Layout

| Path | Purpose |
| --- | --- |
| `plan/index.html` | The current project dossier — edit/replace this weekly |
| `lib/` | Shared code: HTML→text, Claude summarisation, Discord webhook |
| `scripts/summarize-push.mjs` | Run by the Action on each push |
| `.github/workflows/plan-update.yml` | Push → summarise → Discord |
| `bot/` | The Discord brainstorming bot ([bot/README.md](bot/README.md)) |

## Weekly workflow

1. Branch off `main` and edit `plan/index.html` (or add a dated snapshot like
   `plan/2026-w27.html`).
2. Open a PR — the bot comments an **AI preview** of the changes for review.
3. Merge to `main` — the **canonical changelog** posts to Discord.
4. Discuss in Discord with `/ask`, `/idea`, `/poll`. Decisions become `/todo`s.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full flow and how to protect
`main` so edits go through PRs.

## Setup (one-time)

### 1. Discord webhook (for push summaries)
Server Settings → Integrations → Webhooks → New Webhook → copy the URL.

### 2. Repo secrets
In **Settings → Secrets and variables → Actions**, add:
- `DISCORD_WEBHOOK_URL` — the webhook from step 1 *(required)*
- `ANTHROPIC_API_KEY` — your Claude API key *(optional; without it the Action
  posts a plain structural diff instead of an AI summary)*

### 3. The bot
See [bot/README.md](bot/README.md) — create a Discord app, fill `bot/.env`,
register commands, and run it.

## How the summaries work

`lib/summarize.mjs` calls Claude (`claude-opus-4-8`, adaptive thinking) with the
previous and current plain-text of each changed plan file and asks for a concise,
French, Discord-ready changelog with a "🧠 À débattre" section of open questions.
SVG diagrams and styling are stripped first (`lib/html.mjs`) so the model sees the
prose, and cosmetic-only edits are skipped. No API key → deterministic structural
diff fallback, so the pipeline never hard-fails.

The workflow runs on **pull requests** (posts the summary as a PR comment +
Actions run summary) and on **push to `main`** (posts to Discord) — so PRs get a
review preview and Discord gets one clean post per landed change.

## Local development

```bash
npm install
# dry-run the push summariser against your last commit:
AFTER_SHA=$(git rev-parse HEAD) BEFORE_SHA=$(git rev-parse HEAD~1) \
DISCORD_WEBHOOK_URL=... ANTHROPIC_API_KEY=... npm run summarize
```

Requires Node 20+.
