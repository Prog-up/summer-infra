// Claude-powered summarisation of the project plan.
// - summarizeUpdate(): changelog of what changed between two versions of a plan file.
// - summarizePlan():  overview of the current plan (no diff).
// - askPlan():        brainstorm Q&A grounded in the current plan.
// Falls back to a structural diff when ANTHROPIC_API_KEY is absent.
import Anthropic from "@anthropic-ai/sdk";
import { extractSections } from "./html.mjs";

export const MODEL = "claude-opus-4-8";

/** Returns an Anthropic client, or null when no key is configured. */
export function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic();
}

// One shared call path. Streams (so long inputs/outputs don't hit timeouts)
// and returns the joined text blocks. Adaptive thinking + medium effort is a
// good balance for summarisation.
async function complete(client, { system, user, maxTokens = 2048, effort = "medium" }) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    thinking: { type: "adaptive" },
    output_config: { effort },
    messages: [{ role: "user", content: user }],
  });
  const msg = await stream.finalMessage();
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Optional: log roughly how big a prompt is. Never throws. */
export async function countTokens(client, text) {
  try {
    const r = await client.messages.countTokens({
      model: MODEL,
      messages: [{ role: "user", content: text }],
    });
    return r.input_tokens;
  } catch {
    return null;
  }
}

const SCRIBE = `You are the project scribe for a two-person educational \
infrastructure-as-code summer project (a self-managed Kubernetes / GitOps lab on \
Infomaniak's OpenStack cloud, run on an ephemeral apply/destroy budget model). \
Two friends push an evolving HTML project plan to a Git repo; your job is to keep \
them and their Discord server in the loop. Be concrete and technical — name the \
sections, tools, and decisions involved. Write in the language the plan is written \
in (French here). Output GitHub-flavoured markdown suitable for Discord.`;

/**
 * Changelog between two versions of a plan file.
 * before/after are plain text (from htmlToText). Either may be empty
 * (file added or removed).
 */
export async function summarizeUpdate({ before, after, fileName }) {
  const client = getClient();
  if (!client) return structuralDiff({ before, after, fileName });

  const kind = !before ? "NOUVEAU FICHIER" : !after ? "FICHIER SUPPRIMÉ" : "MISE À JOUR";
  const user = `Fichier de plan : \`${fileName}\` (${kind})

Résume ce qui a changé dans cette mise à jour du plan, pour un message Discord.
Format :
- une ligne **TL;DR** (l'essentiel en une phrase)
- des puces regroupées : nouvelles décisions, changements de périmètre, éléments retirés
- une courte section "🧠 À débattre" : 1 à 3 questions ouvertes que ce changement soulève
Reste sous ~350 mots. Si rien de substantiel n'a changé (cosmétique uniquement), dis-le simplement.

===== VERSION PRÉCÉDENTE =====
${before || "(le fichier n'existait pas)"}

===== VERSION ACTUELLE =====
${after || "(le fichier a été supprimé)"}`;

  return complete(client, { system: SCRIBE, user, maxTokens: 1600 });
}

/** Overview of the current plan (for the /summary command). */
export async function summarizePlan({ text }) {
  const client = getClient();
  if (!client) {
    return "⚠️ Pas de clé `ANTHROPIC_API_KEY` configurée — résumé IA indisponible.";
  }
  const user = `Voici le plan de projet actuel. Donne un résumé clair pour quelqu'un \
qui découvre le projet : objectif, architecture en 3-4 points, contraintes clés, et \
où en est la roadmap. Markdown, sous ~300 mots.

${text}`;
  return complete(client, { system: SCRIBE, user, maxTokens: 1400 });
}

/** Brainstorm Q&A grounded in the current plan (for the /ask command). */
export async function askPlan({ question, text }) {
  const client = getClient();
  if (!client) {
    return "⚠️ Pas de clé `ANTHROPIC_API_KEY` configurée — le brainstorm IA est indisponible.";
  }
  const system = `${SCRIBE}\n\nTu es aussi leur partenaire de brainstorming : \
pragmatique, tu proposes des compromis, tu signales les pièges (coût, sécurité, \
complexité), et tu restes ancré dans le plan ci-dessous. Réponse concise (< 1500 \
caractères pour Discord), markdown.`;
  const user = `Plan de projet actuel :\n\n${text}\n\n===== QUESTION =====\n${question}`;
  return complete(client, { system, user, maxTokens: 1200, effort: "high" });
}

// ---- Offline fallback: structural diff (no API key needed) -----------------

export function structuralDiff({ before, after, fileName }) {
  if (!before) return `📄 **${fileName}** — nouveau fichier de plan ajouté.`;
  if (!after) return `🗑️ **${fileName}** — fichier de plan supprimé.`;

  const a = sectionMap(before);
  const b = sectionMap(after);
  const lines = [`**Changements dans \`${fileName}\`** _(diff structurel — pas de clé IA)_`];

  const added = [...b.keys()].filter((k) => !a.has(k));
  const removed = [...a.keys()].filter((k) => !b.has(k));
  if (added.length) lines.push(`➕ Sections ajoutées : ${added.join(", ")}`);
  if (removed.length) lines.push(`➖ Sections retirées : ${removed.join(", ")}`);

  for (const [key, bSec] of b) {
    const aSec = a.get(key);
    if (!aSec) continue;
    const addB = bSec.bullets.filter((x) => !aSec.bullets.includes(x));
    const delB = aSec.bullets.filter((x) => !bSec.bullets.includes(x));
    if (addB.length || delB.length) {
      lines.push(`\n**${key}**`);
      addB.slice(0, 6).forEach((x) => lines.push(`  ➕ ${truncate(x, 160)}`));
      delB.slice(0, 6).forEach((x) => lines.push(`  ➖ ${truncate(x, 160)}`));
    }
  }
  if (lines.length === 1) lines.push("_Aucun changement de contenu détecté (édition cosmétique)._");
  return lines.join("\n");
}

function sectionMap(text) {
  // structuralDiff receives plain text, but extractSections needs HTML.
  // For the text path we approximate by splitting on the "## " headings
  // produced by htmlToText.
  const map = new Map();
  let cur = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      cur = { title: line.slice(3), bullets: [] };
      map.set(cur.title, cur);
    } else if (line.startsWith("- ") && cur) {
      cur.bullets.push(line.slice(2));
    }
  }
  return map;
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Re-export so callers can build section views without importing html.mjs too.
export { extractSections };
