// /todo add|list|done — lightweight shared task list.
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { addTodo, listTodos, setTodoDone } from "../lib/store.mjs";

export const data = new SlashCommandBuilder()
  .setName("todo")
  .setDescription("Liste de tâches partagée du projet")
  .addSubcommand((s) =>
    s
      .setName("add")
      .setDescription("Ajoute une tâche")
      .addStringOption((o) =>
        o.setName("texte").setDescription("La tâche").setRequired(true).setMaxLength(300),
      ),
  )
  .addSubcommand((s) => s.setName("list").setDescription("Affiche les tâches"))
  .addSubcommand((s) =>
    s
      .setName("done")
      .setDescription("Marque une tâche comme faite")
      .addIntegerOption((o) =>
        o.setName("id").setDescription("Numéro de la tâche").setRequired(true),
      ),
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId || "dm";

  if (sub === "add") {
    const text = interaction.options.getString("texte", true);
    const todo = await addTodo(guildId, { text, author: interaction.user.username });
    await interaction.reply(`✅ Tâche **#${todo.id}** ajoutée : ${text}`);
    return;
  }

  if (sub === "done") {
    const id = interaction.options.getInteger("id", true);
    const todo = await setTodoDone(guildId, id, true);
    await interaction.reply(
      todo ? `🎉 Tâche **#${id}** terminée : ${todo.text}` : `Tâche #${id} introuvable.`,
    );
    return;
  }

  const todos = await listTodos(guildId);
  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const fmt = (t) => `${t.done ? "~~" : ""}**#${t.id}** ${t.text}${t.done ? "~~" : ""} — _${t.author}_`;
  const body =
    (open.length ? `__À faire__\n${open.map(fmt).join("\n")}\n\n` : "") +
    (done.length ? `__Fait__\n${done.map(fmt).join("\n")}` : "");
  const embed = new EmbedBuilder()
    .setColor(0x0f7a45)
    .setTitle("🗒️ Tâches")
    .setDescription(body.slice(0, 4096) || "Aucune tâche. `/todo add` pour commencer.");
  await interaction.reply({ embeds: [embed] });
}
