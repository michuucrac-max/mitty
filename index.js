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
// MEMORY
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
// LOAD COMMANDS (cmd.json)
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
// REGISTER SLASH COMMANDS
// =====================
async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: slashCommands }
  );
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
            content: "Eres Softi, una IA kawaii y amable. Hablas dulce, sin exagerar."
          },
          ...history
        ]
      })
    }
  );

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
// WELCOME
// =====================
client.on("guildMemberAdd", member => {
  const canal = buscarCanal(member.guild, [
    "welcome", "bienvenido", "hola"
  ]);
  if (!canal) return;

  canal.send(
    `🌸 ¡Bienvenido/a ${member}!\n` +
    `Softi está aquí para ayudarte 💖`
  );
});

// =====================
// GOODBYE
// =====================
client.on("guildMemberRemove", member => {
  const canal = buscarCanal(member.guild, [
    "bye", "adios", "salida"
  ]);
  if (!canal) return;

  canal.send(`💔 ${member.user.tag} se ha ido...`);
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
    .setTitle("Términos de Servicio")
    .setDescription(
      "Debes aceptar los términos para usar Softi:\n\n" +
      "https://terminosycondicionesdeserv.jimdofree.com/"
    );

  const button = new ButtonBuilder()
    .setCustomId("aceptoTOS")
    .setLabel("Aceptar")
    .setStyle(ButtonStyle.Success);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)]
  });
}

// =====================
// INTERACTIONS
// =====================
client.on("interactionCreate", async i => {

  // ✅ BOTÓN TOS
  if (i.isButton() && i.customId === "aceptoTOS") {
    if (!tosServers.includes(i.guild.id)) {
      tosServers.push(i.guild.id);
      fs.writeFileSync("tos.json", JSON.stringify(tosServers));
    }
    return i.reply({ content: "TOS aceptado 💖", ephemeral: true });
  }

  // ✅ SLASH COMMANDS (cmd.json)
  if (!i.isChatInputCommand()) return;

  const cmd = client.commands.get(i.commandName);
  if (!cmd) return;

  try {
    // EJECUCIÓN SIMPLE (RESPUESTA TEXTO)
    if (cmd.reply) {
      await i.reply(cmd.reply);
    } else {
      await i.reply("✨ Comando ejecutado");
    }
  } catch (e) {
    console.error(e);
    if (!i.replied) {
      await i.reply({ content: "Error ejecutando el comando", ephemeral: true });
    }
  }
});

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`Logged as ${client.user.tag}`);
  await registerSlashCommands();
  rotarEstado();
  setInterval(rotarEstado, 120000);
});

// =====================
// MESSAGES
// =====================
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  // LOG
  try {
    const log = await client.channels.fetch(LOG_CHANNEL);
    if (log) {
      await log.send(
        `Usuario: ${msg.author.tag}\n` +
        `Origen: ${msg.guild?.name ?? "DM"}\n\n` +
        `${msg.content || "(sin texto)"}`
      );
    }
  } catch {}

  // DM
  if (msg.channel.isDMBased()) {
    if (!memory.has(msg.author.id)) {
      memory.set(msg.author.id, []);
      return msg.reply(
        "Al hablar conmigo aceptas mis TOS:\n" +
        "https://terminosycondicionesdeserv.jimdofree.com/"
      );
    }

    const ai = await longcatAI(msg.content, msg.author.id);
    return msg.reply(ai);
  }

  // MENTION
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

// =====================
client.login(TOKEN);
