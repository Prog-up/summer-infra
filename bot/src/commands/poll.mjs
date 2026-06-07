// /poll — quick reaction poll for team decisions (up to 5 options).
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

const EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];

const data = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Crée un sondage à réactions pour une décision")
  .addStringOption((o) =>
    o.setName("question").setDescription("La question").setRequired(true).setMaxLength(256),
  );
for (let i = 1; i <= 5; i++) {
  data.addStringOption((o) =>
    o.setName(`option${i}`).setDescription(`Option ${i}`).setRequired(i <= 2).setMaxLength(100),
  );
}
export { data };

export async function execute(interaction) {
  const question = interaction.options.getString("question", true);
  const options = [];
  for (let i = 1; i <= 5; i++) {
    const v = interaction.options.getString(`option${i}`);
    if (v) options.push(v);
  }
  const desc = options.map((o, i) => `${EMOJI[i]} ${o}`).join("\n");
  const embed = new EmbedBuilder()
    .setColor(0x2b5dd1)
    .setTitle(`🗳️ ${question}`)
    .setDescription(desc)
    .setFooter({ text: `lancé par ${interaction.user.username}` });

  await interaction.reply({ embeds: [embed] });
  const msg = await interaction.fetchReply();
  for (let i = 0; i < options.length; i++) {
    await msg.react(EMOJI[i]).catch(() => {});
  }
}
