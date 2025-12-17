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
const tosUsuarios = new Set(); // reservado

// =====================
// FILES
// =====================
const tosServers = fs.existsSync("tos.json")
  ? JSON.parse(fs.readFileSync("tos.json", "utf8"))
  : [];

const welcomeData = fs.existsSync("welcome.json")
  ? JSON.parse(fs.readFileSync("welcome.json", "utf8"))
  : {};

const ytData = fs.existsSync("yt.json")
  ? JSON.parse(fs.readFileSync("yt.json", "utf8"))
  : {};

// =====================
// SAVE UTILS
// =====================
const saveJSON = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

const aceptarTOSServidor = guildId => {
  if (!tosServers.includes(guildId)) {
    tosServers.push(guildId);
    saveJSON("tos.json", tosServers);
  }
};

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
              "Eres Softi 💖. Respondes SIEMPRE en Markdown, con tono kawaii, amable y suave. Usa emojis con moderación."
          },
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
// BIENVENIDA / DESPEDIDA
// =====================
client.on(Events.GuildMemberAdd, member => {
  const cfg = welcomeData[member.guild.id];
  if (!cfg?.welcome) return;

  member.guild.channels.cache.get(cfg.welcome)?.send(
    `🌸 **Bienvenido/a ${member.user}** 💖`
  );
});

client.on(Events.GuildMemberRemove, member => {
  const cfg = welcomeData[member.guild.id];
  if (!cfg?.bye) return;

  member.guild.channels.cache.get(cfg.bye)?.send(
    `🕊️ **Hasta luego ${member.user}** 💞`
  );
});

// =====================
// SLASH HANDLER
// =====================
client.on(Events.InteractionCreate, async interaction => {
  // ---------- BOTONES TOS ----------
  if (interaction.isButton()) {
    if (interaction.customId === "aceptar_tos_server") {
      aceptarTOSServidor(interaction.guildId);
      return interaction.update({
        content: "✅ **TOS aceptado** — Softi está activa 💖",
        components: []
      });
    }
  }

  // ---------- SLASH ----------
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;

  if (guildId && !tosServers.includes(guildId)) {
    return interaction.reply({
      content: "🔒 **Softi está bloqueada**\nAcepten los TOS 📜",
      ephemeral: true
    });
  }

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  // SOFTI SETWELCOME
  if (
    interaction.commandName === "softi" &&
    interaction.options.getSubcommand() === "setwelcome"
  ) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    )
      return interaction.reply({
        content: "❌ **Solo administradores**",
        ephemeral: true
      });

    const welcome = interaction.options.getChannel("welcome");
    const bye = interaction.options.getChannel("bye");

    welcomeData[guildId] = {
      welcome: welcome?.id,
      bye: bye?.id
    };

    saveJSON("welcome.json", welcomeData);

    return interaction.reply("✅ **Bienvenidas configuradas** 💖");
  }

  // SOFTI ADD YT
  if (interaction.commandName === "softiaddyt") {
    const canal = interaction.channel.id;
    ytData[guildId] ??= [];
    ytData[guildId].push(canal);
    saveJSON("yt.json", ytData);

    return interaction.reply("📺 **Canal agregado para YouTubers** 💖");
  }

  // KAWAII CMDS
  let reply = cmd.reply ?? "✨";
  reply = reply.replaceAll("{user}", `<@${interaction.user.id}>`);

  if (cmd.options?.length) {
    const target = interaction.options.getUser("target");
    if (target)
      reply = reply.replaceAll("{target}", `<@${target.id}>`);
  }

  interaction.reply({
    content: reply,
    allowedMentions: { users: [], roles: [] }
  });
});

// =====================
// MENSAJES (SIEMPRE RESPONDE)
// =====================
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot || !msg.guild) return;

  // Ignorar comandos
  if (msg.content.startsWith("/") || msg.content.startsWith("!")) return;

  // TOS
  if (!tosServers.includes(msg.guild.id)) {
    const boton = new ButtonBuilder()
      .setCustomId("aceptar_tos_server")
      .setLabel("Aceptar TOS del servidor")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(boton);

    return msg.reply({
      content:
        "📜 **Este servidor debe aceptar los TOS para usar a Softi** 💖\n" +
        "<https://terminosycondicionesdeserv.jimdofree.com/>",
      components: [row]
    });
  }

  const reply = await longcatAI(msg.content, msg.author.id);

  msg.reply({
    content: `💬 **Softi dice:**\n\n${reply}`,
    allowedMentions: { repliedUser: false }
  });
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
http
  .createServer((_, res) => {
    res.writeHead(200);
    res.end("Softi viva 💖");
  })
  .listen(process.env.PORT || 3000);

client.login(TOKEN);
