# plan/

The living project dossier. **`index.html` is the current version** — edit it
in place each week, or drop dated snapshots alongside it
(e.g. `2026-w27.html`).

Any `*.html` file you change here triggers the GitHub Action
(`.github/workflows/plan-update.yml`), which diffs the previous vs new version
and posts an AI changelog to Discord. The Discord bot's `/summary`, `/plan` and
`/ask` read `index.html` by default (configurable via `PLAN_PATH`).

Keep it as self-contained HTML (inline `<style>`, inline `<svg>` diagrams) —
the summariser strips styling and diagrams automatically and works from the
prose.
