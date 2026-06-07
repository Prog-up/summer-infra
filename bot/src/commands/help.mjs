// /help — list what the bot can do.
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Que peut faire le bot ?");

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x13565c)
    .setTitle("🤖 Bot du projet infra-as-code")
    .setDescription(
      [
        "**Suivi du plan**",
        "`/summary` — résumé IA du plan actuel",
        "`/plan` — sommaire (sections) du plan",
        "_Chaque push sur `plan/**.html` poste automatiquement un résumé des changements._",
        "",
        "**Brainstorm**",
        "`/ask <question>` — pose une question à l'IA, ancrée dans le plan",
        "`/idea add|list` — capture et liste les idées (votables 👍/👎)",
        "`/poll` — sondage à réactions pour trancher",
        "",
        "**Organisation**",
        "`/todo add|list|done` — tâches partagées",
      ].join("\n"),
    );
  await interaction.reply({ embeds: [embed] });
}
