// /idea add|list — capture brainstorm ideas.
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { addIdea, listIdeas } from "../lib/store.mjs";

export const data = new SlashCommandBuilder()
  .setName("idea")
  .setDescription("Capture et liste les idées de brainstorm")
  .addSubcommand((s) =>
    s
      .setName("add")
      .setDescription("Ajoute une idée")
      .addStringOption((o) =>
        o.setName("texte").setDescription("L'idée").setRequired(true).setMaxLength(500),
      ),
  )
  .addSubcommand((s) => s.setName("list").setDescription("Liste les idées"));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId || "dm";

  if (sub === "add") {
    const text = interaction.options.getString("texte", true);
    const idea = await addIdea(guildId, { text, author: interaction.user.username });
    const embed = new EmbedBuilder()
      .setColor(0xbd5d36)
      .setTitle(`💡 Idée #${idea.id}`)
      .setDescription(text)
      .setFooter({ text: `proposée par ${idea.author}` });
    await interaction.reply({ embeds: [embed] });
    // React so the team can vote it up.
    const msg = await interaction.fetchReply();
    await msg.react("👍").catch(() => {});
    await msg.react("👎").catch(() => {});
    return;
  }

  const ideas = await listIdeas(guildId);
  const body = ideas.length
    ? ideas.map((i) => `**#${i.id}** ${i.text} — _${i.author}_`).join("\n").slice(0, 4096)
    : "Aucune idée pour l'instant. `/idea add` pour commencer.";
  const embed = new EmbedBuilder().setColor(0xbd5d36).setTitle("💡 Idées").setDescription(body);
  await interaction.reply({ embeds: [embed] });
}
