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
const LOG_CHANNEL = "1430331682749419640";

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
// LOAD COMMANDS
// =====================
const rawCmds = JSON.parse(fs.readFileSync("cmd.json", "utf8"));
const slashCommands = [];

for (const cmd of rawCmds) {
  slashCommands.push({
    name: cmd.name,
    description: cmd.description,
    options: [{
      name: "target",
      description: "Menciona a alguien",
      type: 6,
      required: true
    }]
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
// ESTADOS
// =====================
let estados = [];
try {
  estados = JSON.parse(fs.readFileSync("estados.json", "utf8"));
} catch {
  estados = ["Softi activa 💖"];
}

function rotarEstado() {
  const texto = estados[Math.floor(Math.random() * estados.length)];
  client.user.setPresence({
    activities: [{ name: texto, type: 3 }],
    status: "online"
  });
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
          { role: "system", content: "Eres Softi, una IA kawaii y amable." },
          ...history
        ]
      })
    }
  );

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content ?? "💖";
  history.push({ role: "assistant", content: reply });
  memory.set(userId, history.slice(-10));
  return reply.replace(/\*/g, "");
}

// =====================
// BIENVENIDA
// =====================
client.on("guildMemberAdd", member => {
  const canal = member.guild.channels.cache.find(c =>
    c.isTextBased() &&
    ["welcome", "bienvenido", "hola"].some(w => c.name.includes(w))
  );
  if (canal) canal.send(`🌸 Bienvenido/a ${member} 💖`);
});

// =====================
// DESPEDIDA
// =====================
client.on("guildMemberRemove", member => {
  const canal = member.guild.channels.cache.find(c =>
    c.isTextBased() &&
    ["bye", "adios", "salida"].some(w => c.name.includes(w))
  );
  if (canal) canal.send(`💔 ${member.user.tag} se ha ido...`);
});

// =====================
// SLASH COMMANDS
// =====================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  const target = interaction.options.getUser("target");
  const texto = cmd.reply
    .replace("{user}", interaction.user.username)
    .replace("{target}", target.username);

  await interaction.reply(texto);
});

// =====================
// MENSAJES (IA)
// =====================
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  // LOG
  try {
    const log = await client.channels.fetch(LOG_CHANNEL);
    log?.send(`📩 ${msg.author.tag}: ${msg.content}`);
  } catch {}

  // DM
  if (msg.channel.isDMBased()) {
    if (!memory.has(msg.author.id)) {
      memory.set(msg.author.id, []);
      return msg.reply(
        "Al hablar conmigo aceptas mis TOS:\nhttps://terminosycondicionesdeserv.jimdofree.com/"
      );
    }
    return msg.reply(await longcatAI(msg.content, msg.author.id));
  }

  // SOLO si mencionan softi
  if (!msg.content.toLowerCase().includes("softi")) return;
  msg.reply(await longcatAI(msg.content, msg.author.id));
});

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged as ${client.user.tag}`);
  await registerSlashCommands();
  rotarEstado();
  setInterval(rotarEstado, 120000);
});

// =====================
// 24/7
// =====================
http.createServer((_, res) => {
  res.end("Softi activa 💖");
}).listen(process.env.PORT || 3000);

// =====================
client.login(TOKEN);
