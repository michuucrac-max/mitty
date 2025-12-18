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
const tosUsersDM = new Set();

// =====================
// FILES
// =====================
const tosServers = fs.existsSync("tos.json")
  ? JSON.parse(fs.readFileSync("tos.json", "utf8"))
  : [];

const welcomeData = {};
if (fs.existsSync("welcome.json")) {
  try {
    Object.assign(welcomeData, JSON.parse(fs.readFileSync("welcome.json", "utf8")));
  } catch (e) {
    console.error("Error cargando welcome.json:", e);
  }
}

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
              "Eres Softi 💖. Respondes SIEMPRE en Markdown. Tono kawaii, amable y respetuoso."
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
// INTERACTIONS
// =====================
client.on(Events.InteractionCreate, async interaction => {
  // ----- BOTONES TOS -----
  if (interaction.isButton()) {
    if (interaction.customId === "aceptar_tos_server") {
      aceptarTOSServidor(interaction.guildId);
      return interaction.update({
        content: "✅ **TOS aceptados** — Softi activada 💖",
        components: []
      });
    }

    if (interaction.customId === "aceptar_tos_dm") {
      tosUsersDM.add(interaction.user.id);
      return interaction.update({
        content: "✅ **TOS aceptados en MD** 💖\nAhora puedes hablar con Softi",
        components: []
      });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;

  // 🔒 BLOQUEO POR TOS
  if (guildId && !tosServers.includes(guildId)) {
    return interaction.reply({
      content: tosMessage(),
      ephemeral: true
    });
  }

  // 🌸 /softisetwelcome
  if (interaction.commandName === "softisetwelcome") {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "❌ Solo administradores pueden usar este comando",
        ephemeral: true
      });
    }

    const welcome = interaction.options.getChannel("welcome");
    const bye = interaction.options.getChannel("bye");

    if (!welcome || !bye) {
      return interaction.reply({
        content:
          "❌ Debes seleccionar **un canal de bienvenida** y **uno de despedida**",
        ephemeral: true
      });
    }

    welcomeData[guildId] = {
      welcome: welcome.id,
      bye: bye.id
    };

    saveJSON("welcome.json", welcomeData);

    return interaction.reply(
      "🌸 **Bienvenidas y despedidas configuradas correctamente** 💖"
    );
  }

  // 💖 COMANDOS KAWAII
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  let reply =
    cmd.reply?.replaceAll("{user}", `<@${interaction.user.id}>`) ?? "✨";

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
// MENSAJES
// =====================
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;

  // ===== MD =====
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
    return msg.reply(`💬 **Softi dice:**\n\n${reply}`);
  }

  // ===== SERVIDORES SIN TOS =====
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

  if (msg.content.startsWith("/") || msg.content.startsWith("!")) return;

  const reply = await longcatAI(msg.content, msg.author.id);
  msg.reply(`💬 **Softi dice:**\n\n${reply}`);
});

// =====================
// BIENVENIDA / DESPEDIDA
// =====================
client.on(Events.GuildMemberAdd, async member => {
  const cfg = welcomeData[member.guild.id];
  if (!cfg?.welcome) return;

  const canal = await member.guild.channels.fetch(cfg.welcome).catch(() => null);
  if (!canal) return;

  console.log("👋 Nuevo miembro:", member.user.tag);

  canal.send(
    `🌸 **Hola ${member.user}!** 💖\n\n` +
      `Bienvenido a **${member.guild.name}** ✨\n` +
      `No olvides leer las reglas jiji~ 📜\n\n` +
      `Recuerda que puedes hablar conmigo si gustas 🦊💬`
  );
});

client.on(Events.GuildMemberRemove, async member => {
  const cfg = welcomeData[member.guild.id];
  if (!cfg?.bye) return;

  const canal = await member.guild.channels.fetch(cfg.bye).catch(() => null);
  if (!canal) return;

  console.log("👋 Miembro salido:", member.user.tag);

  canal.send(
    `🕊️ **${member.user.username}** se ha despedido de **${member.guild.name}**~ 💞\n` +
      `Softi le desea lo mejor ✨`
  );
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
