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
  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: slashCommands
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
// ESTADOS
// =====================
let estados = [];
try {
  estados = JSON.parse(fs.readFileSync("estados.json", "utf8"));
} catch {
  estados = ["Softi activa 💖"];
}

function rotarEstado() {
  if (!client.user) return;
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setPresence({
    activities: [{ name: estado, type: 3 }],
    status: "online"
  });
}

// =====================
// SEARCH CHANNEL
// =====================
function buscarCanal(guild, palabras) {
  return guild.channels.cache.find(
    c =>
      c.isTextBased() &&
      palabras.some(p => c.name.toLowerCase().includes(p))
  );
}

// =====================
// BIENVENIDA CUTE
// =====================
client.on("guildMemberAdd", member => {
  const canal = buscarCanal(member.guild, [
    "welcome", "bienvenido", "hola"
  ]);
  if (!canal) return;

  canal.send(
    `🌸 **¡Bienvenido/a ${member}!** 🌸\n` +
    `Siéntete como en casa ✨\n` +
    `Softi te manda un abracito virtual 💖`
  );
});

// =====================
// DESPEDIDA CUTE
// =====================
client.on("guildMemberRemove", member => {
  const canal = buscarCanal(member.guild, [
    "bye", "adios", "salida"
  ]);
  if (!canal) return;

  canal.send(
    `💔 **${member.user.username} se fue...**\n` +
    `Softi le desea lo mejor 🌙✨`
  );
});

// =====================
// TOS
// =====================
async function sendTOS(guild) {
  if (tosServers.includes(guild.id)) return;

  const channel =
    guild.systemChannel ||
    guild.channels.cache.find(c => c.isTextBased());

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#ffb3d9")
    .setTitle("📜 Términos de Servicio")
    .setDescription(
      "Para usar a Softi debes aceptar los TOS:\n\n" +
      "https://terminosycondicionesdeserv.jimdofree.com/"
    );

  const button = new ButtonBuilder()
    .setCustomId("aceptoTOS")
    .setLabel("Aceptar 💖")
    .setStyle(ButtonStyle.Success);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)]
  });
}

client.on("guildCreate", sendTOS);

// =====================
// INTERACTIONS
// =====================
client.on("interactionCreate", async i => {
  if (i.isButton() && i.customId === "aceptoTOS") {
    if (!tosServers.includes(i.guild.id)) {
      tosServers.push(i.guild.id);
      fs.writeFileSync("tos.json", JSON.stringify(tosServers));
    }
    return i.reply({ content: "TOS aceptado 💖", ephemeral: true });
  }

  if (!i.isChatInputCommand()) return;

  const cmd = client.commands.get(i.commandName);
  if (!cmd) return;

  let reply = cmd.reply ?? "✨ Comando ejecutado";
  reply = reply
    .replace("{user}", i.user.username)
    .replace("{target}", i.options.getUser("target")?.username ?? "");

  await i.reply(reply);
});

// =====================
// YOUTUBE RSS (SIN API)
// =====================
const YT_CHANNELS = [
  ["MrBeast", "UCX6OQ3DkcsbYNE6H8uQQuVA"],
  ["PewDiePie", "UC-lHJZR3Gqxm24_Vd_AJ5Yw"],
  ["Pato Prensado", "UCn5vK9J6nHTKf2kKZ5qVnBQ"],
  ["Plechito", "UCzKq5Zqk7A2nB0JQ2GQy2Zw"],
  ["SB737", "UCp68_FLety0O-n9QU6phsgw"],
  ["Ibai", "UCaY_-ksFSQtTGk0y1HA_3YQ"],
  ["AuronPlay", "UCyQqzYXQBUWgBTn4pw_fFSQ"]
  // Puedes añadir hasta 30 sin problema
];

let ytMemory = {};

async function revisarYT() {
  for (const [name, id] of YT_CHANNELS) {
    try {
      const xml = await fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`
      ).then(r => r.text());

      const videoId = xml.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
      if (!videoId || ytMemory[id] === videoId) continue;

      ytMemory[id] = videoId;

      const title = xml.match(/<title>(.*?)<\/title>/)?.[1];
      const link = `https://www.youtube.com/watch?v=${videoId}`;

      for (const guild of client.guilds.cache.values()) {
        const canal = buscarCanal(guild, [
          "youtube", "yt", "youtubers", "videos"
        ]);
        if (!canal) continue;

        canal.send(
          `📺 **Nuevo video de ${name}**\n` +
          `🎬 ${title}\n` +
          `${link}`
        );
      }
    } catch {}
  }
}

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`🦊 Softi lista como ${client.user.tag}`);
  await registerSlashCommands();
  rotarEstado();
  setInterval(rotarEstado, 120000);
  setInterval(revisarYT, 300000);
});

// =====================
// MENSAJES
// =====================
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  // LOG
  try {
    const log = await client.channels.fetch(LOG_CHANNEL);
    if (log) {
      log.send(
        `👤 ${msg.author.tag}\n` +
        `📍 ${msg.guild?.name ?? "DM"}\n` +
        `${msg.content || "(sin texto)"}`
      );
    }
  } catch {}

  if (msg.channel.isDMBased()) {
    if (!memory.has(msg.author.id)) {
      memory.set(msg.author.id, []);
      return msg.reply(
        "💖 Al hablar conmigo aceptas mis TOS:\n" +
        "https://terminosycondicionesdeserv.jimdofree.com/"
      );
    }

    const ai = await longcatAI(msg.content, msg.author.id);
    return msg.reply(ai);
  }

  if (!msg.content.toLowerCase().includes("softi")) return;
  const ai = await longcatAI(msg.content, msg.author.id);
  msg.reply(ai);
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
