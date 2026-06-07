// /plan — table of contents of the current plan (no AI, instant).
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { loadPlanSections, planSourceUrl } from "../lib/plan.mjs";

export const data = new SlashCommandBuilder()
  .setName("plan")
  .setDescription("Affiche le sommaire du plan de projet actuel");

export async function execute(interaction) {
  await interaction.deferReply();
  const sections = await loadPlanSections({ force: true });
  const lines = sections
    .filter((s) => s.title)
    .map((s) => `**${s.num || "—"}** ${s.title}  _(${s.bullets.length} points)_`);

  const embed = new EmbedBuilder()
    .setColor(0x13565c)
    .setTitle("📐 Sommaire du plan")
    .setDescription(lines.join("\n").slice(0, 4096) || "Plan vide.")
    .setFooter({ text: `source : ${planSourceUrl()}` });

  await interaction.editReply({ embeds: [embed] });
}
