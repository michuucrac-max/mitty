import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder
} from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
  NoSubscriberBehavior
} from '@discordjs/voice';
import express from 'express';
import play from 'play-dl';
import ffmpeg from 'ffmpeg-static';
import fetch from 'node-fetch';

// === 🌸 CONFIGURACIÓN DEL CLIENTE ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

// === 💖 SERVIDOR KEEP ALIVE ===
const app = express();
app.get('/', (req, res) => res.send('🌸 Softti Tales activo 💕'));
app.listen(3000, () => console.log('✅ KeepAlive activo en puerto 3000'));

// === 🎵 REPRODUCTOR DE MÚSICA ===
const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play
  }
});

// Guardamos la canción actual
let currentSong = null;

// === 🪄 FUNCIÓN PARA REPRODUCIR ===
async function playMusic(message, query) {
  const textChannel = message.guild.channels.cache.find(
    ch => ch.name === '🎶-reproductor-de-musica'
  );
  const voiceChannel = message.guild.channels.cache.find(
    ch => ch.name === '🎶・música-y-relax'
  );

  if (!textChannel || !voiceChannel)
    return message.reply('❌ No encontré los canales de música configurados.');

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator
  });

  try {
    const search = await play.search(query, { limit: 1 });
    if (!search.length) return message.reply('😿 No encontré esa canción.');

    const song = search[0];
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });

    currentSong = song;
    player.play(resource);
    connection.subscribe(player);

    const embed = new EmbedBuilder()
      .setColor('#ff99cc')
      .setTitle(`🎶 Reproduciendo ahora`)
      .setDescription(`[${song.title}](${song.url})`)
      .addFields(
        { name: 'Duración', value: song.durationRaw || 'Desconocida', inline: true },
        { name: 'Pedido por', value: `<@${message.author.id}>`, inline: true }
      )
      .setThumbnail(song.thumbnails[0].url)
      .setFooter({ text: 'Softti Tales 💗', iconURL: client.user.displayAvatarURL() });

    textChannel.send({ embeds: [embed] });

    player.once(AudioPlayerStatus.Idle, () => {
      connection.destroy();
      currentSong = null;
    });

  } catch (err) {
    console.error(err);
    message.reply('💔 Hubo un error al reproducir la música.');
  }
}

// === 🎛️ COMANDOS DE MÚSICA ===
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.channel.name !== '🎶-reproductor-de-musica') return;

  const args = message.content.split(' ');
  const command = args.shift().toLowerCase();

  switch (command) {
    case '!play':
      if (!args.length) return message.reply('🎵 Escribe el nombre o URL de la canción.');
      await playMusic(message, args.join(' '));
      break;

    case '!pause':
      player.pause();
      message.reply('⏸️ Música pausada.');
      break;

    case '!resume':
      player.unpause();
      message.reply('▶️ Música reanudada.');
      break;

    case '!stop':
      player.stop();
      const conn = getVoiceConnection(message.guild.id);
      if (conn) conn.destroy();
      currentSong = null;
      message.reply('⏹️ Reproducción detenida y bot desconectado.');
      break;

    default:
      break;
  }
});

// === 🤖 LISTO ===
client.once('ready', () => {
  console.log(`🌸 Softti Tales listo como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: '🎶 música kawaii 💗', type: 2 }],
    status: 'online'
  });
});

// === 🚀 LOGIN ===
client.login(process.env.TOKEN);
