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
  ActionRowBuilder,
  PermissionsBitField
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
// ARCHIVOS
// =====================
const tosServersFile = "tos.json";
const tosUsersFile = "tosUsers.json";
const welcomeFile = "welcome.json";
const ytChannelsFile = "ytChannels.json";
const ytListFile = "yt.json";

// Servidores que aceptaron TOS
let tosServers = fs.existsSync(tosServersFile) ? JSON.parse(fs.readFileSync(tosServersFile, "utf8")) : [];
// Usuarios que aceptaron TOS en DM
let tosUsersDM = fs.existsSync(tosUsersFile) ? new Set(JSON.parse(fs.readFileSync(tosUsersFile, "utf8"))) : new Set();
// Bienvenidas
const welcomeData = fs.existsSync(welcomeFile) ? JSON.parse(fs.readFileSync(welcomeFile, "utf8")) : {};
// YouTube
const ytChannels = fs.existsSync(ytChannelsFile) ? JSON.parse(fs.readFileSync(ytChannelsFile, "utf8")) : {};
const ytList = fs.existsSync(ytListFile) ? JSON.parse(fs.readFileSync(ytListFile, "utf8")) : {};
const lastVideos = {};

// =====================
// UTILS
// =====================
const saveJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

const aceptarTOSServidor = guildId => {
  if (!tosServers.includes(guildId)) {
    tosServers.push(guildId);
    saveJSON(tosServersFile, tosServers);
  }
};

const aceptarTOSUsuario = userId => {
  if (!tosUsersDM.has(userId)) {
    tosUsersDM.add(userId);
    saveJSON(tosUsersFile, Array.from(tosUsersDM));
  }
};

const tosMessage = () =>
  "📜 **TÉRMINOS DE SERVICIO — SOFTI**\n\n" +
  "Para usar a Softi debes aceptar los TOS:\n" +
  "👉 https://terminosycondicionesdeserv.jimdofree.com/\n\n" +
  "💖 Gracias por cuidar de Softi";

// =====================
// LOAD CMDS
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
  console.log("✅ Slash commands registrados");
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
}

// =====================
// INTERACTIONS
// =====================
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === "aceptar_tos_server") {
      aceptarTOSServidor(interaction.guildId);
      return interaction.update({ content: "✅ **TOS aceptados** — Softi activada 💖", components: [] });
    }
    if (interaction.customId === "aceptar_tos_dm") {
      aceptarTOSUsuario(interaction.user.id);
      return interaction.update({ content: "✅ **TOS aceptados en MD** 💖\nAhora puedes hablar con Softi", components: [] });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;
  if (guildId && !tosServers.includes(guildId)) {
    return interaction.reply({ content: tosMessage(), ephemeral: true });
  }

  if (interaction.commandName === "softisetwelcome") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Solo administradores pueden usar este comando", ephemeral: true });
    }

    const welcome = interaction.options.getChannel("welcome");
    const bye = interaction.options.getChannel("bye");
    if (!welcome || !bye) return interaction.reply({ content: "❌ Debes seleccionar un canal de bienvenida y uno de despedida", ephemeral: true });

    welcomeData[guildId] = { welcome: welcome.id, bye: bye.id };
    saveJSON(welcomeFile, welcomeData);
    return interaction.reply("🌸 **Bienvenidas y despedidas configuradas correctamente** 💖");
  }

  if (interaction.commandName === "softiaddyt") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Solo administradores pueden usar este comando", ephemeral: true });
    }

    const channel = interaction.channel;
    ytChannels[guildId] = channel.id;
    saveJSON(ytChannelsFile, ytChannels);
    return interaction.reply({ content: `📺 Canal registrado para avisos de YouTube: <#${channel.id}> 💖`, ephemeral: true });
  }

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  let reply = cmd.reply?.replaceAll("{user}", `<@${interaction.user.id}>`) ?? "✨";
  if (cmd.options?.length) {
    const target = interaction.options.getUser("target");
    if (target) reply = reply.replaceAll("{target}", `<@${target.id}>`);
  }

  interaction.reply({ content: reply, allowedMentions: { users: [], roles: [] } });
});

// =====================
// MENSAJES
// =====================
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;

  // TOS
  if (!msg.guild && !tosUsersDM.has(msg.author.id)) {
    const boton = new ButtonBuilder().setCustomId("aceptar_tos_dm").setLabel("Aceptar TOS").setStyle(ButtonStyle.Success);
    return msg.reply({ content: tosMessage(), components: [new ActionRowBuilder().addComponents(boton)] });
  }
  if (msg.guild && !tosServers.includes(msg.guild.id)) {
    const boton = new ButtonBuilder().setCustomId("aceptar_tos_server").setLabel("Aceptar TOS del servidor").setStyle(ButtonStyle.Success);
    return msg.reply({ content: tosMessage(), components: [new ActionRowBuilder().addComponents(boton)] });
  }

  // Detectar comandos slash como mensajes normales
  if (msg.content.startsWith("/") || msg.content.startsWith("!")) return;

  // Detectar menciones a Softi
  const botMentioned = msg.mentions.has(client.user);
  if (!msg.guild || botMentioned) {
    if (!msg.guild && !tosUsersDM.has(msg.author.id)) return;
    const reply = await longcatAI(msg.content, msg.author.id);
    return msg.reply(`💬 **Softi dice:**\n\n${reply}`);
  }
});

// =====================
// BIENVENIDA / DESPEDIDA
// =====================
client.on(Events.GuildMemberAdd, async member => {
  const cfg = welcomeData[member.guild.id];
  if (!cfg?.welcome) return;
  const canal = await member.guild.channels.fetch(cfg.welcome).catch(() => null);
  if (!canal) return;
  canal.send(`🌸 **Hola ${member.user}!** 💖\nBienvenido a **${member.guild.name}** ✨\nNo olvides leer las reglas 📜\nRecuerda que puedes hablar conmigo 🦊💬`);
});

client.on(Events.GuildMemberRemove, async member => {
  const cfg = welcomeData[member.guild.id];
  if (!cfg?.bye) return;
  const canal = await member.guild.channels.fetch(cfg.bye).catch(() => null);
  if (!canal) return;
  canal.send(`🕊️ **${member.user.username}** se ha despedido de **${member.guild.name}**~ 💞\nSofti le desea lo mejor ✨`);
});

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`🦊 Softi lista como ${client.user.tag}`);
  await registerSlashCommands();
});

// =====================
// KEEP ALIVE
// =====================
http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Softi viva 💖");
}).listen(process.env.PORT || 3000);

client.login(TOKEN);.env.PORT || 3000);

client.login(TOKEN);
