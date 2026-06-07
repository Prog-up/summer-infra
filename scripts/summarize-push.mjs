#!/usr/bin/env node
// Runs in CI on every push that touches the plan.
// For each changed plan HTML file it diffs the previous vs current version,
// asks Claude for a changelog (or falls back to a structural diff), and posts
// the result to Discord via a webhook.
//
// Env:
//   DISCORD_WEBHOOK_URL  (required) Discord channel webhook
//   ANTHROPIC_API_KEY    (optional) enables AI summaries
//   BEFORE_SHA AFTER_SHA (from the workflow: github.event.before/after)
//   PLAN_GLOB            (optional) prefix to watch, default "plan/"
//   REPO_URL            (optional) base repo URL for "view" links
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { htmlToText, fingerprint } from "../lib/html.mjs";
import { summarizeUpdate, getClient, countTokens } from "../lib/summarize.mjs";
import { postToWebhook } from "../lib/discord.mjs";

const PREFIX = process.env.PLAN_GLOB || "plan/";
const ZERO = "0000000000000000000000000000000000000000";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

/** Content of a file at a given ref, or "" if it didn't exist there. */
function showAt(ref, file) {
  if (!ref || ref === ZERO) return "";
  try {
    return execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8" });
  } catch {
    return "";
  }
}

/** Changed plan files between two SHAs (added/modified/deleted). */
function changedPlanFiles(before, after) {
  let range;
  if (!before || before === ZERO) {
    // New branch / first push: treat every tracked plan file as added.
    return git(["ls-files", PREFIX])
      .split("\n")
      .filter((f) => f.endsWith(".html"));
  }
  range = `${before}..${after}`;
  const out = git(["diff", "--name-only", range, "--", PREFIX]);
  return out.split("\n").filter((f) => f && f.endsWith(".html"));
}

async function main() {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    console.error("DISCORD_WEBHOOK_URL not set — nothing to post.");
    process.exit(0);
  }
  const before = process.env.BEFORE_SHA || "";
  const after = process.env.AFTER_SHA || "HEAD";
  const repoUrl = (process.env.REPO_URL || "").replace(/\/$/, "");

  const files = changedPlanFiles(before, after);
  if (files.length === 0) {
    console.log("No plan files changed.");
    return;
  }
  console.log(`Changed plan files: ${files.join(", ")}`);

  const client = getClient();
  console.log(client ? "Using Claude for summaries." : "No API key — structural diff fallback.");

  for (const file of files) {
    const beforeHtml = showAt(before, file);
    const afterHtml = existsSync(file) ? readFileSync(file, "utf8") : showAt(after, file);

    const beforeText = beforeHtml ? htmlToText(beforeHtml) : "";
    const afterText = afterHtml ? htmlToText(afterHtml) : "";

    // Skip cosmetic-only edits (identical extracted text).
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
    await postToWebhook(webhook, {
      title: `📐 Mise à jour du plan — ${file}`,
      url: repoUrl ? `${repoUrl}/blob/${after}/${file}` : undefined,
      body: summary,
      footer: shortSha ? `commit ${shortSha}` : undefined,
    });
    console.log(`Posted summary for ${file}.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
