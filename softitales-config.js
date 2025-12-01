// -------------------------
// SOFTI TALES — SOFTITALES-CONFIG.JS (Configuración Servidor)
// -------------------------

import fs from "fs";
import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import { config } from "dotenv";
config({ path: "./environments" });

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const CLIENT_ID = process.env.CLIENT_ID;

// ============================
// Archivos JSON
// ============================
const SECURITY_FILE = "./security_manager.json";
const GUILD_COMMANDS_FILE = "./guildCommands.json";

function loadOrCreate(file, defaultValue) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

let security = loadOrCreate(SECURITY_FILE, {
  palabrasProhibidas: [],
  bloqueoLinks: true,
  antispam: { maxMensajes: 5, intervaloMs: 5000, timeoutSegundos: 3600, advertencia: "" },
  mensajes: { 
    bloqueo: "🚫 Nya~ ¡no puedes decir eso, {usuario}! 🐾", 
    link: "🔗 Nya~ no puedes enviar enlaces externos, {usuario} uwu 💖"
  }
});
let guildCommands = loadOrCreate(GUILD_COMMANDS_FILE, {});

// ============================
// Cliente Discord
// ============================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
const slashCommands = [];

// ============================
// Cargar comandos del servidor
// ============================
function loadGuildCommands(guildId) {
  if (!guildCommands[guildId]) guildCommands[guildId] = [];
  return guildCommands[guildId];
}

// ============================
// Guardar cambios
// ============================
function saveSecurity() { fs.writeFileSync(SECURITY_FILE, JSON.stringify(security, null, 2)); }
function saveGuildCommands() { fs.writeFileSync(GUILD_COMMANDS_FILE, JSON.stringify(guildCommands, null, 2)); }

// ============================
// Registrar slash commands solo en ese servidor
// ============================
async function registerSlashCommands(guildId) {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  const cmds = loadGuildCommands(guildId);
  const body = cmds.map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: [{ name: "target", description: "Menciona a alguien", type: 6, required: true }]
  }));

  try {
    console.log(`Registrando slash commands para el servidor ${guildId}…`);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body });
    console.log(`Comandos registrados para ${guildId} ✔`);
  } catch (err) {
    console.error("Error registrando comandos:", err);
  }
}

// ============================
// Canal de registro de incidencias
// ============================
async function logIncident(message, tipo) {
  const guild = message.guild;
  if (!guild) return;

  const logChannel = guild.channels.cache.find(c => c.name === "softitales-config" && c.isTextBased());
  if (!logChannel) return;

  const embed = {
    color: tipo === "palabra" ? 0xff0000 : 0xffa500,
    title: "⚠️ Incidencia de AutoMod",
    fields: [
      { name: "Usuario", value: `<@${message.author.id}>` },
      { name: "Tipo", value: tipo === "palabra" ? "Palabra prohibida" : "Link" },
      { name: "Contenido", value: message.content }
    ],
    timestamp: new Date()
  };

  logChannel.send({ embeds: [embed] }).catch(console.error);
}

// ============================
// Función AutoMod
// ============================
function checkMessage(message) {
  const content = message.content.toLowerCase();
  const userTag = `<@${message.author.id}>`;

  // Bloqueo palabras prohibidas
  if (security.palabrasProhibidas.some(p => content.includes(p.toLowerCase()))) {
    message.reply(security.mensajes.bloqueo.replace("{usuario}", userTag));
    logIncident(message, "palabra");
    return true;
  }

  // Bloqueo links
  if (security.bloqueoLinks) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    if (urlRegex.test(content)) {
      message.reply(security.mensajes.link.replace("{usuario}", userTag));
      logIncident(message, "link");
      return true;
    }
  }

  return false;
}

// ============================
// Eventos
// ============================
client.once(Events.ClientReady, () => {
  console.log(`✨ Softi Tales Config activo como ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: "Configurando servidores 🌸", type: 0 }], status: "online" });
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  const guildId = message.guild?.id;
  if (!guildId) return;

  // ================= AutoMod para todos =================
  checkMessage(message);

  // ================= Solo canal softitales-config =================
  if (message.channel.name !== "softitales-config") return;
  if (message.author.id !== OWNER_ID) return;

  const args = message.content.trim().split(" ");

  // ================= Configuración AutoMod =================
  if (args[0] === "/automod") {
    if (args[1] === "on") { security.bloqueoLinks = true; saveSecurity(); message.reply("✅ AutoMod activado"); }
    if (args[1] === "off") { security.bloqueoLinks = false; saveSecurity(); message.reply("⚠️ AutoMod desactivado"); }
  }

  // ================= Agregar Comando =================
  if (args[0] === "/addcmd") {
    const name = args[1];
    const description = args.slice(2).join(" ");
    if (!name || !description) return message.reply("⚠️ Uso: /addcmd nombre descripción");

    guildCommands[guildId] = guildCommands[guildId] || [];
    guildCommands[guildId].push({ name, description, response: "¡Hola {target}!" });
    saveGuildCommands();
    await registerSlashCommands(guildId);
    message.reply(`✨ Comando **/${name}** agregado al servidor`);
  }

  // ================= Agregar Palabra Prohibida =================
  if (args[0] === "/addword") {
    const palabra = args[1];
    if (!palabra) return message.reply("⚠️ Uso: /addword palabra");
    if (!security.palabrasProhibidas.includes(palabra.toLowerCase())) {
      security.palabrasProhibidas.push(palabra.toLowerCase());
      saveSecurity();
      message.reply(`🚫 Palabra prohibida agregada: **${palabra}**`);
    } else {
      message.reply(`⚠️ La palabra **${palabra}** ya está en la lista`);
    }
  }

  // ================= Eliminar Palabra Prohibida =================
  if (args[0] === "/removeword") {
    const palabra = args[1];
    if (!palabra) return message.reply("⚠️ Uso: /removeword palabra");
    const index = security.palabrasProhibidas.indexOf(palabra.toLowerCase());
    if (index !== -1) {
      security.palabrasProhibidas.splice(index, 1);
      saveSecurity();
      message.reply(`✅ Palabra prohibida eliminada: **${palabra}**`);
    } else {
      message.reply(`⚠️ La palabra **${palabra}** no existe`);
    }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const guildId = interaction.guildId;
  const cmds = loadGuildCommands(guildId);
  const cmd = cmds.find(c => c.name === interaction.commandName);
  if (!cmd) return;

  const player = interaction.user;
  const target = interaction.options.getUser("target");
  let response = cmd.response.replaceAll("{user}", `<@${player.id}>`).replaceAll("{target}", `<@${target.id}>`);
  try { await interaction.reply(response); } catch (err) { console.error(err); }
});

// ============================
// Login
// ============================
client.login(TOKEN);
