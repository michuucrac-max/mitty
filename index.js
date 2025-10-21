/**
 * index.js — Softti Tales (versión estable con slash commands)
 * Funcionalidad: IA, AutoMod, análisis de imágenes y comandos /
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
  Routes,
  SlashCommandBuilder
} from 'discord.js';
import { initAutoMod, checkMessage } from './automod.js';

// --- Paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Environment Variables (sin .env) ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- JSON Config ---
function safeReadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'));
  } catch {
    return [];
  }
}
const cmdJson = safeReadJSON('cmd.json');
const estadosJson = safeReadJSON('estados.json');

// --- Opcional: autoupdate y server ---
try { (await import('./autoupdate.js')).default || (await import('./autoupdate.js')); } catch {}
try { await import('./server.js'); } catch {}

// --- Cliente Discord ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

// --- Registro de Slash Commands ---
const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registrarComandos() {
  if (!CLIENT_ID || !cmdJson.length) return;

  const commands = cmdJson.map(cmd =>
    new SlashCommandBuilder()
      .setName(cmd.name)
      .setDescription(cmd.description || 'Comando kawaii de Softti')
      .addUserOption(opt =>
        opt.setName('usuario')
          .setDescription('Usuario objetivo')
          .setRequired(false)
      )
      .toJSON()
  );

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Comandos / registrados correctamente.');
  } catch (err) {
    console.error('❌ Error registrando comandos:', err);
  }
}

// --- Inicializar AutoMod ---
try {
  initAutoMod();
  console.log('🛡️ AutoMod inicializado correctamente.');
} catch (e) {
  console.warn('⚠️ No se pudo inicializar AutoMod:', e);
}

// --- IA de OpenAI ---
async function generarRespuestaIA(texto) {
  if (!OPENAI_API_KEY) return '💖 IA no disponible por ahora, nyan~';

  try {
    const prompt = `Eres Softti, una IA kawaii, tierna y amable. 
Responde dulcemente y de forma coherente, sin ser repetitiva. 
Mensaje recibido: ${texto}`;

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt }
            ]
          }
        ],
        max_output_tokens: 200
      })
    });

    const data = await res.json();
    return data.output?.[0]?.content?.[0]?.text || '💖';
  } catch (err) {
    console.error('Error OpenAI:', err);
    return 'Ups... no pude pensar nada bonito >.<';
  }
}

// --- Análisis de imágenes ---
async function analizarImagen(attachment, message) {
  if (!OPENAI_API_KEY)
    return message.reply('💖 No puedo analizar imágenes sin API configurada.');

  try {
    const prompt = 'Eres Softti, una IA kawaii. Describe esta imagen de forma dulce, sin inventar cosas:';

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
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

    const data = await res.json();
    const text = data.output?.[0]?.content?.[0]?.text || '💖 Se ve adorable~';
    await message.reply(text);
  } catch (err) {
    console.error('Error al analizar imagen:', err);
    await message.reply('Ups... no pude analizar la imagen >.<');
  }
}

// --- Respuestas a mensajes ---
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const guild = message.guild;
  if (guild) {
    try {
      if (await checkMessage(message)) return;
    } catch (err) {
      console.error('Error automod:', err);
    }
  }

  // Si el mensaje tiene imagen
  if (message.attachments.size > 0) {
    for (const att of message.attachments.values()) {
      if (att.contentType?.startsWith('image/') || att.url?.match(/\.(jpg|png|jpeg|gif|webp)$/i)) {
        await analizarImagen(att, message);
        return;
      }
    }
  }

  // Si mencionan a Softti
  if (message.mentions.has(client.user)) {
    const reply = await generarRespuestaIA(message.content);
    try { await message.reply(reply); } catch (e) { console.warn('Error al responder mención:', e); }
    return;
  }

  // Si le hablan por DM
  if (!guild) {
    const reply = await generarRespuestaIA(message.content);
    try { await message.reply(reply); } catch (e) { console.warn('Error al responder DM:', e); }
  }
});

// --- Responder Slash Commands ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const cmd = cmdJson.find(c => c.name === interaction.commandName);
  if (!cmd) return;

  const user = interaction.user.username;
  const target = interaction.options.getUser('usuario')?.username || 'ellos mismos';
  const respuesta = (cmd.response || '').replace('{user}', user).replace('{target}', target);

  try {
    await interaction.reply({ content: respuesta, ephemeral: false });
  } catch (err) {
    console.error('Error ejecutando comando:', err);
  }
});

// --- Presencia del bot ---
client.once('ready', () => {
  console.log(`🌸 Softti Tales en línea como ${client.user.tag}`);

  function actualizarEstado() {
    try {
      const estados = estadosJson.length ? estadosJson : ['🌸 cuidando corazones', '💖 dando abrazos digitales'];
      const estado = estados[Math.floor(Math.random() * estados.length)];
      client.user.setPresence({
        activities: [{ name: `${estado} | kawaii`, type: ActivityType.Playing }],
        status: 'online'
      });
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  }

  actualizarEstado();
  setInterval(actualizarEstado, 1000 * 60 * 5);
  registrarComandos().catch(console.error);
});

// --- Manejo de errores globales ---
process.on('unhandledRejection', (r, p) => console.error('Unhandled Rejection:', r));
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));

// --- Login ---
client.login(TOKEN).catch(err => console.error('❌ Error al iniciar sesión:', err));
