// ==========================
//  index.js — Softti Tales Bot
// ==========================
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import OpenAI from 'openai';
import autoupdate from './autoupdate.js';
import { initAutoMod, checkMessage } from './automod.js';
import { handleGuildConfigMessage, showHelpPanel } from './softitales-config.js';

// --------------------------
//  Configuración de cliente
// --------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --------------------------
//  Archivos JSON auxiliares
// --------------------------
const cmdFile = './cmd.json';
const conversacionesFile = './conversaciones.json';
const memoriaFile = './memoria.json';
const estadosFile = './estados.json';

function loadJSON(file, defaultData = {}) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadArrayJSON(file, defaultData = []) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// --------------------------
//  Datos dinámicos
// --------------------------
let cmdData = loadJSON(cmdFile, {});
let conversaciones = loadJSON(conversacionesFile, {});
let memoria = loadJSON(memoriaFile, {});
let estados = loadArrayJSON(estadosFile, []);

// --------------------------
//  Funciones auxiliares
// --------------------------
function reloadCmds() {
  cmdData = loadJSON(cmdFile, {});
  console.log('🔄 Comandos recargados:', Object.keys(cmdData));
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --------------------------
//  Estado dinámico
// --------------------------
function setRandomPresence() {
  if (!estados.length) return;
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setPresence({ activities: [{ name: estado, type: 3 }] });
}

// --------------------------
//  Eventos del bot
// --------------------------
client.on('ready', async () => {
  console.log(`💖 Softti Tales Bot listo — Conectado como ${client.user.tag}`);
  initAutoMod();
  setRandomPresence();
  setInterval(setRandomPresence, 60000); // cada minuto
  reloadCmds();
  autoupdate(client);
});

// --------------------------
//  Manejo de mensajes
// --------------------------
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // --- AutoMod ---
  if (await checkMessage(message)) return;

  const content = message.content.trim();

  // --- Panel /softihelp ---
  if (content.startsWith('/softihelp') || content.startsWith('/softihelpmod')) {
    if (message.author.id === OWNER_ID) {
      await showHelpPanel(message);
    } else {
      await message.reply('⚠️ Solo el Owner puede usar este comando.');
    }
    return;
  }

  // --- Comandos /softi ---
  if (content.startsWith('/')) {
    const args = content.slice(1).split(' ');
    const cmdName = args[0].toLowerCase();

    // Comandos cargados desde cmd.json
    if (cmdData[cmdName]) {
      const responseTemplate = cmdData[cmdName].response || cmdData[cmdName];
      const response = responseTemplate
        .replace(/{user}/g, message.author.username)
        .replace(/{target}/g, args[1] || 'alguien');
      await message.reply(response);
      return;
    }

    // Configuración de servidor /softi commands
    if (OWNER_ID === message.author.id) {
      const handled = await handleGuildConfigMessage(message.guild?.id || 'dm', message);
      if (handled) return;
    }
  }

  // --- Respuestas IA kawaii ---
  const lowerContent = content.toLowerCase();
  for (let trigger in conversaciones) {
    if (lowerContent.includes(trigger.toLowerCase())) {
      let reply = conversaciones[trigger];
      // puedes integrar memoria u OpenAI aquí si quieres
      await message.reply(reply);
      return;
    }
  }

  // --- Memoria simple ---
  if (content.toLowerCase().includes('recordar:')) {
    const note = content.split(':').slice(1).join(':').trim();
    memoria[message.author.id] = memoria[message.author.id] || [];
    memoria[message.author.id].push(note);
    saveJSON(memoriaFile, memoria);
    await message.reply('💾 Nota guardada en tu memoria kawaii!');
    return;
  }
});

// --------------------------
//  Login
// --------------------------
client.login(TOKEN).catch((err) => console.error('❌ Error iniciando bot:', err));
