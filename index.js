// index.js (versión robusta, logs y música + presence mejorado)
import 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection, NoSubscriberBehavior } from '@discordjs/voice';
import play from 'play-dl';
import express from 'express';

// ----------------- Config -----------------
const TOKEN = process.env.TOKEN;
if (!TOKEN) console.warn('⚠️ TOKEN no definido en environment variables.');

const TEXT_CHANNEL_NAME = '🎶-reproductor-de-musica'; // nombre texto (fallback)
const VOICE_CHANNEL_NAME = '🎶・música-y-relax';      // nombre voz (fallback)
// Si prefieres IDs, ponlos en ENV: MUSIC_TEXT_CHANNEL_ID, MUSIC_VOICE_CHANNEL_ID
const MUSIC_TEXT_CHANNEL_ID = process.env.MUSIC_TEXT_CHANNEL_ID || null;
const MUSIC_VOICE_CHANNEL_ID = process.env.MUSIC_VOICE_CHANNEL_ID || null;

// ----------------- Cliente -----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

// ----------------- Keep Alive -----------------
const app = express();
app.get('/', (_, res) => res.send('Softti Tales alive'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`KeepAlive: listening on ${PORT}`));

// ----------------- Estado / estados.json -----------------
let estados = [];
try {
  estados = JSON.parse(fs.readFileSync('./estados.json', 'utf8'));
  if (!Array.isArray(estados)) estados = [];
  console.log(`✅ estados.json cargado (${estados.length} estados)`);
} catch (e) {
  console.warn('⚠️ No se pudo cargar estados.json o no existe — usando fallback');
  estados = [];
}

// ----------------- Player global -----------------
const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
let currentConnection = null;
let currentSongInfo = null;

// Eventos globales del player
player.on('error', (err) => {
  console.error('Player error:', err);
});
player.on(AudioPlayerStatus.Playing, () => console.log('Player -> PLAYING'));
player.on(AudioPlayerStatus.Idle, () => {
  console.log('Player -> IDLE');
  // No desconectamos automáticamente; se podría desconectar si se desea.
});

// ----------------- Función: setPresence segura -----------------
function setRandomPresence() {
  try {
    const fallback = 'Softti cuidando corazones 💖';
    const estado = (estados.length > 0) ? estados[Math.floor(Math.random() * estados.length)] : fallback;
    // No uses client.users.cache.size si no quieres contar caches (puede ser 0)
    client.user.setPresence({
      activities: [{ name: `${estado} | kawaii`, type: ActivityType.Playing }],
      status: 'online'
    }).catch(err => console.error('Error setPresence:', err));
  } catch (e) {
    console.error('setRandomPresence error:', e);
  }
}

// ----------------- Helper: obtener canal (ID preferido) -----------------
function getTextChannel(guild) {
  if (MUSIC_TEXT_CHANNEL_ID) return guild.channels.cache.get(MUSIC_TEXT_CHANNEL_ID) || null;
  return guild.channels.cache.find(ch => ch.isTextBased() && ch.name === TEXT_CHANNEL_NAME) || null;
}
function getVoiceChannel(guild) {
  if (MUSIC_VOICE_CHANNEL_ID) return guild.channels.cache.get(MUSIC_VOICE_CHANNEL_ID) || null;
  return guild.channels.cache.find(ch => ch.type === 2 && ch.name === VOICE_CHANNEL_NAME) || null;
}

// ----------------- Función: reproducir música -----------------
async function reproducirMusica(message, query) {
  const textChannel = getTextChannel(message.guild);
  if (!textChannel) return message.reply('❌ No encontré el canal de texto para música (configura MUSIC_TEXT_CHANNEL_ID o crea el canal).');

  if (message.channel.id !== textChannel.id) {
    return message.reply(`🌸 Solo puedes pedir música en <#${textChannel.id}>`);
  }

  const voiceChannel = getVoiceChannel(message.guild);
  if (!voiceChannel) return message.reply('❌ No encontré el canal de voz para música (configura MUSIC_VOICE_CHANNEL_ID o crea el canal).');

  // Permisos
  const me = message.guild.members.me || (await message.guild.members.fetch(client.user.id));
  if (!voiceChannel.permissionsFor(me)?.has('Connect')) return message.reply('❌ No tengo permiso para conectarme al canal de voz.');
  if (!voiceChannel.permissionsFor(me)?.has('Speak')) return message.reply('❌ No tengo permiso para hablar en el canal de voz.');

  try {
    // Conectar
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator
    });
    currentConnection = connection;

    // Buscar o usar enlace
    let songInfo;
    if (play.yt_validate(query) === 'video') {
      const info = await play.video_basic_info(query);
      songInfo = {
        title: info.video_details.title,
        url: info.video_details.url,
        thumbnails: info.video_details.thumbnails || [],
        durationRaw: info.video_details.durationRaw || null,
        channel: { name: info.video_details.channel.name || null }
      };
    } else {
      const search = await play.search(query, { limit: 1 });
      if (!search || search.length === 0) return message.reply('😿 No encontré resultados para tu búsqueda.');
      songInfo = search[0];
    }

    console.log('Song found:', songInfo.title);

    // Intenta stream compatible con discord
    const stream = await play.stream(songInfo.url, { discordPlayerCompatibility: true });
    console.log('Stream type:', stream.type);

    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    player.play(resource);
    connection.subscribe(player);
    currentSongInfo = songInfo;

    // Embed informativo
    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle(`🎶 Reproduciendo ahora`)
      .setDescription(`**[${songInfo.title}](${songInfo.url})**`)
      .setThumbnail((songInfo.thumbnails && songInfo.thumbnails[0]) ? songInfo.thumbnails[0].url : null)
      .addFields(
        { name: 'Duración', value: songInfo.durationRaw || 'Desconocida', inline: true },
        { name: 'Pedido por', value: `<@${message.author.id}>`, inline: true }
      )
      .setFooter({ text: 'Softti Tales 💖' });

    await textChannel.send({ embeds: [embed] });
    return;
  } catch (err) {
    console.error('Error reproducirMusica:', err);
    return message.reply('❌ Error al intentar reproducir la canción. Revisa los logs.');
  }
}

// ----------------- Pausa / Resume / Stop -----------------
function pauseMusic(message) {
  if (player.state.status !== 'playing') return message.reply('No hay música sonando.');
  player.pause();
  return message.reply('⏸️ Música pausada.');
}
function resumeMusic(message) {
  if (player.state.status !== 'paused') return message.reply('No hay música pausada.');
  player.unpause();
  return message.reply('▶️ Música reanudada.');
}
function stopMusic(message) {
  const conn = getVoiceConnection(message.guild.id);
  if (!conn) return message.reply('No estoy en ningún canal de voz.');
  player.stop();
  try { conn.destroy(); } catch (_) {}
  return message.reply('🛑 Música detenida y desconecté del canal de voz.');
}

// ----------------- Eventos del cliente -----------------
client.on('ready', () => {
  console.log('✅ Bot listo:', client.user.tag);
  // intenta setear presencia incluso si estados vacíos
  setRandomPresence();
  setInterval(setRandomPresence, 1000 * 60 * 5);
});

// Comandos por texto simples
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    const content = (message.content || '').trim();
    const parts = content.split(/\s+/);
    const cmd = parts.shift()?.toLowerCase();

    if (cmd === '!play') {
      const query = parts.join(' ');
      if (!query) return message.reply('🎵 Usa: !play <nombre o enlace>');
      return reproducirMusica(message, query);
    }
    if (cmd === '!pause') return pauseMusic(message);
    if (cmd === '!resume') return resumeMusic(message);
    if (cmd === '!stop') return stopMusic(message);

    // Si necesitas la IA/responder a mensajes normales, la añadirás aquí (responderConIA)
  } catch (err) {
    console.error('messageCreate error:', err);
  }
});

// Maneja errores globales para no morir
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at Promise', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// ----------------- Login -----------------
client.login(TOKEN).catch(err => {
  console.error('Login falló:', err);
});
