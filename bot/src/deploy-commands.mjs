// Registers slash commands with Discord. Run once after adding/changing commands:
//   node bot/src/deploy-commands.mjs
// Set DISCORD_GUILD_ID for instant per-guild registration during development;
// omit it to register globally (can take up to an hour to propagate).
import { readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { REST, Routes } from "discord.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required. See bot/.env.example.");
  process.exit(1);
}

const dir = join(__dirname, "commands");
const files = (await readdir(dir)).filter((f) => f.endsWith(".mjs"));
const commands = [];
for (const file of files) {
  const mod = await import(pathToFileURL(join(dir, file)).href);
  if (mod.data) commands.push(mod.data.toJSON());
}

const rest = new REST().setToken(token);
const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

const data = await rest.put(route, { body: commands });
console.log(
  `Enregistré ${data.length} commande(s) ${guildId ? `sur le serveur ${guildId}` : "globalement"} : ${commands
    .map((c) => c.name)
    .join(", ")}`,
);
