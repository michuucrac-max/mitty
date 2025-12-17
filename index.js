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
  Events,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
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

// =====================
// MEMORY IA
// =====================
const memory = new Map();

// =====================
// TOS MEMORY
// =====================
let tosServers = [];
try {
  tosServers = JSON.parse(fs.readFileSync("tos.json", "utf8"));
} catch {
  tosServers = [];
}

// =====================
// LOAD COMMANDS
// =====================
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
}

// =====================
// LONGCAT AI
// =====================
async function longcatAI(message, userId) {
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
          {
            role: "system",
            content:
              "Eres Softi, una IA kawaii, dulce y amable. Hablas bonito sin exagerar."
          },
          ...history
        ]
      })
    }
  );

  const data = await res.json();
  let reply = data?.choices?.[0]?.message?.content ?? "Entendido 💖";
  reply = reply.replace(/\*/g, "");

  history.push({ role: "assistant", content: reply });
  memory.set(userId, history.slice(-10));
  return reply;
}

// =====================
// SEARCH CHANNEL (ARREGLADO)
// =====================
function limpiarNombre(nombre) {
  return nombre
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ""); // quita emojis y símbolos
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
const mensajesBienvenida = [
  m => `🌸 ¡Bienvenido/a ${m}! Softi te manda un abracito 💖`,
  m => `✨ ${m} llegó al server ✨`,
  m => `🦊 Softi dice hola a ${m} 💕`,
  m => `💫 Nueva personita detectada: ${m}`
];

const mensajesDespedida = [
  m => `💔 ${m.user.username} se fue…`,
  m => `✨ Hasta luego ${m.user.username}`,
  m => `🕊️ ${m.user.username} salió del server`
];

client.on("guildMemberAdd", member => {
  const canal = buscarCanal(member.guild, [
    "bienvenido", "welcome", "hola"
  ]);
  if (!canal) return;

  const msg =
    mensajesBienvenida[Math.floor(Math.random() * mensajesBienvenida.length)];
  canal.send(msg(member.user.username));
});

client.on("guildMemberRemove", member => {
  const canal = buscarCanal(member.guild, [
    "bye", "adios", "salida"
  ]);
  if (!canal) return;

  const msg =
    mensajesDespedida[Math.floor(Math.random() * mensajesDespedida.length)];
  canal.send(msg(member));
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
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Softi activa 💖");
}).listen(PORT);

client.login(TOKEN);
