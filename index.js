import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, Partials, ActivityType } from 'discord.js';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import autoMod from './automod.js'; // ✅ Importamos AutoMod

// 🔧 Configuración básica
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🦊 Crear cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel],
});

// Inicializar AutoMod
autoMod(client);

// 📁 Rutas de archivos
const comandosPath = path.join(__dirname, 'cmd.json');
const estadosPath = path.join(__dirname, 'estados.json');

// 📜 Cargar archivos
let comandos = [];
let estados = [];

try {
  comandos = JSON.parse(fs.readFileSync(comandosPath, 'utf8'));
  console.log(`✅ ${comandos.length} comandos cargados desde cmd.json`);
} catch (e) {
  console.error('❌ Error al cargar cmd.json:', e);
}

try {
  estados = JSON.parse(fs.readFileSync(estadosPath, 'utf8'));
  console.log(`✅ ${estados.length} estados cargados desde estados.json`);
} catch (e) {
  console.error('❌ Error al cargar estados.json:', e);
}

// ⚙️ Registrar comandos slash globales
const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registrarComandos() {
  try {
    const data = comandos.map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      options: [
        {
          name: 'usuario',
          type: 6,
          description: 'El usuario objetivo',
          required: false,
        },
      ],
    }));

    // Registrar globalmente para que estén disponibles en cualquier DM o servidor
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: data });
    console.log('✅ Comandos registrados globalmente');
  } catch (error) {
    console.error('❌ Error al registrar comandos:', error);
  }
}

// 🧠 Analizar imágenes con coherencia
async function analizarImagen(attachment, message) {
  try {
    const imageUrl = attachment.url;
    const prompt = `
      Eres Softi, una IA tierna y kawaii. 
      Observa esta imagen y descríbela con ternura y coherencia, 
      sin inventar cosas que no estén allí, y usando un tono suave.
    `;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageUrl },
            ],
          },
        ],
        max_output_tokens: 150,
      }),
    });

    const data = await response.json();
    const respuesta = data.output?.[0]?.content?.[0]?.text || 'Aww... no estoy segura, pero se ve adorable 💖';
    await message.reply(respuesta);
  } catch (error) {
    console.error('❌ Error al analizar imagen:', error);
    await message.reply('Ups... no pude ver bien la imagen >.<');
  }
}

// 💬 Responder con coherencia
async function responderConIA(mensaje) {
  try {
    const prompt = `
      Eres Softi, una IA kawaii, amigable y tierna.
      Responde al mensaje de forma coherente, dulce y amable.
      Evita respuestas genéricas o sin contexto, responde naturalmente.
      Mensaje: "${mensaje}"
    `;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
        max_output_tokens: 150,
      }),
    });

    const data = await response.json();
    return data.output?.[0]?.content?.[0]?.text || 'Awww 💖';
  } catch (error) {
    console.error('❌ Error al generar respuesta IA:', error);
    return 'Ups... creo que me quedé sin palabras >.<';
  }
}

// 🩷 Al iniciar el bot
client.once('ready', () => {
  console.log(`🌸 Softi está en línea como ${client.user.tag}`);

  function cambiarEstado() {
    if (estados.length > 0) {
      const estado = estados[Math.floor(Math.random() * estados.length)];
      const servers = client.guilds.cache.size;
      const users = client.users.cache.size;
      client.user.setPresence({
        activities: [{
          name: `${estado} | cuidando a ${users} users en ${servers} servidores 💖`,
          type: ActivityType.Playing
        }],
        status: 'online',
      });
    }
  }

  cambiarEstado();
  setInterval(cambiarEstado, 1000 * 60 * 5);
});

// 🎀 Comandos slash
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const cmd = comandos.find(c => c.name === interaction.commandName);
  if (!cmd) return;

  const user = interaction.user.username;
  const target = interaction.options.getUser('usuario')?.username || 'ellos mismos';

  const respuesta = cmd.response.replace('{user}', user).replace('{target}', target);
  await interaction.reply(respuesta);
});

// 🧸 Mensajes normales y DMs
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // 📸 Responder a imágenes
  if (message.attachments.size > 0) {
    for (const attachment of message.attachments.values()) {
      if (attachment.contentType?.startsWith('image/')) {
        return analizarImagen(attachment, message);
      }
    }
  }

  // 💌 Responder a cualquier mensaje, sea DM de cualquier usuario o canal
  const respuesta = await responderConIA(message.content);
  await message.reply(respuesta);
});

// 🚀 Iniciar bot
registrarComandos();
client.login(TOKEN);
