/**
 * index.js - Softti Tales Bot (con panel de configuración)
 * Funcionalidad: IA kawaii, AutoMod, comandos, y panel desde Discord
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  REST,
  Routes
} from 'discord.js';
import { initAutoMod, checkMessage } from './automod.js';
import { handleConfigCommand, ensureGuildConfig } from './softitales-config.js';

// --- Paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Environment ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- JSON Config ---
function safeReadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'));
  } catch {
    return null;
  }
}
const estadosJson = safeReadJSON('estados.json') || [];

// --- Discord Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- Registrar comandos globales ---
async function registrarComandosGlobales() {
  try {
    const data = [
      {
        name: 'softihug',
        description: 'Abraza suavemente a alguien 💖',
        options: [
          {
            name: 'usuario',
            type: 6,
            description: 'Usuario objetivo',
            required: false
          }
        ]
      }
    ];
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: data });
    console.log('✅ Comandos globales registrados');
  } catch (e) {
    console.error('Error registrar comandos:', e);
  }
}

// --- IA ---
async function generarRespuestaIA(mensaje) {
  if (!OPENAI_API_KEY) return '💖 IA no disponible';
  try {
    const prompt = `Eres Softi, una IA kawaii, dulce y amigable. Responde de forma tierna, coherente y adorable. Mensaje: ${mensaje}`;
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
        max_output_tokens: 200
      })
    });
    const data = await res.json();
    return data.output?.[0]?.content?.[0]?.text || '💖';
  } catch (e) {
    console.error('OpenAI error:', e);
    return 'Ups... no pude responder >.<';
  }
}

// --- Imagen ---
async function analizarImagenYResponder(attachment, message) {
  if (!OPENAI_API_KEY)
    return message.reply('💖 No puedo analizar la imagen (API no configurada).');
  try {
    const prompt = 'Eres Softi, una IA kawaii. Describe esta imagen con ternura:';
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: attachment.url }
            ]
          }
        ],
        max_output_tokens: 200
      })
    });
    const data = await response.json();
    const text = data.output?.[0]?.content?.[0]?.text || '💖 Se ve adorable';
    await message.reply(text);
  } catch (e) {
    console.error('analizarImagen error:', e);
    await message.reply('Ups... no pude analizar la imagen >.<');
  }
}

// --- Mensajes ---
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const guild = message.guild;
  const guildId = guild?.id;
  const config = guild ? ensureGuildConfig(guildId) : null;

  // Si es canal de configuración
  if (guild && message.channel.name === 'softitales-config') {
    const member = guild.members.cache.get(message.author.id);
    if (member?.roles.cache.some((r) => r.name.toLowerCase() === 'owner')) {
      await handleConfigCommand(message, config, guildId);
    } else {
      message.reply('⚠️ Solo los que tienen el rol Owner pueden usar este canal.');
    }
    return;
  }

  // AutoMod
  if (guild) try { if (await checkMessage(message)) return; } catch {}

  // Imagen
  if (message.attachments.size > 0) {
    for (const att of message.attachments.values()) {
      if (
        att.contentType?.startsWith('image/') ||
        att.url?.match(/\.(jpg|png|jpeg|gif|webp)$/i)
      ) {
        await analizarImagenYResponder(att, message);
        return;
      }
    }
  }

  // Slash commands
  if (message.content.startsWith('/')) {
    const cmd = message.content.slice(1).trim().split(/\s+/)[0];
    if (cmd === 'softihug') {
      const target = message.mentions.users.first()?.username || 'alguien';
      return message.reply(`${message.author.username} le da un abrazo a ${target} 💕`);
    }
  }

  // IA normal
  if (!guild || (config && config.automod !== false)) {
    const reply = await generarRespuestaIA(message.content);
    await message.reply(reply).catch(() => {});
  }
});

// --- Ready ---
client.once('ready', () => {
  console.log(`🌸 Softti Tales conectado como ${client.user.tag}`);
  function setPresenceSafe() {
    try {
      const estados = estadosJson.length
        ? estadosJson
        : ['🌸 cuidando corazones', '💖 abrazos digitales'];
      const estado = estados[Math.floor(Math.random() * estados.length)];
      client.user.setPresence({
        activities: [{ name: `${estado} | kawaii`, type: ActivityType.Playing }],
        status: 'online'
      });
    } catch (err) {
      console.error('Error setPresenceSafe:', err);
    }
  }
  setPresenceSafe();
  setInterval(setPresenceSafe, 1000 * 60 * 5);
  registrarComandosGlobales();
});

client.login(TOKEN);
