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
import { parseStringPromise } from "xml2js";

// =====================
// MEMORY
// =====================
const memory = new Map();

// =====================
// TOS MEMORIA
// =====================
let tosServers = [];
try {
  tosServers = JSON.parse(fs.readFileSync("tos.json", "utf8"));
} catch {
  tosServers = [];
}

// =====================
// YOUTUBE RSS MEMORY
// =====================
let ytMemory = {};
try {
  ytMemory = JSON.parse(fs.readFileSync("yt.json", "utf8"));
} catch {
  ytMemory = {};
}

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
// COMMANDS
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
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommands });
}

// =====================
// LONGCAT AI
// =====================
async function longcatAI(message, userId) {
  const history = memory.get(userId) ?? [];
  history.push({ role: "user", content: message });

  const res = await fetch("https://api.longcat.chat/openai/v1/chat/completions", {
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
  });

  const data = await res.json();
  let respuesta = data?.choices?.[0]?.message?.content ?? "Entendido 💖";
  respuesta = respuesta.replace(/\*/g, "");

  history.push({ role: "assistant", content: respuesta });
  memory.set(userId, history.slice(-10));
  return respuesta;
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
  if (!client.user || estados.length === 0) return;
  const texto = estados[Math.floor(Math.random() * estados.length)];
  client.user.setPresence({
    activities: [{ name: texto, type: 3 }],
    status: "online"
  });
}

// =====================
// BUSCAR CANAL
// =====================
function buscarCanal(guild, palabras) {
  return guild.channels.cache.find(
    c => c.isTextBased() && palabras.some(p => c.name.toLowerCase().includes(p))
  );
}

// =====================
// YOUTUBE RSS
// =====================
const YT_FEEDS = [
  // EJEMPLOS (puedes cambiar IDs)
  "https://www.youtube.com/feeds/videos.xml?channel_id=UC-lHJZR3Gqxm24_Vd_AJ5Yw"
];

async function revisarYouTube() {
  for (const feed of YT_FEEDS) {
    try {
      const xml = await fetch(feed).then(r => r.text());
      const data = await parseStringPromise(xml);
      const video = data.feed.entry?.[0];
      if (!video) continue;

      const videoId = video["yt:videoId"][0];
      if (ytMemory[feed] === videoId) continue;

      ytMemory[feed] = videoId;
      fs.writeFileSync("yt.json", JSON.stringify(ytMemory, null, 2));

      const title = video.title[0];
      const link = video.link[0].$.href;
      const author = video.author[0].name[0];

      for (const guild of client.guilds.cache.values()) {
        const canal = buscarCanal(guild, [
          "yt", "youtube", "youtuber", "youtubers"
        ]);
        if (!canal) continue;

        canal.send(
          `📺 **Nuevo video en YouTube**\n` +
          `👤 **${author}**\n` +
          `🎬 **${title}**\n` +
          `${link}`
        );
      }
    } catch (e) {
      console.error("YT RSS error:", e.message);
    }
  }
}

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`Logged as ${client.user.tag}`);
  await registerSlashCommands();
  rotarEstado();
  setInterval(rotarEstado, 120000);
  setInterval(revisarYouTube, 300000); // cada 5 min
});

// =====================
// MENSAJES
// =====================
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  try {
    const log = await client.channels.fetch(LOG_CHANNEL);
    if (log) {
      await log.send(
        `Nuevo mensaje
Usuario: ${msg.author.tag}
Origen: ${msg.guild?.name ?? "DM"}

${msg.content || "(sin texto)"}`
      );
    }
  } catch {}

  if (msg.channel.isDMBased()) {
    if (!memory.has(msg.author.id)) {
      memory.set(msg.author.id, []);
      await msg.reply(
        "Al hablar conmigo aceptas mis TOS:\nhttps://terminosycondicionesdeserv.jimdofree.com/"
      );
      return;
    }
    const ai = await longcatAI(msg.content, msg.author.id);
    await msg.reply(ai);
    return;
  }

  if (!msg.content.toLowerCase().includes("softi")) return;
  const ai = await longcatAI(msg.content, msg.author.id);
  await msg.reply(ai);
});

// =====================
// 24/7
// =====================
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Softi activa 💖");
}).listen(PORT);

// =====================
client.login(TOKEN);
