// /summary — Claude overview of the current plan.
import { SlashCommandBuilder } from "discord.js";
import { summarizePlan } from "../../../lib/summarize.mjs";
import { loadPlanText, planSourceUrl } from "../lib/plan.mjs";
import { sendLong } from "../lib/reply.mjs";

export const data = new SlashCommandBuilder()
  .setName("summary")
  .setDescription("Résumé IA du plan de projet actuel");

export async function execute(interaction) {
  await interaction.deferReply();
  const text = await loadPlanText({ force: true });
  const summary = await summarizePlan({ text });
  await sendLong(interaction, {
    title: "📋 Résumé du plan",
    body: summary,
    footer: `source : ${planSourceUrl()}`,
  });
}
