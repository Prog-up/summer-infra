// Dead-simple JSON store for brainstorm ideas and to-dos, keyed per guild.
// Note: this writes to bot/data/store.json on the bot host. On an ephemeral
// container it won't survive a restart — mount a volume / persist the file if
// you want durability (see bot/README.md).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BOT_DATA_DIR || join(__dirname, "../../data");
const FILE = join(DATA_DIR, "store.json");

async function read() {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return { guilds: {} };
  }
}

async function write(db) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(db, null, 2));
}

function guild(db, id) {
  db.guilds[id] ||= { ideas: [], todos: [], nextId: 1 };
  return db.guilds[id];
}

export async function addIdea(guildId, { text, author }) {
  const db = await read();
  const g = guild(db, guildId);
  const idea = { id: g.nextId++, text, author, at: Date.now() };
  g.ideas.push(idea);
  await write(db);
  return idea;
}

export async function listIdeas(guildId) {
  const db = await read();
  return guild(db, guildId).ideas;
}

export async function addTodo(guildId, { text, author }) {
  const db = await read();
  const g = guild(db, guildId);
  const todo = { id: g.nextId++, text, author, done: false, at: Date.now() };
  g.todos.push(todo);
  await write(db);
  return todo;
}

export async function setTodoDone(guildId, id, done = true) {
  const db = await read();
  const g = guild(db, guildId);
  const todo = g.todos.find((t) => t.id === id);
  if (todo) {
    todo.done = done;
    await write(db);
  }
  return todo;
}

export async function listTodos(guildId) {
  const db = await read();
  return guild(db, guildId).todos;
}
