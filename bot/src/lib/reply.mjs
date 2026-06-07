// Helper to send possibly-long markdown back from a slash command as embeds.
import { chunk } from "../../../lib/discord.mjs";

const COLOR = 0x13565c;

/**
 * Reply to a (already-deferred) interaction with long markdown, split into
 * embed-sized pieces. First call edits the deferred reply; the rest follow up.
 */
export async function sendLong(interaction, { title, body, url, footer }) {
  const parts = chunk(body, 4000);
  const embeds = parts.map((description, i) => ({
    title: i === 0 ? title : undefined,
    url: i === 0 ? url : undefined,
    description,
    color: COLOR,
    footer: i === parts.length - 1 && footer ? { text: footer } : undefined,
  }));

  // Discord allows up to 10 embeds per message.
  const first = embeds.slice(0, 10);
  await interaction.editReply({ embeds: first });
  for (let i = 10; i < embeds.length; i += 10) {
    await interaction.followUp({ embeds: embeds.slice(i, i + 10) });
  }
}
