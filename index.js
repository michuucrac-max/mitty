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
// MEMORY IA
// =====================
const memory = new Map();

// =====================
// TOS MEMORIA
// =====================
let tosServers = [];
try {
  tosServers = JSON.parse(fs.readFileSync("tos.json", "utf8"));
} catch {
  tosServers = [];
}

// =====================
// YT RSS MEMORIA
// =====================
let ytMemory = {};
try {
  ytMemory = JSON.parse(fs.readFileSync("yt.json", "utf8"));
} catch {
  ytMemory = {};
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
// CARGAR CMD.JSON
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
// REGISTRAR SLASH
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
async function longcatAI(text, userId) {
  const history = memory.get(userId) ?? [];
  history.push({ role: "user", content: text });

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
          { role: "system", content: "Eres Softi, una IA kawaii y amable." },
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
  if (!client.user || !estados.length) return;
  client.user.setPresence({
    activities: [{ name: estados[Math.floor(Math.random() * estados.length)], type: 3 }],
    status: "online"
  });
}

// =====================
// BUSCAR CANAL
// =====================
function buscarCanal(guild, palabras) {
  return guild.channels.cache.find(c =>
    c.isTextBased() &&
    palabras.some(p => c.name.toLowerCase().includes(p))
  );
}

// =====================
// BIENVENIDA
// =====================
client.on("guildMemberAdd", member => {
  const canal = buscarCanal(member.guild, ["welcome", "bienvenido", "hola"]);
  if (canal) canal.send(`🌸 ¡Bienvenido/a ${member}! Disfruta el servidor 💖`);
});

// =====================
// DESPEDIDA
// =====================
client.on("guildMemberRemove", member => {
  const canal = buscarCanal(member.guild, ["bye", "adios", "despedida"]);
  if (canal) canal.send(`💔 ${member.user.tag} se ha ido...`);
});

// =====================
// TOS
// =====================
async function sendTOS(guild) {
  if (tosServers.includes(guild.id)) return;

  const channel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased());
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#ffb3d9")
    .setTitle("Términos de servicio")
    .setDescription("Debes aceptar los TOS:\nhttps://terminosycondicionesdeserv.jimdofree.com/");

  const button = new ButtonBuilder()
    .setCustomId("aceptoTOS")
    .setLabel("Aceptar")
    .setStyle(ButtonStyle.Success);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)]
  });
}

client.on("guildCreate", g => setTimeout(() => sendTOS(g), 3000));

// =====================
// INTERACTIONS (CMD + BOTÓN)
// =====================
client.on("interactionCreate", async i => {

  // BOTÓN TOS
  if (i.isButton() && i.customId === "aceptoTOS") {
    if (!tosServers.includes(i.guild.id)) {
      tosServers.push(i.guild.id);
      fs.writeFileSync("tos.json", JSON.stringify(tosServers));
    }
    return i.reply({ content: "TOS aceptado 💖", ephemeral: true });
  }

  // SLASH COMMANDS
  if (!i.isChatInputCommand()) return;

  const cmd = client.commands.get(i.commandName);
  if (!cmd) return;

  try {
    let msg = cmd.response ?? "Comando ejecutado 💖";

    if (cmd.mention && i.options.getUser("target")) {
      msg = msg.replace("{user}", `<@${i.options.getUser("target").id}>`);
    }

    await i.reply(msg);
  } catch {
    await i.reply({ content: "Error al ejecutar el comando", ephemeral: true });
  }
});

// =====================
// MENSAJES (IA SIN DUPLICADOS)
// =====================
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  // LOG
  try {
    const log = await client.channels.fetch(LOG_CHANNEL);
    if (log) log.send(`📩 ${msg.author.tag}: ${msg.content || "(sin texto)"}`);
  } catch {}

  // DM
  if (msg.channel.isDMBased()) {
    if (!memory.has(msg.author.id)) {
      memory.set(msg.author.id, []);
      return msg.reply("Al hablar conmigo aceptas mis TOS 💖");
    }
    return msg.reply(await longcatAI(msg.content, msg.author.id));
  }

  // SOLO SI MENCIONAN "softi"
  if (!msg.content.toLowerCase().includes("softi")) return;

  await msg.reply(await longcatAI(msg.content, msg.author.id));
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
// 24/7
// =====================
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Softi activa 💖");
}).listen(PORT);

// =====================
client.login(TOKEN);
