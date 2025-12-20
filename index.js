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

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ Faltan variables de entorno");
  process.exit(1);
}

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
const tosUsersDM = new Set();

// =====================
// ARCHIVOS
// =====================
const tosServers = fs.existsSync("tos.json")
  ? JSON.parse(fs.readFileSync("tos.json", "utf8"))
  : [];

const welcomeData = fs.existsSync("welcome.json")
  ? JSON.parse(fs.readFileSync("welcome.json", "utf8"))
  : {};

const ytChannels = fs.existsSync("ytChannels.json")
  ? JSON.parse(fs.readFileSync("ytChannels.json", "utf8"))
  : {};

const ytList = fs.existsSync("yt.json")
  ? JSON.parse(fs.readFileSync("yt.json", "utf8"))
  : [];

// =====================
// UTILIDADES
// =====================
const saveJSON = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

const aceptarTOSServidor = guildId => {
  if (!tosServers.includes(guildId)) {
    tosServers.push(guildId);
    saveJSON("tos.json", tosServers);
  }
};

const tosMessage = () =>
  "📜 **TÉRMINOS DE SERVICIO — SOFTI**\n\n" +
  "Para usar a Softi debes aceptar los TOS:\n" +
  "👉 https://terminosycondicionesdeserv.jimdofree.com/\n\n" +
  "💖 Gracias por cuidar de Softi";

// =====================
// CARGAR COMANDOS
// =====================
if (fs.existsSync("cmd.json")) {
  const rawCmds = JSON.parse(fs.readFileSync("cmd.json", "utf8"));
  for (const cmd of rawCmds) client.commands.set(cmd.name, cmd);
}

// =====================
// REGISTRAR SLASH COMMANDS
// =====================
async function registerSlashCommands() {
  if (!fs.existsSync("cmd.json")) return;

  const rawCmds = JSON.parse(fs.readFileSync("cmd.json", "utf8"));
  const slashCommands = rawCmds.map(c => ({
    name: c.name,
    description: c.description,
    options: c.options ?? []
  }));

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommands });
  console.log("✅ Slash commands registrados");
}

// =====================
// LONGCAT AI
// =====================
async function longcatAI(message, userId) {
  if (!LONGCAT_API) return "💖";

  const history = memory.get(userId) ?? [];
  history.push({ role: "user", content: message });

  try {
    const res = await fetch("https://api.longcat.chat/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LONGCAT_API}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "LongCat-Flash-Chat",
        messages: [
          { role: "system", content: "Eres Softi 💖. Respondes SIEMPRE en Markdown. Tono kawaii, amable y respetuoso." },
          ...history
        ]
      })
    });

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content ?? "💖";
    history.push({ role: "assistant", content: reply });
    memory.set(userId, history.slice(-10));
    return reply;
  } catch (e) {
    console.error("❌ Error LongCat AI:", e);
    return "💖";
  }
}

// =====================
// INTERACCIONES
// =====================
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === "aceptar_tos_server") {
      aceptarTOSServidor(interaction.guildId);
      return interaction.update({ content: "✅ TOS aceptados — Softi activada 💖", components: [] });
    }

    if (interaction.customId === "aceptar_tos_dm") {
      tosUsersDM.add(interaction.user.id);
      return interaction.update({ content: "✅ TOS aceptados en MD 💖", components: [] });
    }
  }

  if (!interaction.isChatInputCommand()) return;
  if (interaction.guildId && !tosServers.includes(interaction.guildId)) {
    return interaction.reply({ content: tosMessage(), ephemeral: true });
  }

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  let reply = cmd.reply ?? "✨";
  reply = reply.replaceAll("{user}", `<@${interaction.user.id}>`);

  interaction.reply({ content: reply, allowedMentions: { parse: [] } });
});

// =====================
// MENSAJES
// =====================
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;

  if (!msg.guild) {
    if (!tosUsersDM.has(msg.author.id)) {
      const boton = new ButtonBuilder().setCustomId("aceptar_tos_dm").setLabel("Aceptar TOS").setStyle(ButtonStyle.Success);
      return msg.reply({ content: tosMessage(), components: [new ActionRowBuilder().addComponents(boton)], allowedMentions: { parse: [] } });
    }

    const reply = await longcatAI(msg.content, msg.author.id);
    return msg.reply({ content: `💬 **Softi dice:**\n\n${reply}`, allowedMentions: { parse: [] } });
  }

  if (!tosServers.includes(msg.guild.id)) return;

  const reply = await longcatAI(msg.content, msg.author.id);
  msg.reply({ content: `💬 Softi dice:\n\n${reply}`, allowedMentions: { parse: [] } });
});

// =====================
// BIENVENIDA / DESPEDIDA (SAFE)
// =====================
client.on(Events.GuildMemberAdd, async member => {
  const cfg = welcomeData[member.guild.id];
  if (!cfg?.welcome) return;

  const canal = await member.guild.channels.fetch(cfg.welcome).catch(() => null);
  if (!canal) return;

  canal.send({
    content: `🌸 **Nuevo miembro**\nHola ${member.user.username}! 💖\nBienvenido a **${member.guild.name}** ✨`,
    allowedMentions: { parse: [] }
  });
});

client.on(Events.GuildMemberRemove, async member => {
  const cfg = welcomeData[member.guild.id];
  if (!cfg?.bye) return;

  const canal = await member.guild.channels.fetch(cfg.bye).catch(() => null);
  if (!canal) return;

  canal.send({
    content: `🕊️ **Despedida**\n${member.user.username} ha salido de **${member.guild.name}** 💞`,
    allowedMentions: { parse: [] }
  });
});

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`🦊 Softi conectada como ${client.user.tag}`);
  console.log("✅ Intents:", client.options.intents.toArray());
  await registerSlashCommands();
});

// =====================
// KEEP ALIVE
// =====================
http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Softi viva 💖");
}).listen(process.env.PORT || 3000);

client.login(TOKEN);
