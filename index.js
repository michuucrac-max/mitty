// ==========================
//        index.js
// ==========================
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import fs from 'fs';
import path from 'path';
import autoupdate from './autoupdate.js';
import * as automod from './automod.js';
import * as guildConfig from './server.js'; // manejador de /softi commands y config
import OpenAI from 'openai';

// ==========================
//  Configuración de variables
// ==========================
const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!TOKEN || !OWNER_ID || !OPENAI_API_KEY) {
  console.error('❌ Faltan variables de entorno: TOKEN, OWNER_ID, OPENAI_API_KEY');
  process.exit(1);
}

// ==========================
//   Inicialización Discord
// ==========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// ==========================
//  Inicialización OpenAI
// ==========================
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ==========================
//   Variables globales
// ==========================
let comandos = {}; // cargados desde cmd.json
const conversacionesFile = './conversaciones.json';
const memoriaFile = './memoria.json';
const estadosFile = './estados.json';

// ==========================
//   Cargar JSON auxiliares
// ==========================
function loadJSON(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadArrayJSON(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

conversaciones = loadJSON(conversacionesFile);
memoria = loadJSON(memoriaFile);
estados = loadArrayJSON(estadosFile);

// ==========================
//   Autoupdate
// ==========================
autoupdate(client);

// ==========================
//   AutoMod
// ==========================
automod.initAutoMod();

// ==========================
//   Cargar comandos
// ==========================
function loadCommands() {
  const file = './cmd.json';
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
  comandos = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('📜 Comandos cargados:');
  Object.keys(comandos).forEach(c => console.log(` - ${c}: ${comandos[c].description || 'sin descripción'}`));
}

// Inicial carga
loadCommands();

// ==========================
//   Estados dinámicos
// ==========================
function changeStatus() {
  if (!estados.length) return;
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setPresence({ activities: [{ name: estado, type: 3 }] });
}
setInterval(changeStatus, 60_000); // cada minuto
client.once('ready', () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
  changeStatus();
});

// ==========================
//   Mensajes
// ==========================
client.on('messageCreate', async (message) => {
  try {
    // Ignorar bots
    if (message.author.bot) return;

    // --- AutoMod ---
    const bloqueado = await automod.checkMessage(message);
    if (bloqueado) return;

    // --- Owner comandos /softi ---
    const isOwner = message.author.id === OWNER_ID;
    if (message.content.startsWith('/softi')) {
      const handled = await guildConfig.handleGuildConfigMessage(message.guild?.id || message.author.id, message);
      if (handled) return;
    }

    // --- Comandos de cmd.json ---
    if (message.content.startsWith('/')) {
      const cmdName = message.content.slice(1).split(' ')[0];
      const cmd = comandos[cmdName];
      if (cmd) {
        let response = cmd.response || '✨ Comando ejecutado';
        const target = message.mentions.users.first()?.username || 'amig@';
        response = response.replace('{user}', message.author.username).replace('{target}', target);
        await message.reply(response);
        return;
      }
    }

    // --- Respuesta IA kawaii ---
    const prompt = `Responde kawaii, furry, uwu, con ternura y diversión a: ${message.content}\nRespuesta:`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 1,
      max_tokens: 200,
    });
    const aiResponse = completion.choices[0].message.content.trim();
    if (aiResponse) await message.reply(aiResponse);

    // Guardar memoria
    memoria[message.author.id] = memoria[message.author.id] || [];
    memoria[message.author.id].push({ user: message.content, ai: aiResponse });
    fs.writeFileSync(memoriaFile, JSON.stringify(memoria, null, 2));

  } catch (err) {
    console.error('❌ Error en messageCreate:', err);
  }
});

// ==========================
//   Iniciar bot
// ==========================
client.login(TOKEN);
