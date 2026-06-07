#!/usr/bin/env node
// Runs in CI when the plan changes. For each changed plan HTML file it diffs the
// previous vs current version and produces a changelog (Claude, or a structural
// fallback). Delivery depends on the event:
//   - pull_request : posts a preview as a PR comment + the Actions run summary
//   - push (main)  : posts the canonical changelog to Discord + the run summary
//
// Env:
//   DISCORD_WEBHOOK_URL  Discord channel webhook (push mode)
//   ANTHROPIC_API_KEY    optional; enables AI summaries
//   BEFORE_SHA AFTER_SHA refs to diff between
//   PR_NUMBER            set in pull_request mode → PR-comment delivery
//   GITHUB_TOKEN         used to comment on the PR (provided by Actions)
//   GITHUB_REPOSITORY    "owner/name" (provided by Actions)
//   GITHUB_API_URL       provided by Actions (default api.github.com)
//   GITHUB_STEP_SUMMARY  file path; appended for the Actions run summary
//   PLAN_GLOB            prefix to watch, default "plan/"
//   REPO_URL             base repo URL for "view" links
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { htmlToText, fingerprint } from "../lib/html.mjs";
import { summarizeUpdate, getClient, countTokens } from "../lib/summarize.mjs";
import { postToWebhook } from "../lib/discord.mjs";

const PREFIX = process.env.PLAN_GLOB || "plan/";
const ZERO = "0000000000000000000000000000000000000000";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function showAt(ref, file) {
  if (!ref || ref === ZERO) return "";
  try {
    return execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8" });
  } catch {
    return "";
  }
}

function changedPlanFiles(before, after) {
  if (!before || before === ZERO) {
    return git(["ls-files", PREFIX])
      .split("\n")
      .filter((f) => f.endsWith(".html"));
  }
  const out = git(["diff", "--name-only", `${before}..${after}`, "--", PREFIX]);
  return out.split("\n").filter((f) => f && f.endsWith(".html"));
}

async function postPrComment(body) {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const pr = process.env.PR_NUMBER;
  if (!repo || !token || !pr) {
    console.warn("PR comment skipped (missing GITHUB_TOKEN/REPOSITORY/PR_NUMBER).");
    return;
  }
  const api = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
  const res = await fetch(`${api}/repos/${repo}/issues/${pr}/comments`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(`PR comment failed: ${res.status} ${await res.text()}`);
  console.log(`Posted PR comment on #${pr}.`);
}

function stepSummary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n\n");
  }
}

async function main() {
  const isPr = !!process.env.PR_NUMBER;
  const before = process.env.BEFORE_SHA || "";
  const after = process.env.AFTER_SHA || "HEAD";
  const repoUrl = (process.env.REPO_URL || "").replace(/\/$/, "");

  if (!isPr && !process.env.DISCORD_WEBHOOK_URL) {
    console.error("DISCORD_WEBHOOK_URL not set — nothing to post.");
    process.exit(0);
  }

  const files = changedPlanFiles(before, after);
  if (files.length === 0) {
    console.log("No plan files changed.");
    return;
  }
  console.log(`Mode: ${isPr ? "pull_request" : "push"}. Changed: ${files.join(", ")}`);

  const client = getClient();
  console.log(client ? "Using Claude for summaries." : "No API key — structural diff fallback.");

  const prSections = [];

  for (const file of files) {
    const beforeHtml = showAt(before, file);
    const afterHtml = existsSync(file) ? readFileSync(file, "utf8") : showAt(after, file);
    const beforeText = beforeHtml ? htmlToText(beforeHtml) : "";
    const afterText = afterHtml ? htmlToText(afterHtml) : "";

    if (beforeText && afterText && fingerprint(beforeText) === fingerprint(afterText)) {
      console.log(`Skipping ${file}: no content change after HTML strip.`);
      continue;
    }

    if (client) {
      const n = await countTokens(client, `${beforeText}\n${afterText}`);
      if (n) console.log(`${file}: ~${n} input tokens`);
    }

    const summary = await summarizeUpdate({ before: beforeText, after: afterText, fileName: file });
    const shortSha = (after || "").slice(0, 7);

    stepSummary(`### ${file}\n\n${summary}`);

    if (isPr) {
      prSections.push(`### \`${file}\`\n\n${summary}`);
    } else {
      await postToWebhook(process.env.DISCORD_WEBHOOK_URL, {
        title: `📐 Mise à jour du plan — ${file}`,
        url: repoUrl ? `${repoUrl}/blob/${after}/${file}` : undefined,
        body: summary,
        footer: shortSha ? `commit ${shortSha}` : undefined,
      });
      console.log(`Posted Discord summary for ${file}.`);
    }
  }

  if (isPr && prSections.length) {
    const body =
      "## 📐 Aperçu des changements de plan\n\n" +
      "_Résumé automatique de cette PR. Le changelog officiel sera posté sur Discord à la fusion sur `main`._\n\n" +
      prSections.join("\n\n---\n\n");
    await postPrComment(body);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
