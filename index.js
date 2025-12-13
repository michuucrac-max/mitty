// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import {
  Client, GatewayIntentBits, Partials, Collection, REST, Routes,
  Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder
} from "discord.js";

import fs from "fs";
import fetch from "node-fetch";
import { load } from "cheerio";

// =====================
// MEMORY
// =====================
const memory = new Map();
const searchCooldown = new Map();

// ====== MEMORIA DE TOS POR SERVIDOR
let tosServers = [];
try { tosServers = JSON.parse(fs.readFileSync("tos.json","utf8")) } catch { tosServers = [] }

// =====================
// ENV
// =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const LONGCAT_API = process.env.LONGCAT_API;

const LOG_CHANNEL = "1430331682749419640";

// =====================
// Cliente
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// =====================
// cargar comandos
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
// registrar slash
// =====================
async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommands });
}

// =====================
// WEB SEARCH (FREE)
// =====================
async function webSearch(query) {
  const now = Date.now();
  const last = searchCooldown.get(query) || 0;
  if (now - last < 10000) {
    return "Usando información reciente encontrada hace unos segundos.";
  }
  searchCooldown.set(query, now);

  try {
    const res = await fetch(
      `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "SoftiBot/1.0" } }
    );

    const html = await res.text();
    const $ = load(html);
    const results = [];

    $(".result").each((i, el) => {
      if (i >= 3) return;
      const title = $(el).find(".result__a").text();
      const url = $(el).find(".result__a").attr("href");
      const snippet = $(el).find(".result__snippet").text();
      if (title && url) results.push({ title, url, snippet });
    });

    if (!results.length) return "No encontré resultados.";

    return results.map(
      (r, i) => `${i+1}. ${r.title}\n${r.snippet}\n${r.url}`
    ).join("\n\n");

  } catch {
    return "Error al buscar información.";
  }
}

// =====================
// LongCat AI
// =====================
async function longcatAI(message, userId) {
  const history = memory.get(userId) ?? [];

  const needSearch = /buscar|investiga|qué es|quién es|info|información|wiki|datos|historia/i.test(message);

  if (needSearch) {
    const info = await webSearch(message);
    history.push({
      role: "system",
      content: "Información encontrada en internet:\n" + info
    });
  }

  history.push({ role: "user", content: message });

  const res = await fetch("https://api.longcat.chat/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LONGCAT_API}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "LongCat-Flash-Chat",
      messages: [
        {
          role: "system",
          content:
            "Eres Softi, una IA kawaii y amable. Hablas dulce y tierna, con algunos 'uwu' y 'owo'. No exageres."
        },
        ...history
      ]
    })
  });

  const data = await res.json();
  let respuesta = data?.choices?.[0]?.message?.content ?? "Entendido.";
  respuesta = respuesta.replace(/\*/g,"");

  history.push({ role: "assistant", content: respuesta });
  memory.set(userId, history.slice(-10));

  return respuesta;
}

// =====================
// mensajes
// =====================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.channel.isDMBased()) {
    if (!memory.get(msg.author.id)) {
      memory.set(msg.author.id, []);
      return msg.reply(
        "Antes de continuar debes aceptar los Términos de Servicio:\n" +
        "https://terminosycondicionesdeserv.jimdofree.com/"
      );
    }
    return msg.reply(await longcatAI(msg.content, msg.author.id));
  }

  if (!msg.content.toLowerCase().includes("softi")) return;
  msg.reply(await longcatAI(msg.content, msg.author.id));
});

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`Logged as ${client.user.tag}`);
  await registerSlashCommands();
});

// =====================
// Servidor 24/7 Render
// =====================
const http = await import("http");
http.createServer((_, res) => res.end("Softi activa"))
  .listen(process.env.PORT || 3000);

// =====================
client.login(TOKEN);
