import 'dotenv/config';
import { 
  Client, GatewayIntentBits, REST, Routes, Partials, ActivityType 
} from 'discord.js';
import fs from 'fs';
import fetch from 'node-fetch';
import { initAutoMod, checkMessage } from './automod.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import play from 'play-dl';

// --- Variables de entorno ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- Crear cliente ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel],
});

// --- Inicializar AutoMod ---
initAutoMod();

// --- Cargar archivos JSON ---
let comandos = [];
let estados = [];
try { comandos = JSON.parse(fs.readFileSync('./cmd.json', 'utf8')); } catch { console.warn('No se pudo cargar cmd.json'); }
try { estados = JSON.parse(fs.readFileSync('./estados.json', 'utf8')); } catch { console.warn('No se pudo cargar estados.json'); }

// --- Registrar comandos globales ---
const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registrarComandos() {
  const data = comandos.map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: [{ name: 'usuario', type: 6, description: 'El usuario objetivo', required: false }]
  }));
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: data });
    console.log('✅ Comandos registrados');
  } catch (err) {
    console.error(err);
  }
}

// --- IA kawaii ---
async function responderConIA(mensaje) {
  try {
    const prompt = `Eres Softti, una IA kawaii y tierna. Responde de forma dulce y coherente: "${mensaje}"`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
        max_output_tokens: 150
      })
    });
    const data = await response.json();
    return data.output?.[0]?.content?.[0]?.text || 'Awww 💖';
  } catch {
    return 'Ups... no pude responder >.<';
  }
}

// --- Análisis de imágenes ---
async function analizarImagen(attachment, message) {
  try {
    const imageUrl = attachment.url;
    const prompt = `Eres Softti. Describe kawaii esta imagen: ${imageUrl}`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [{ role: 'user', content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: imageUrl }
        ]}],
        max_output_tokens: 150
      })
    });
    const data = await response.json();
    await message.reply(data.output?.[0]?.content?.[0]?.text || 'Awww adorable 💖');
  } catch {
    try { await message.reply('Ups, no pude ver la imagen >.<'); } catch {}
  }
}

// --- Música ---
async function reproducirMusica(message, busqueda) {
  const canalTexto = message.channel.name === '🎶-reproductor-de-musica';
  if (!canalTexto) {
    return message.reply('🌸 Solo puedes pedir música en 🎶-reproductor-de-musica 💖');
  }

  const canalVoz = message.guild.channels.cache.find(c => c.name === '🎶・música-y-relax' && c.type === 2);
  if (!canalVoz) return message.reply('💔 No encontré el canal de voz 🎶・música-y-relax');

  const miembro = message.member;
  if (!miembro.voice.channel) return message.reply('🎧 Debes estar en un canal de voz para pedir música~');

  try {
    const conexion = joinVoiceChannel({
      channelId: canalVoz.id,
      guildId: canalVoz.guild.id,
      adapterCreator: canalVoz.guild.voiceAdapterCreator
    });

    const busquedaYT = await play.search(busqueda, { limit: 1 });
    if (!busquedaYT.length) return message.reply('💔 No encontré esa canción, nyan~');

    const stream = await play.stream(busquedaYT[0].url);
    const recurso = createAudioResource(stream.stream, { inputType: stream.type });
    const player = createAudioPlayer();

    conexion.subscribe(player);
    player.play(recurso);

    player.on(AudioPlayerStatus.Playing, () => {
      message.reply(`🎵 Reproduciendo: **${busquedaYT[0].title}** 💖`);
    });

    player.on('error', err => {
      console.error(err);
      message.reply('😿 Ocurrió un error al reproducir la canción...');
    });
  } catch (err) {
    console.error(err);
    message.reply('💔 No pude reproducir la canción...');
  }
}

// --- Ready ---
client.once('ready', () => {
  console.log(`🌸 Softti está en línea como ${client.user.tag}`);

  function cambiarEstado() {
    if (estados.length) {
      const estado = estados[Math.floor(Math.random() * estados.length)];
      client.user.setPresence({
        activities: [{ name: `${estado} | cuidando a ${client.users.cache.size} users 💖`, type: ActivityType.Playing }],
        status: 'online'
      });
    }
  }
  cambiarEstado();
  setInterval(cambiarEstado, 1000 * 60 * 5);
});

// --- Comandos Slash ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const cmd = comandos.find(c => c.name === interaction.commandName);
  if (!cmd) return;
  const user = interaction.user.username;
  const target = interaction.options.getUser('usuario')?.username || 'ellos mismos';
  await interaction.reply(cmd.response.replace('{user}', user).replace('{target}', target));
});

// --- Mensajes ---
client.on('messageCreate', async message => {
  try {
    if (message.author?.bot) return;

    // AutoMod
    const bloqueado = await checkMessage(message);
    if (bloqueado) return;

    // Música
    if (message.content.startsWith('!play')) {
      const busqueda = message.content.split(' ').slice(1).join(' ');
      if (!busqueda) return message.reply('💿 Escribe el nombre o enlace de la canción~');
      return reproducirMusica(message, busqueda);
    }

    // Imagenes
    if (message.attachments?.size) {
      for (const a of message.attachments.values()) {
        if (a.contentType?.startsWith('image/')) return analizarImagen(a, message);
      }
    }

    // IA
    const respuesta = await responderConIA(message.content);
    await message.reply(respuesta).catch(() => {});
  } catch (err) {
    console.error(err);
  }
});

// --- Iniciar ---
registrarComandos();
client.login(TOKEN);
