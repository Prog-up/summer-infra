// /ask <question> — brainstorm with Claude, grounded in the current plan.
import { SlashCommandBuilder } from "discord.js";
import { askPlan } from "../../../lib/summarize.mjs";
import { loadPlanText } from "../lib/plan.mjs";
import { sendLong } from "../lib/reply.mjs";

export const data = new SlashCommandBuilder()
  .setName("ask")
  .setDescription("Brainstorme avec l'IA sur le plan du projet")
  .addStringOption((o) =>
    o
      .setName("question")
      .setDescription("Ta question ou idée à creuser")
      .setRequired(true)
      .setMaxLength(1000),
  );

export async function execute(interaction) {
  await interaction.deferReply();
  const question = interaction.options.getString("question", true);
  const text = await loadPlanText();
  const answer = await askPlan({ question, text });
  await sendLong(interaction, {
    title: `🧠 ${question.slice(0, 240)}`,
    body: answer,
  });
}
