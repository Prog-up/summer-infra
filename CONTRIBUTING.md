# Contributing & workflow

Two people, one evolving plan. This repo is set up so that **plan changes flow
through pull requests**, and the summariser keeps everyone in the loop
automatically.

## The loop

```
edit plan/  →  open PR  →  bot comments an AI preview on the PR
            →  review & merge to main  →  canonical changelog posted to Discord
```

- **On a pull request** that touches `plan/**.html`, the
  [`Plan update`](.github/workflows/plan-update.yml) workflow posts an **AI
  preview comment** on the PR (and writes it to the Actions run summary).
- **On merge to `main`**, the same workflow posts the **canonical changelog** to
  your Discord channel.

This means you get a review checkpoint *and* a clean, single Discord post per
landed change — no double-posting.

## Editing the plan

1. Branch off `main`:
   ```bash
   git switch -c plan/2026-w27
   ```
2. Edit `plan/index.html` (or add a dated snapshot like `plan/2026-w27.html`).
   Keep it self-contained HTML — inline `<style>` and `<svg>` diagrams are fine;
   the summariser strips them and works from the prose.
3. Push and open a PR. Read the preview comment, discuss, merge.

## Discussing & deciding (Discord bot)

- `/ask <question>` — brainstorm with Claude, grounded in the live plan
- `/idea add|list` — capture ideas (👍/👎 to vote)
- `/poll` — settle a decision
- `/todo add|list|done` — track follow-ups
- `/summary`, `/plan` — read the current state

See [bot/README.md](bot/README.md) to run it.

## Branch protection (one-time, manual)

So plan edits actually go through PRs, protect `main`. This is the one step that
needs an admin click (it can't be done from a committed file).

**UI:** Settings → Branches → **Add branch ruleset** (or "Add rule") →
target `main` → enable:
- ✅ Require a pull request before merging (reviews can be **0** for a 2-person
  repo, or 1 if you want mutual review)
- ✅ Require status checks to pass → add **`summarize`** (the workflow job)
- ✅ Require branches to be up to date before merging
- ✅ Block force pushes

**Or via the API** (needs a token with `repo` admin scope):
```bash
curl -X PUT \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/prog-up/summer-infra/branches/main/protection \
  -d '{
    "required_status_checks": { "strict": true, "contexts": ["summarize"] },
    "enforce_admins": false,
    "required_pull_request_reviews": { "required_approving_review_count": 0 },
    "restrictions": null
  }'
```

> Tip: if you set required reviews to 1 in a 2-person repo, enable
> "Allow specified actors to bypass" for yourselves, or each PR needs the other
> person online to approve.

## Local checks

```bash
npm install
node --check scripts/summarize-push.mjs   # syntax
# dry-run the summariser against your last commit (push mode):
AFTER_SHA=$(git rev-parse HEAD) BEFORE_SHA=$(git rev-parse HEAD~1) \
DISCORD_WEBHOOK_URL=... ANTHROPIC_API_KEY=... npm run summarize
```

Requires Node 20+.
