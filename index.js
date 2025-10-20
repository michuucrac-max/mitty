import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection
} from '@discordjs/voice';
import play from 'play-dl';
import express from 'express';
import 'dotenv/config';

// === CONFIGURACIÓN DEL BOT ===
const TOKEN = process.env.TOKEN;
const TEXT_CHANNEL_NAME = "🎶-reproductor-de-musica";
const VOICE_CHANNEL_NAME = "🎶・música-y-relax";

// === CLIENTE DISCORD ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// === KEEP ALIVE PARA RENDER ===
const app = express();
app.get('/', (req, res) => res.send('🎀 Softti Tales está activa y lista para cantar 💖'));
app.listen(process.env.PORT || 3000, () => console.log('🩷 KeepAlive iniciado'));

// === SISTEMA DE MÚSICA ===
const player = createAudioPlayer();
let currentConnection = null;
let currentResource = null;

// === ESTADO DEL BOT ===
client.on('ready', () => {
  console.log(`🎀 Softti Tales conectada como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: '🎧 música kawaii', type: 2 }],
    status: 'online'
  });
});

// === COMANDOS DE MÚSICA ===
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.name !== TEXT_CHANNEL_NAME) return;

  const args = message.content.trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // === PLAY ===
  if (command === '!play') {
    const query = args.join(' ');
    if (!query) return message.reply('✨ Escribe el nombre o enlace de la canción.');

    const voiceChannel = message.guild.channels.cache.find(c => c.name === VOICE_CHANNEL_NAME && c.type === 2);
    if (!voiceChannel) return message.reply('💔 No encuentro el canal de voz.');

    try {
      // Conectarse o usar la conexión actual
      currentConnection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      // Buscar canción
      const [song] = await play.search(query, { limit: 1 });
      if (!song) return message.reply('🚫 No encontré esa canción.');

      const stream = await play.stream(song.url);
      const resource = createAudioResource(stream.stream, { inputType: stream.type });
      currentResource = resource;

      player.play(resource);
      currentConnection.subscribe(player);

      // Embed de información
      const embed = new EmbedBuilder()
        .setColor(0xFF80C0)
        .setTitle(`🎶 Reproduciendo: ${song.title}`)
        .setURL(song.url)
        .setThumbnail(song.thumbnail.url)
        .addFields(
          { name: 'Duración', value: song.durationRaw || '⏱️ Desconocida', inline: true },
          { name: 'Canal', value: song.channel.name || '🎵 Desconocido', inline: true }
        )
        .setFooter({ text: 'Softti Tales 💖', iconURL: client.user.displayAvatarURL() });

      message.channel.send({ embeds: [embed] });
      console.log(`▶️ Reproduciendo: ${song.title}`);

      player.once(AudioPlayerStatus.Idle, () => {
        message.channel.send('💤 La canción ha terminado.');
      });
    } catch (error) {
      console.error(error);
      message.reply('❌ Error al reproducir la canción.');
    }
  }

  // === PAUSE ===
  if (command === '!pause') {
    try {
      player.pause();
      message.reply('⏸️ Música pausada.');
    } catch (error) {
      console.error(error);
      message.reply('❌ No se pudo pausar.');
    }
  }

  // === RESUME ===
  if (command === '!resume') {
    try {
      player.unpause();
      message.reply('▶️ Música reanudada.');
    } catch (error) {
      console.error(error);
      message.reply('❌ No se pudo reanudar.');
    }
  }

  // === STOP ===
  if (command === '!stop') {
    try {
      const connection = getVoiceConnection(message.guild.id);
      if (connection) {
        player.stop();
        connection.destroy();
        message.reply('🛑 Detuve la música y salí del canal de voz.');
      } else {
        message.reply('⚠️ No estoy en ningún canal de voz.');
      }
    } catch (error) {
      console.error(error);
      message.reply('❌ Error al detener la música.');
    }
  }
});

// === LOGIN ===
client.login(TOKEN);
