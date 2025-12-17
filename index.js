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
// MEMORY IA
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
// REGISTER SLASH
// =====================
async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: slashCommands
  });
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
              "Eres Softi, una IA kawaii, dulce y amable. Hablas bonito sin exagerar."
          },
          ...history
        ]
      })
    }
  );

  const data = await res.json();
  let reply = data?.choices?.[0]?.message?.content ?? "Entendido 💖";
  reply = reply.replace(/\*/g, "");

  history.push({ role: "assistant", content: reply });
  memory.set(userId, history.slice(-10));
  return reply;
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
  if (!client.user) return;
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setPresence({
    activities: [{ name: estado, type: 3 }],
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
// MENSAJES RANDOM
// =====================
const mensajesBienvenida = [
  m => `🌸 **¡Bienvenido/a ${m}!** Softi te manda un abracito 💖`,
  m => `✨ ${m} llegó al server ✨ ¡Siéntete como en casa!`,
  m => `🦊 Softi dice hola a ${m} 💕`,
  m => `💫 Nueva personita detectada: ${m}`,
  m => `🌷 ${m} se unió, la vibe subió`
];

const mensajesDespedida = [
  m => `💔 ${m.user.username} se fue… Softi le desea lo mejor 🌙`,
  m => `✨ Hasta luego ${m.user.username}, vuelve cuando quieras`,
  m => `🕊️ ${m.user.username} salió del server`,
  m => `🌧️ Softi despide a ${m.user.username} con cariño`,
  m => `💫 ${m.user.username} tomó otro camino`
];

// =====================
// BIENVENIDA
// =====================
client.on("guildMemberAdd", member => {
  const canal = buscarCanal(member.guild, [
    "bienvenido", "bienvenida", "welcome", "hola"
  ]);
  if (!canal) return;

  const msg =
    mensajesBienvenida[Math.floor(Math.random() * mensajesBienvenida.length)];
  canal.send(msg(member));
});

// =====================
// DESPEDIDA
// =====================
client.on("guildMemberRemove", member => {
  const canal = buscarCanal(member.guild, [
    "adios", "bye", "despedida", "salida"
  ]);
  if (!canal) return;

  const msg =
    mensajesDespedida[Math.floor(Math.random() * mensajesDespedida.length)];
  canal.send(msg(member));
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
    .setTitle("📜 Términos de Servicio")
    .setDescription(
      "Para usar a Softi debes aceptar los TOS:\n\n" +
      "https://terminosycondicionesdeserv.jimdofree.com/"
    );

  const button = new ButtonBuilder()
    .setCustomId("aceptoTOS")
    .setLabel("Aceptar 💖")
    .setStyle(ButtonStyle.Success);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)]
  });
}

client.on("guildCreate", sendTOS);

// =====================
// INTERACTIONS (CMD.JSON FIX)
// =====================
client.on("interactionCreate", async i => {
  if (i.isButton() && i.customId === "aceptoTOS") {
    if (!tosServers.includes(i.guild.id)) {
      tosServers.push(i.guild.id);
      fs.writeFileSync("tos.json", JSON.stringify(tosServers));
    }
    return i.reply({ content: "TOS aceptado 💖", ephemeral: true });
  }

  if (!i.isChatInputCommand()) return;

  const cmd = client.commands.get(i.commandName);
  if (!cmd || !cmd.response) {
    return i.reply({ content: "❌ Comando roto", ephemeral: true });
  }

  const target = i.options.getUser("target");
  let reply = cmd.response
    .replace("{user}", i.user.username)
    .replace("{target}", target ? target.username : "al aire");

  await i.reply(reply);
});

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`🦊 Softi lista como ${client.user.tag}`);
  await registerSlashCommands();
  rotarEstado();
  setInterval(rotarEstado, 120000);
});

// =====================
// MENSAJES
// =====================
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  if (msg.channel.isDMBased()) {
    if (!memory.has(msg.author.id)) {
      memory.set(msg.author.id, []);
      return msg.reply(
        "💖 Al hablar conmigo aceptas mis TOS:\n" +
        "https://terminosycondicionesdeserv.jimdofree.com/"
      );
    }

    const ai = await longcatAI(msg.content, msg.author.id);
    return msg.reply(ai);
  }

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

client.login(TOKEN);
