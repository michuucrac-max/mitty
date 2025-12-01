// 🌸 index.js — Softti Tales Bot SIN OpenAI
import fs from 'fs';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import keepAlive from './server.js';
import { checkMessage } from './automod.js';
import { getGuildSettings, handleGuildConfigMessage } from './softitales-config.js';

// --- KeepAlive ---
keepAlive();

// --- Cargar archivos JSON ---
function load(file, fallback = {}) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

let globalCommands = load("./cmd.json", {});
let guildCommands = load("./guildCommands.json", {});
let estadosKawaii = load("./estados.json", ["ronroneando UwU", "abrazando gatitos 🐾"]);

// --- Cliente ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// --- Log bonito ---
function log(t, d) { 
  console.log(`[${new Date().toISOString()}] [${t}]`, d); 
}

// --- Eventos ---
client.on("messageCreate", async message => {
  try {
    if (message.author.bot) return;

    const guildId = message.guild?.id;

    // AutoMod
    if (await checkMessage(message)) return;

    // Config panel
    if (await handleGuildConfigMessage(guildId, message)) return;

    // -----------------------------
    // 🔥 DETECTOR DE COMANDOS REAL
    // -----------------------------
    // Detecta: {/comando}
    const cmdRegex = /^\s*\{\/([a-zA-Z0-9_-]+)\}/;
    const match = message.content.match(cmdRegex);

    if (match) {
      const cmdName = match[1].toLowerCase();
      let response = null;

      // Comando del servidor
      if (guildId && guildCommands[guildId] && guildCommands[guildId][cmdName]) {
        response = guildCommands[guildId][cmdName];
      }
      // Comando global
      else if (globalCommands[cmdName]) {
        response = globalCommands[cmdName];
      }

      if (!response) {
        await message.reply(`❌ Ese comando no existe: {/${cmdName}}`);
        return;
      }

      // Reemplazo de variables
      response = response
        .replace(/{player}/g, message.author.username)
        .replace(/{player2}/g, message.mentions.users.first()?.username || "nadie")
        .replace(/{guild}/g, message.guild?.name || "este servidor")
        .replace(/{channel}/g, message.channel?.name || "este canal");

      await message.reply(response);
      log("CMD", `Ejecutado: {/${cmdName}} en ${message.guild?.name}`);
      return;
    }

    // -----------------------------
    // IA eliminada — Respuesta básica
    // -----------------------------
    if (message.mentions.has(client.user.id)) {
      await message.reply(`Holaaa ${message.author.username} uwu ✨`);
      return;
    }

    // -----------------------------
    // Imágenes detectadas
    // -----------------------------
    if (message.attachments.size > 0) {
      const img = [...message.attachments.values()].find(a => a.contentType?.startsWith("image"));
      if (img) {
        await message.reply(`¡Aww qué imagen tan linda! 🌸`);
        log("IMG", `Imagen de ${message.author.tag}`);
      }
    }

  } catch (err) {
    log("Error", err);
  }
});

// --- Estados kawaii ---
client.on("ready", () => {
  console.log(`🌸 Softti Tales ON como ${client.user.tag}`);

  const update = () => {
    const s = estadosKawaii[Math.floor(Math.random() * estadosKawaii.length)];
    client.user.setActivity(s, { type: 0 });
  };

  update();
  setInterval(update, 20000);
});

// --- LOGIN ---
client.login(process.env.TOKEN);
