import 'dotenv/config';
import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder 
} from 'discord.js';
import { 
  createAudioPlayer, 
  createAudioResource, 
  joinVoiceChannel, 
  AudioPlayerStatus, 
  getVoiceConnection 
} from '@discordjs/voice';
import play from 'play-dl';
import express from 'express';

// ======================
// 💗 CONFIGURACIÓN BASE
// ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

const TOKEN = process.env.TOKEN;
const player = createAudioPlayer();

let currentConnection = null;

// ======================
// 🎶 FUNCIÓN PRINCIPAL: PLAY
// ======================
async function reproducirMusica(message, query) {
  const textChannelName = '🎶-reproductor-de-musica';
  const voiceChannelName = '🎶・música-y-relax';

  if (message.channel.name !== textChannelName) {
    return message.reply(`🌸 Solo puedes pedir música en ${textChannelName} 💖`);
  }

  const voiceChannel = message.guild.channels.cache.find(
    c => c.name === voiceChannelName && c.type === 2
  );
  if (!voiceChannel) return message.reply('💔 No encontré el canal de voz.');

  const me = message.guild.members.me || (await message.guild.members.fetch(client.user.id));
  if (!voiceChannel.permissionsFor(me)?.has('Connect')) return message.reply('❌ No tengo permiso para conectarme.');
  if (!voiceChannel.permissionsFor(me)?.has('Speak')) return message.reply('❌ No tengo permiso para hablar.');

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    let songInfo;
    if (play.yt_validate(query) === 'video') {
      const info = await play.video_basic_info(query);
      songInfo = {
        title: info.video_details.title,
        url: info.video_details.url,
        thumbnail: info.video_details.thumbnail.url,
        durationRaw: info.video_details.durationRaw,
        channel: { name: info.video_details.channel.name }
      };
    } else {
      const search = await play.search(query, { limit: 1 });
      if (!search.length) return message.reply('Awww no encontré esa canción 💔');
      songInfo = search[0];
    }

    const stream = await play.stream(songInfo.url, { discordPlayerCompatibility: true });
    console.log('Stream type:', stream.type);

    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    player.play(resource);
    connection.subscribe(player);
    currentConnection = connection;

    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle(`🌸 Reproduciendo ahora`)
      .setDescription(`**[${songInfo.title}](${songInfo.url})** 🎶\nDuración: ${songInfo.durationRaw || 'desconocida'}`)
      .setThumbnail(songInfo.thumbnail || null)
      .setFooter({ text: `Pedido por ${message.author.username} 💖` });

    await message.channel.send({ embeds: [embed] });

    player.on('error', err => {
      console.error('🎧 Error en el reproductor:', err);
      message.channel.send('⚠️ Error al reproducir la canción.');
    });

    player.once(AudioPlayerStatus.Playing, () => {
      console.log('🎵 Reproduciendo audio correctamente');
    });

    player.once(AudioPlayerStatus.Idle, () => {
      console.log('🕊️ Canción terminada.');
    });

  } catch (err) {
    console.error('💥 Error en reproducirMusica:', err);
    return message.reply('Ups... no pude reproducir la canción. Revisa consola.');
  }
}

// ======================
// ⏸️ PAUSE / ▶️ RESUME / ⏹️ STOP
// ======================
async function pauseMusic(message) {
  player.pause();
  message.reply('⏸️ Música en pausa.');
}

async function resumeMusic(message) {
  player.unpause();
  message.reply('▶️ Música reanudada.');
}

async function stopMusic(message) {
  const connection = getVoiceConnection(message.guild.id);
  if (!connection) return message.reply('No estoy en ningún canal.');
  try {
    player.stop();
    connection.destroy();
    message.reply('🛑 Detuve la música y salí del canal.');
  } catch (err) {
    console.error('Error al detener:', err);
    message.reply('No pude detener correctamente la música.');
  }
}

// ======================
// 🤖 MENSAJES Y COMANDOS
// ======================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(' ');
  const command = args.shift().toLowerCase();

  if (command === '!play') {
    const query = args.join(' ');
    if (!query) return message.reply('🎵 Usa: `!play <nombre o enlace>`');
    await reproducirMusica(message, query);
  }

  if (command === '!pause') await pauseMusic(message);
  if (command === '!resume') await resumeMusic(message);
  if (command === '!stop') await stopMusic(message);
});

// ======================
// 🌐 KEEPALIVE PARA RENDER
// ======================
const app = express();
app.get('/', (req, res) => res.send('Bot activo 💗'));
app.listen(3000, () => console.log('Servidor keep-alive en puerto 3000'));

// ======================
// 🚀 LOGIN
// ======================
client.once('ready', () => {
  console.log(`🌸 Softti Tales conectado como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: '🎶 música kawaii', type: 2 }],
    status: 'online'
  });
});

client.login(TOKEN);
