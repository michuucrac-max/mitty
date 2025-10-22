// ==========================
//  index.js — Softti Tales Bot
// ==========================
import fs from 'fs';
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
  setInterval(setRandomPresence, 60000);
  reloadCmds();
  autoupdate(client);
});

// --------------------------
//  Manejo de mensajes y IA
// --------------------------
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const userId = message.author.id;

  // --- AutoMod ---
  if (await checkMessage(message)) return;

  // --- Owner Panel ---
  if ((content.startsWith('/softihelp') || content.startsWith('/softihelpmod'))) {
    if (userId === OWNER_ID) {
      await showHelpPanel(message);
    } else {
      await message.reply('⚠️ Solo el Owner puede usar este comando.');
    }
    return;
  }

  // --- Comandos cmd.json ---
  if (content.startsWith('/')) {
    const args = content.slice(1).split(' ');
    const cmdName = args[0].toLowerCase();

    if (cmdData[cmdName]) {
      const responseTemplate = cmdData[cmdName].response || cmdData[cmdName];
      const response = responseTemplate
        .replace(/{user}/g, message.author.username)
        .replace(/{target}/g, args[1] || 'alguien');
      await message.reply(response);
      return;
    }

    // Configuración del servidor
    if (userId === OWNER_ID) {
      const handled = await handleGuildConfigMessage(message.guild?.id || 'dm', message);
      if (handled) return;
    }
  }

  // --- Guardar notas en memoria ---
  if (content.toLowerCase().startsWith('recordar:')) {
    const note = content.split(':').slice(1).join(':').trim();
    memoria[userId] = memoria[userId] || [];
    memoria[userId].push(note);
    saveJSON(memoriaFile, memoria);
    await message.reply('💾 Nota guardada en tu memoria kawaii!');
    return;
  }

  // --- Actualizar conversaciones ---
  conversaciones[userId] = conversaciones[userId] || [];
  conversaciones[userId].push({ role: 'user', content });

  // --- Preparar contexto IA ---
  const context = [...conversaciones[userId]];

  if (memoria[userId]) {
    context.push({ role: 'system', content: `El usuario ha guardado esto: ${memoria[userId].join(', ')}` });
  }

  // --- Respuesta IA kawaii/furry/uwu ---
  try {
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: context,
    });

    const reply = aiResponse.choices[0].message.content;

    conversaciones[userId].push({ role: 'assistant', content: reply });
    saveJSON(conversacionesFile, conversaciones);

    await message.reply(reply);
  } catch (err) {
    console.error('❌ Error IA:', err);
    await message.reply('⚠️ Algo salió mal con la IA, intenta de nuevo.');
  }
});

// --------------------------
//  Login
// --------------------------
client.login(TOKEN).catch((err) => console.error('❌ Error iniciando bot:', err));
