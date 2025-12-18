// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
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
// FILES
// =====================
const tosServersFile = "tos.json";
const tosUsersFile = "tosUsers.json";

let tosServers = fs.existsSync(tosServersFile)
  ? JSON.parse(fs.readFileSync(tosServersFile, "utf8"))
  : [];

let tosUsersDM = fs.existsSync(tosUsersFile)
  ? new Set(JSON.parse(fs.readFileSync(tosUsersFile, "utf8")))
  : new Set();

// =====================
// UTILS
// =====================
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function aceptarTOSServidor(guildId) {
  if (!tosServers.includes(guildId)) {
    tosServers.push(guildId);
    saveJSON(tosServersFile, tosServers);
  }
}

function aceptarTOSUsuario(userId) {
  if (!tosUsersDM.has(userId)) {
    tosUsersDM.add(userId);
    saveJSON(tosUsersFile, Array.from(tosUsersDM));
  }
}

function tosMessage() {
  return (
    "📜 **TÉRMINOS DE SERVICIO — SOFTI**\n\n" +
    "Para usar a Softi debes aceptar los TOS:\n" +
    "👉 https://terminosycondicionesdeserv.jimdofree.com/\n\n" +
    "💖 Gracias por cuidar de Softi"
  );
}

// =====================
// LONGCAT AI
// =====================
async function longcatAI(message, userId) {
  let history = memory.get(userId) || [];
  history.push({ role: "user", content: message });

  const res = await fetch(
    "https://api.longcat.chat/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + LONGCAT_API,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "LongCat-Flash-Chat",
        messages: [
          { role: "system", content: "Eres Softi 💖. Tono kawaii y amable." },
          ...history
        ]
      })
    }
  );

  const data = await res.json();
  let reply = "💖";

  if (
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
  ) {
    reply = data.choices[0].message.content;
  }

  history.push({ role: "assistant", content: reply });
  memory.set(userId, history.slice(-10));
  return reply;
}

// =====================
// BOTONES
// =====================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "aceptar_tos_server") {
    aceptarTOSServidor(interaction.guildId);
    return interaction.update({
      content: "✅ **TOS aceptados en el servidor** — Softi activada 💖",
      components: []
    });
  }

  if (interaction.customId === "aceptar_tos_dm") {
    aceptarTOSUsuario(interaction.user.id);
    return interaction.update({
      content: "✅ **TOS aceptados en MD** — Softi activada 💖",
      components: []
    });
  }
});

// =====================
// MENSAJES
// =====================
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;

  const contentLower = msg.content.toLowerCase();
  const mentionsSofti =
    /\bsofti\b/.test(contentLower) || /\bsoftitales\b/.test(contentLower);

  // -------- DM --------
  if (!msg.guild) {
    if (!tosUsersDM.has(msg.author.id)) {
      const boton = new ButtonBuilder()
        .setCustomId("aceptar_tos_dm")
        .setLabel("Aceptar TOS")
        .setStyle(ButtonStyle.Success);

      return msg.reply({
        content: tosMessage(),
        components: [new ActionRowBuilder().addComponents(boton)]
      });
    }

    const reply = await longcatAI(msg.content, msg.author.id);
    return msg.reply(reply);
  }

  // -------- SERVER --------
  if (msg.guild && mentionsSofti) {
    if (!tosServers.includes(msg.guild.id)) {
      const boton = new ButtonBuilder()
        .setCustomId("aceptar_tos_server")
        .setLabel("Aceptar TOS del servidor")
        .setStyle(ButtonStyle.Success);

      return msg.reply({
        content: tosMessage(),
        components: [new ActionRowBuilder().addComponents(boton)]
      });
    }

    const reply = await longcatAI(msg.content, msg.author.id);
    return msg.reply(reply);
  }
});

// =====================
// READY
// =====================
client.once(Events.ClientReady, () => {
  console.log("🦊 Softi lista como " + client.user.tag);
});

// =====================
// KEEP ALIVE
// =====================
http
  .createServer((_, res) => {
    res.writeHead(200);
    res.end("Softi viva 💖");
  })
  .listen(process.env.PORT || 3000);

client.login(TOKEN);
