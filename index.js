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
const tosUsuarios = new Set(); // usuarios que aceptaron TOS

// =====================
// LOAD FILES
// =====================
const tosServers = fs.existsSync("tos.json")
  ? JSON.parse(fs.readFileSync("tos.json", "utf8"))
  : [];

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
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: slashCommands }
  );
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
          { role: "system", content: "Eres Softi, kawaii y amable." },
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
// UTIL CANAL
// =====================
function limpiarNombre(nombre) {
  return nombre.toLowerCase().replace(/[^a-z0-9\s-]/g, "");
}

function buscarCanal(guild, palabras) {
  return guild.channels.cache.find(c => {
    if (!c.isTextBased()) return false;
    const limpio = limpiarNombre(c.name);
    return palabras.some(p => limpio.includes(p));
  });
}

// =====================
// BIENVENIDA / DESPEDIDA
// =====================
const bienvenida = [
  m => `🌸 Bienvenido/a ${m} 💖`,
  m => `✨ ${m} llegó al server ✨`
];

const despedida = [
  m => `💔 ${m} se fue…`,
  m => `🕊️ Hasta luego ${m}`
];

client.on(Events.GuildMemberAdd, member => {
  const canal = buscarCanal(member.guild, ["bienvenido", "welcome"]);
  if (!canal) return;
  const msg = bienvenida[Math.floor(Math.random() * bienvenida.length)];
  canal.send(msg(member.user));
});

client.on(Events.GuildMemberRemove, member => {
  const canal = buscarCanal(member.guild, ["bye", "salida"]);
  if (!canal) return;
  const msg = despedida[Math.floor(Math.random() * despedida.length)];
  canal.send(msg(member.user));
});

// =====================
// SLASH HANDLER
// =====================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  // Check TOS: si es en servidor, se revisa tosServers, si es DM solo tosUsuarios
  if (interaction.guildId) {
    if (!tosServers.includes(interaction.guildId)) {
      return interaction.reply({
        content: "📜 Debes aceptar el TOS del servidor primero",
        ephemeral: true
      });
    }
  } else {
    if (!tosUsuarios.has(userId)) {
      return interaction.reply({
        content: "📜 Debes aceptar mis TOS primero (DM)",
        ephemeral: true
      });
    }
  }

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await interaction.reply(cmd.response ?? "✨");
  } catch (e) {
    console.error(e);
    interaction.reply("❌ Error");
  }
});

// =====================
// MENSAJES IA CON TOS Y LINK
// =====================
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;

  const userId = msg.author.id;
  const esDM = msg.channel.type === 1 || msg.channel.type === 3; // DM

  // En DM siempre responde, en servidor solo si menciona o dice Softi
  const contieneSofti = msg.content.toLowerCase().includes("softi");
  if (!esDM && !msg.mentions.has(client.user) && !contieneSofti) return;

  // Si no aceptó TOS
  if (!tosUsuarios.has(userId)) {
    const boton = new ButtonBuilder()
      .setCustomId("aceptar_tos")
      .setLabel("Aceptar TOS")
      .setStyle(ButtonStyle.Success);

    const fila = new ActionRowBuilder().addComponents(boton);

    const tosMsg = await msg.reply({
      content: "📜 Antes de hablar conmigo, debes aceptar mis TOS:\n<https://terminosycondicionesdeserv.jimdofree.com/>\n\nHaz click en el botón para aceptar.",
      components: [fila]
    });

    const collector = tosMsg.createMessageComponentCollector({
      filter: i => i.user.id === userId,
      time: 60000
    });

    collector.on("collect", async i => {
      if (i.customId === "aceptar_tos") {
        tosUsuarios.add(userId);
        await i.update({ content: "✅ Gracias! Ahora puedes hablar conmigo 💖", components: [] });
      }
    });

    return;
  }

  // ya aceptó TOS, respondemos con IA
  const reply = await longcatAI(msg.content, userId);
  msg.reply(reply);
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
http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Softi viva 💖");
}).listen(process.env.PORT || 3000);

client.login(TOKEN);
