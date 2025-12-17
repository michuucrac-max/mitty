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
// LEVEL SYSTEM
// =====================
let levels = {};
try {
  levels = JSON.parse(fs.readFileSync("levels.json", "utf8"));
} catch {
  levels = {};
}

const TALK_TIME = 20 * 60 * 1000; // 20 minutos

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
// LOAD COMMANDS
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
  let reply =
    data?.choices?.[0]?.message?.content ?? "Entendido 💖";
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
  const estado =
    estados[Math.floor(Math.random() * estados.length)];
  client.user.setPresence({
    activities: [{ name: estado, type: 3 }],
    status: "online"
  });
}

// =====================
// SEARCH CHANNELS
// =====================
function buscarCanal(guild, palabras) {
  return guild.channels.cache.find(
    c =>
      c.isTextBased() &&
      palabras.some(p =>
        c.name.toLowerCase().includes(p)
      )
  );
}

function buscarCanalNivel(guild) {
  return buscarCanal(guild, [
    "boost",
    "level",
    "nivel",
    "level-up",
    "subida",
    "subida-de-nivel"
  ]);
}

// =====================
// BIENVENIDA / DESPEDIDA
// =====================
const mensajesBienvenida = [
  m => `🌸 **¡Bienvenido/a ${m}!** Softi te manda un abracito 💖`,
  m => `✨ ${m} llegó al server ✨`,
  m => `🦊 Softi dice hola a ${m} 💕`,
  m => `💫 Nueva personita detectada: ${m}`
];

const mensajesDespedida = [
  m => `💔 ${m.user.username} se fue…`,
  m => `✨ Hasta luego ${m.user.username}`,
  m => `🕊️ ${m.user.username} salió del server`
];

client.on("guildMemberAdd", member => {
  const canal = buscarCanal(member.guild, [
    "bienvenido",
    "welcome",
    "hola"
  ]);
  if (!canal) return;
  canal.send(
    mensajesBienvenida[
      Math.floor(Math.random() * mensajesBienvenida.length)
    ](member)
  );
});

client.on("guildMemberRemove", member => {
  const canal = buscarCanal(member.guild, [
    "bye",
    "adios",
    "salida"
  ]);
  if (!canal) return;
  canal.send(
    mensajesDespedida[
      Math.floor(Math.random() * mensajesDespedida.length)
    ](member)
  );
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
      "Para usar a Softi debes aceptar los TOS:\n\nhttps://terminosycondicionesdeserv.jimdofree.com/"
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
// INTERACTIONS
// =====================
client.on("interactionCreate", async i => {
  if (i.isButton() && i.customId === "aceptoTOS") {
    if (!tosServers.includes(i.guild.id)) {
      tosServers.push(i.guild.id);
      fs.writeFileSync(
        "tos.json",
        JSON.stringify(tosServers)
      );
    }
    return i.reply({
      content: "TOS aceptado 💖",
      ephemeral: true
    });
  }

  if (!i.isChatInputCommand()) return;

  const cmd = client.commands.get(i.commandName);
  if (!cmd || !cmd.reply)
    return i.reply({
      content: "❌ Comando roto",
      ephemeral: true
    });

  const target = i.options.getUser("target");
  const reply = cmd.reply
    .replace("{user}", i.user.username)
    .replace("{target}", target ? target.username : "");

  await i.reply(reply);
});

// =====================
// MENSAJES + LEVEL UP
// =====================
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  // ---- LEVEL SYSTEM ----
  if (msg.guild) {
    const userId = msg.author.id;
    const now = Date.now();

    if (!levels[userId]) {
      levels[userId] = {
        level: 0,
        lastTalk: now
      };
      fs.writeFileSync(
        "levels.json",
        JSON.stringify(levels, null, 2)
      );
    } else if (
      now - levels[userId].lastTalk >= TALK_TIME
    ) {
      const oldLevel = levels[userId].level;
      levels[userId].level++;
      levels[userId].lastTalk = now;

      fs.writeFileSync(
        "levels.json",
        JSON.stringify(levels, null, 2)
      );

      const canalNivel = buscarCanalNivel(msg.guild);
      if (canalNivel) {
        canalNivel.send(
          `🎉 **${msg.author.username} ha subido de nivel ${oldLevel} a ${levels[userId].level}!**\n✨ ¡Felicidades!`
        );
      }
    }
  }

  // ---- DM IA ----
  if (msg.channel.isDMBased()) {
    if (!memory.has(msg.author.id)) {
      memory.set(msg.author.id, []);
      return msg.reply(
        "💖 Al hablar conmigo aceptas mis TOS:\nhttps://terminosycondicionesdeserv.jimdofree.com/"
      );
    }
    return msg.reply(
      await longcatAI(msg.content, msg.author.id)
    );
  }

  // ---- MENCION IA ----
  if (!msg.content.toLowerCase().includes("softi"))
    return;
  msg.reply(await longcatAI(msg.content, msg.author.id));
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
// 24/7
// =====================
const PORT = process.env.PORT || 3000;
http
  .createServer((_, res) => {
    res.writeHead(200);
    res.end("Softi activa 💖");
  })
  .listen(PORT);

client.login(TOKEN);
