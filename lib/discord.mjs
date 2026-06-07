// Minimal Discord webhook poster used by the GitHub Action.
// Splits long markdown into embed-sized chunks (Discord caps embed
// descriptions at 4096 chars and allows up to 10 embeds per message).

const EMBED_LIMIT = 4000; // a little under 4096 for safety
const COLOR = 0x13565c; // petrol, matches the plan's cover

/** Split text into <=limit chunks, preferring paragraph then line boundaries. */
export function chunk(text, limit = EMBED_LIMIT) {
  const chunks = [];
  let buf = "";
  for (const para of text.split("\n")) {
    if (buf.length + para.length + 1 > limit) {
      if (buf) chunks.push(buf);
      // A single paragraph longer than the limit: hard-split it.
      if (para.length > limit) {
        for (let i = 0; i < para.length; i += limit) chunks.push(para.slice(i, i + limit));
        buf = "";
      } else {
        buf = para;
      }
    } else {
      buf = buf ? `${buf}\n${para}` : para;
    }
  }
  if (buf) chunks.push(buf);
  return chunks.length ? chunks : [""];
}

/**
 * Post a summary to a Discord webhook as one or more embeds.
 * @param {string} webhookUrl
 * @param {{title?:string, body:string, url?:string, footer?:string}} opts
 */
export async function postToWebhook(webhookUrl, { title, body, url, footer }) {
  if (!webhookUrl) throw new Error("Missing Discord webhook URL");
  const parts = chunk(body);
  // Up to 10 embeds per message; if more, send extra messages.
  for (let i = 0; i < parts.length; i += 10) {
    const slice = parts.slice(i, i + 10);
    const embeds = slice.map((description, j) => ({
      title: i === 0 && j === 0 ? title : undefined,
      url: i === 0 && j === 0 ? url : undefined,
      description,
      color: COLOR,
      footer: footer && i + j === parts.length - 1 ? { text: footer } : undefined,
    }));
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ embeds }),
    });
    if (!res.ok) {
      throw new Error(`Discord webhook failed: ${res.status} ${await res.text()}`);
    }
  }
}
