// Discord bot entry point: loads slash commands and dispatches interactions.
import { readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { Client, Collection, GatewayIntentBits, Events, MessageFlags } from "discord.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var ${name}. See bot/.env.example.`);
    process.exit(1);
  }
  return v;
}
requireEnv("DISCORD_TOKEN");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

export async function loadCommands() {
  const dir = join(__dirname, "commands");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".mjs"));
  const commands = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(dir, file)).href);
    if (mod.data && mod.execute) {
      client.commands.set(mod.data.name, mod);
      commands.push(mod.data.toJSON());
    } else {
      console.warn(`Command ${file} is missing data/execute — skipped.`);
    }
  }
  return commands;
}

client.once(Events.ClientReady, (c) => {
  console.log(`Connecté en tant que ${c.user.tag}. Commandes : ${[...client.commands.keys()].join(", ")}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const msg = "❌ Une erreur est survenue. Réessaie dans un instant.";
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

await loadCommands();
await client.login(process.env.DISCORD_TOKEN);
