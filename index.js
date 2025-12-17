// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  Events
} from "discord.js";

import fs from "fs";
import fetch from "node-fetch";
import http from "http";

// =====================
// ENV
// =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const LONGCAT_API = process.env.LONGCAT_API;

// =====================
// CLIENT
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
const memory = new Map();

// =====================
// LOAD FILES
// =====================
const tosServers = fs.existsSync("tos.json")
  ? JSON.parse(fs.readFileSync("tos.json", "utf8"))
  : [];

const rawCmds = JSON.parse(fs.readFileSync("cmd.json", "utf8"));
const slashCommands = [];

for (const cmd of rawCmds) {
  slashCommands.push({
    name: cmd.name,
    description: cmd.description,
    options: cmd.options ?? []
  });
  client.commands.set(cmd.name, cmd);
}

// =====================
// REGISTER SLASH
// =====================
async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: slashCommands }
  );
  console.log("✅ Slash commands registrados");
}

// =====================
// LONGCAT AI
// =====================
async function longcatAI(message, userId) {
  console.log("🤖 IA llamada");

  const history = memory.get(userId) ?? [];
  history.push({ role: "user", content: message });

  const res = await fetch(
    "https://api.longcat.chat/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LONGCAT_API}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "LongCat-Flash-Chat",
        messages: [
          { role: "system", content: "Eres Softi, kawaii y amable." },
          ...history
        ]
      })
    }
  );

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content ?? "💖";

  history.push({ role: "assistant", content: reply });
  memory.set(userId, history.slice(-10));
  return reply;
}

// =====================
// UTIL CANAL
// =====================
function limpiarNombre(nombre) {
  return nombre.toLowerCase().replace(/[^a-z0-9\s-]/g, "");
}

function buscarCanal(guild, palabras) {
  return guild.channels.cache.find(c => {
    if (!c.isTextBased()) return false;
    const limpio = limpiarNombre(c.name);
    return palabras.some(p => limpio.includes(p));
  });
}

// =====================
// BIENVENIDA / DESPEDIDA
// =====================
const bienvenida = [
  m => `🌸 Bienvenido/a ${m} 💖`,
  m => `✨ ${m} llegó al server ✨`
];

const despedida = [
  m => `💔 ${m} se fue…`,
  m => `🕊️ Hasta luego ${m}`
];

client.on(Events.GuildMemberAdd, member => {
  console.log("➕ Nuevo miembro");
  const canal = buscarCanal(member.guild, ["bienvenido", "welcome"]);
  if (!canal) return;

  const msg = bienvenida[Math.floor(Math.random() * bienvenida.length)];
  canal.send(msg(member.user));
});

client.on(Events.GuildMemberRemove, member => {
  console.log("➖ Miembro salió");
  const canal = buscarCanal(member.guild, ["bye", "salida"]);
  if (!canal) return;

  const msg = despedida[Math.floor(Math.random() * despedida.length)];
  canal.send(msg(member.user));
});

// =====================
// SLASH HANDLER (CLAVE)
// =====================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  console.log("⚡ Slash usado:", interaction.commandName);

  // TOS check
  if (!tosServers.includes(interaction.guildId)) {
    return interaction.reply({
      content: "📜 Debes aceptar el TOS primero",
      ephemeral: true
    });
  }

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await interaction.reply(cmd.response ?? "✨");
  } catch (e) {
    console.error(e);
    interaction.reply("❌ Error");
  }
});

// =====================
// MENSAJES IA
// =====================
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;
  if (!msg.mentions.has(client.user)) return;

  console.log("💬 IA mencionada");

  const reply = await longcatAI(msg.content, msg.author.id);
  msg.reply(reply);
});

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`🦊 Softi lista como ${client.user.tag}`);
  await registerSlashCommands();
});

// =====================
// 24/7
// =====================
http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Softi viva 💖");
}).listen(process.env.PORT || 3000);

client.login(TOKEN);
