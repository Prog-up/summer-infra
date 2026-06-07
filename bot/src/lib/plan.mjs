// Loads the current plan HTML for the bot.
// Prefers a live source (GitHub raw URL) so the bot always reflects the latest
// push without redeploying; falls back to the local file in the repo.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { htmlToText, extractSections } from "../../../lib/html.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL = join(__dirname, "../../../plan/index.html");

// Cache so we don't refetch on every command. 5-minute TTL.
let cache = { at: 0, html: "" };
const TTL = 5 * 60 * 1000;

function rawUrl() {
  if (process.env.PLAN_RAW_URL) return process.env.PLAN_RAW_URL;
  const repo = process.env.GITHUB_REPOSITORY; // "owner/name"
  const branch = process.env.PLAN_BRANCH || "main";
  const path = process.env.PLAN_PATH || "plan/index.html";
  if (repo) return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
  return null;
}

/** Raw HTML of the current plan. */
export async function loadPlanHtml({ force = false } = {}) {
  if (!force && cache.html && Date.now() - cache.at < TTL) return cache.html;

  const url = rawUrl();
  if (url) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const html = await res.text();
        cache = { at: Date.now(), html };
        return html;
      }
      console.warn(`Plan fetch ${url} → ${res.status}; using local copy.`);
    } catch (e) {
      console.warn(`Plan fetch failed (${e.message}); using local copy.`);
    }
  }
  const html = await readFile(LOCAL, "utf8");
  cache = { at: Date.now(), html };
  return html;
}

export async function loadPlanText(opts) {
  return htmlToText(await loadPlanHtml(opts));
}

export async function loadPlanSections(opts) {
  return extractSections(await loadPlanHtml(opts));
}

export function planSourceUrl() {
  return rawUrl() || "fichier local plan/index.html";
}
