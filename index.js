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
  PermissionsBitField,
  EmbedBuilder
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
// UTILS
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
        {
          role: "system",
          content:
            "Eres Softi 💖. Respondes SIEMPRE en Markdown. Tono kawaii, amable y respetuoso."
        },
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
// BIENVENIDA / DESPEDIDA
// =====================
client.on(Events.GuildMemberAdd, member => {
  const cfg = welcomeData[member.guild.id];
  if (!cfg?.welcome) return;

  member.guild.channels.cache
    .get(cfg.welcome)
    ?.send(`🌸 **Bienvenido/a ${member.user}** 💖`);
});

client.on(Events.GuildMemberRemove, member => {
  const cfg = welcomeData[member.guild.id];
  if (!cfg?.bye) return;

  member.guild.channels.cache
    .get(cfg.bye)
    ?.send(`🕊️ **Hasta luego ${member.user}** 💞`);
});

// =====================
// INTERACTIONS
// =====================
client.on(Events.InteractionCreate, async interaction => {
  // BOTÓN TOS
  if (interaction.isButton()) {
    if (interaction.customId === "aceptar_tos_server") {
      aceptarTOSServidor(interaction.guildId);
      return interaction.update({
        content: "✅ **TOS aceptados** — Softi activada 💖",
        components: []
      });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;

  // BLOQUEO TOS
  if (guildId && !tosServers.includes(guildId)) {
    return interaction.reply({
      content: tosMessage(),
      ephemeral: true
    });
  }

  // /softisetwelcome
  if (interaction.commandName === "softisetwelcome") {
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
      welcome: welcome.id,
      bye: bye.id
    };

    saveJSON("welcome.json", welcomeData);

    return interaction.reply(
      "✅ **Canales de bienvenida y despedida configurados** 💖"
    );
  }

  // /softiaddyt
  if (interaction.commandName === "softiaddyt") {
    ytData[guildId] ??= [];
    if (!ytData[guildId].includes(interaction.channel.id)) {
      ytData[guildId].push(interaction.channel.id);
      saveJSON("yt.json", ytData);
    }

    return interaction.reply(
      "📺 **Este canal fue marcado como canal de YouTubers** 💖"
    );
  }

  // /players
  if (interaction.commandName === "players") {
    const guild = interaction.guild;
    const total = guild.memberCount;

    const embed = new EmbedBuilder()
      .setTitle("👥 Players del Servidor")
      .setDescription(`**Miembros totales:** ${total}`)
      .setColor(0xffb6c1);

    return interaction.reply({ embeds: [embed] });
  }

  // CMDS KAWAII
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  let reply = cmd.reply.replaceAll(
    "{user}",
    `<@${interaction.user.id}>`
  );

  if (cmd.options?.length) {
    const target = interaction.options.getUser("target");
    if (target)
      reply = reply.replaceAll("{target}", `<@${target.id}>`);
  }

  interaction.reply({ content: reply });
});

// =====================
// MENSAJES (SIEMPRE)
// =====================
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;

  // TOS en DM
  if (!msg.guild) {
    return msg.reply(tosMessage());
  }

  if (!tosServers.includes(msg.guild.id)) {
    const boton = new ButtonBuilder()
      .setCustomId("aceptar_tos_server")
      .setLabel("Aceptar TOS")
      .setStyle(ButtonStyle.Success);

    return msg.reply({
      content: tosMessage(),
      components: [new ActionRowBuilder().addComponents(boton)]
    });
  }

  if (msg.content.startsWith("/") || msg.content.startsWith("!")) return;

  const reply = await longcatAI(msg.content, msg.author.id);
  msg.reply(`💬 **Softi dice:**\n\n${reply}`);
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

client.login(TOKEN);
