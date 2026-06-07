// Turn the project plan HTML into clean text and a structured section list.
// The plan files are hand-written HTML with inline <svg> diagrams and <style>;
// we strip the noise and keep the prose so it can be diffed and summarised.
import { parse } from "node-html-parser";

/** Remove non-content nodes (style, script, svg diagrams) and parse. */
function clean(html) {
  const root = parse(html, {
    blockTextElements: { script: false, style: false, noscript: false },
  });
  for (const sel of ["style", "script", "noscript", "svg", "head"]) {
    root.querySelectorAll(sel).forEach((n) => n.remove());
  }
  return root;
}

/** Collapse whitespace in a piece of text. */
function squish(s) {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Whole-document plain text, readable and stable across cosmetic edits.
 * Used as the unit we feed to the model and diff between versions.
 */
export function htmlToText(html) {
  const root = clean(html);
  const lines = [];

  const title = root.querySelector("title")?.text;
  if (title) lines.push(`# ${squish(title)}`);

  // Cover blurb (lead paragraph) if present.
  const lead = root.querySelector("header .lead")?.text;
  if (lead) lines.push(squish(lead));

  for (const section of root.querySelectorAll("section")) {
    const num = section.querySelector(".secnum")?.text;
    const h2 = section.querySelector("h2")?.text;
    if (num || h2) lines.push(`\n## ${squish([num, h2].filter(Boolean).join(" — "))}`);

    // Walk direct prose blocks in order.
    for (const el of section.querySelectorAll("h3, p, li, figcaption, .callout, .card")) {
      // Skip elements that live inside a .card/.callout we already captured.
      const txt = squish(el.text);
      if (!txt) continue;
      const tag = el.tagName?.toLowerCase();
      if (tag === "h3") lines.push(`\n### ${txt}`);
      else if (tag === "li") lines.push(`- ${txt}`);
      else lines.push(txt);
    }
  }

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Structured sections: [{ num, title, bullets: [...], text }].
 * Used by the offline structural diff and the /plan command.
 */
export function extractSections(html) {
  const root = clean(html);
  const out = [];
  for (const section of root.querySelectorAll("section")) {
    const num = squish(section.querySelector(".secnum")?.text || "");
    const title = squish(section.querySelector("h2")?.text || "");
    const bullets = section
      .querySelectorAll("li")
      .map((li) => squish(li.text))
      .filter(Boolean);
    const paras = section
      .querySelectorAll("p")
      .map((p) => squish(p.text))
      .filter(Boolean);
    out.push({
      id: section.getAttribute("id") || "",
      num,
      title,
      bullets,
      text: [...paras, ...bullets].join("\n"),
    });
  }
  return out;
}

/** A cheap, dependency-free fingerprint so we can tell if content really changed. */
export function fingerprint(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return h.toString(36);
}
