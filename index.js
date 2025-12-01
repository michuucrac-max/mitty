// 🌸 index.js — Softti Tales Bot SIN OpenAI
import fs from 'fs';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import keepAlive from './server.js';
import { checkMessage } from './automod.js';
import { getGuildSettings, handleGuildConfigMessage } from './softitales-config.js';

// --- Mantener vivo ---
keepAlive();

// --- Archivos JSON ---
const CMD_FILE = './cmd.json';
const GUILD_CMD_FILE = './guildCommands.json';
const STATES_FILE = './estados.json';

function loadOrCreate(file, defaultValue = {}) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// --- Cargar JSONs desde archivos ---
let globalCommands = loadOrCreate(CMD_FILE, {});
let guildCommands = loadOrCreate(GUILD_CMD_FILE, {});
let estadosKawaii = loadOrCreate(STATES_FILE, [
  "ronroneando UwU",
  "abrazando gatitos 🐾"
]);

// --- Cliente Discord ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// --- Logging ---
function logInfo(type, details) {
  console.log(`[${new Date().toISOString()}] [${type}]`, details);
}

// --- Anti error global ---
process.on('unhandledRejection', err => logInfo('UnhandledRejection', err));
process.on('uncaughtException', err => logInfo('UncaughtException', err));

// --- Lógica principal ---
client.on('messageCreate', async message => {
  try {
    if (message.author.bot) return;

    const guildId = message.guild?.id;

    // 1) AutoMod
    const blocked = await checkMessage(message);
    if (blocked) return;

    // 2) Panel de config
    const handled = await handleGuildConfigMessage(guildId, message);
    if (handled) return;

    // --- 3) DETECTOR EXACTO DE COMANDOS FORMATO {/comando} ---
    const text = message.content.trim();

    // Busca algo como:  {/hola}
    const cmdMatch = text.match(/^\{\/([a-zA-Z0-9_-]+)\}/);

    if (cmdMatch) {
      const cmdName = cmdMatch[1].toLowerCase();
      let response;

      // Prioridad: comando del servidor
      if (guildId && guildCommands[guildId] && guildCommands[guildId][cmdName]) {
        response = guildCommands[guildId][cmdName];
      }
      // Global
      else if (globalCommands[cmdName]) {
        response = globalCommands[cmdName];
      }

      if (!response) {
        await message.reply(`❌ El comando {/${cmdName}} no existe.`);
        return;
      }

      // Reemplazo de placeholders
      let replyText = response
        .replace(/{playera}/g, message.author.username)
        .replace(/{player2}/g, message.mentions.users.first()?.username || "nadie")
        .replace(/{guild}/g, message.guild?.name || "este servidor")
        .replace(/{channel}/g, message.channel?.name || "este canal");

      await message.reply(replyText);
      logInfo("Command", `Comando ejecutado: {/${cmdName}}`);
      return;
    }

    // --- 4) Respuesta básica cuando mencionan al bot ---
    if (message.mentions.has(client.user.id)) {
      await message.reply(`Holaaa ${message.author.username} uwu ✨ ¿me llamabas?`);
      return;
    }

    // --- 5) Detectar imágenes ---
    if (message.attachments.size > 0) {
      for (const att of message.attachments.values()) {
        if (att.contentType?.startsWith('image')) {
          await message.reply(`¡Qué imagen tan bonita, ${message.author.username}! 🌸`);
        }
      }
    }

  } catch (err) {
    logInfo("Error", err);
  }
});

// --- Estados kawaii ---
client.on('ready', () => {
  console.log(`🌸 Softti Tales encendida como ${client.user.tag}`);

  function cambiarEstado() {
    if (!estadosKawaii.length) return;
    const random = estadosKawaii[Math.floor(Math.random() * estadosKawaii.length)];
    client.user.setActivity(random, { type: 0 });
  }

  cambiarEstado();
  setInterval(cambiarEstado, 20000);
});

// --- LOGIN ---
client.login(process.env.TOKEN);
