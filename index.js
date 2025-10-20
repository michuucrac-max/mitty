import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, Partials, ActivityType, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import fetch from 'node-fetch';
import { initAutoMod, checkMessage } from './automod.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import play from 'play-dl';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
  try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: data }); console.log('✅ Comandos registrados'); } catch (err) { console.error(err); }
}

// --- IA ---
async function responderConIA(mensaje) {
  try {
    const prompt = `Eres Softi, IA kawaii y tierna. Responde de forma dulce y coherente: "${mensaje}"`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`, 'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4.1-mini', input:[{role:'user', content:[{type:'input_text', text:prompt}]}], max_output_tokens:150})
    });
    const data = await response.json();
    return data.output?.[0]?.content?.[0]?.text || 'Awww 💖';
  } catch { return 'Ups... no pude responder >.<'; }
}

// --- Imágenes ---
async function analizarImagen(attachment, message) {
  try {
    const imageUrl = attachment.url;
    const prompt = `Eres Softi. Describe kawaii esta imagen: ${imageUrl}`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`, 'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4.1-mini', input:[{role:'user', content:[{type:'input_text', text:prompt},{type:'input_image', image_url:imageUrl}]}], max_output_tokens:150})
    });
    const data = await response.json();
    await message.reply(data.output?.[0]?.content?.[0]?.text || 'Awww adorable 💖');
  } catch { try{await message.reply('Ups, no pude ver la imagen >.<');}catch{} }
}

// --- Música kawaii 🎶 ---
const MUSIC_TEXT_CHANNEL = '🎶・música-y-relax';
const MUSIC_VOICE_CHANNEL = '🎶・música-y-relax';

let player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
let currentConnection = null;
let currentSong = null;

async function playMusic(message, query) {
  const textChannel = message.guild.channels.cache.find(ch => ch.name === MUSIC_TEXT_CHANNEL && ch.isTextBased());
  const voiceChannel = message.guild.channels.cache.find(ch => ch.name === MUSIC_VOICE_CHANNEL && ch.type === 2);

  if (!textChannel || !voiceChannel) {
    return message.reply("💔 No encuentro los canales `🎶・música-y-relax`, asegúrate de que existan uwu");
  }

  if (message.channel.id !== textChannel.id) {
    return message.reply(`🌸 Solo puedes pedir música en ${MUSIC_TEXT_CHANNEL} 💖`);
  }

  try {
    currentConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    let song;
    if (play.yt_validate(query) === 'video') {
      song = await play.video_basic_info(query);
    } else {
      const search = await play.search(query, { limit: 1 });
      if (!search.length) return message.reply("Awww no encontré esa canción 💔");
      song = search[0];
    }

    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    player.play(resource);
    currentConnection.subscribe(player);
    currentSong = song;

    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle(`🌸 Reproduciendo ahora`)
      .setDescription(`**[${song.title}](${song.url})** 🎶\nDuración aproximada: ${song.durationRaw || 'desconocida'}`)
      .setThumbnail(song.thumbnails?.[0]?.url || null)
      .setFooter({ text: `Pedido por ${message.author.username} 💖` });

    textChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    message.reply("Ups... no pude poner la música >.< 💔");
  }
}

player.on(AudioPlayerStatus.Idle, () => {
  console.log("🎵 Reproducción terminada");
  currentSong = null;
});

// --- Ready ---
client.once('ready', () => {
  console.log(`🌸 Softi está en línea como ${client.user.tag}`);

  function cambiarEstado() {
    if(estados.length){
      const estado = estados[Math.floor(Math.random()*estados.length)];
      client.user.setPresence({
        activities:[{name:`${estado} | cuidando a ${client.users.cache.size} users 💖`, type: ActivityType.Playing}],
        status:'online'
      });
    }
  }
  cambiarEstado();
  setInterval(cambiarEstado, 1000*60*5);
});

// --- Comandos Slash ---
client.on('interactionCreate', async interaction => {
  if(!interaction.isCommand()) return;
  const cmd = comandos.find(c=>c.name===interaction.commandName);
  if(!cmd) return;
  const user = interaction.user.username;
  const target = interaction.options.getUser('usuario')?.username || 'ellos mismos';
  await interaction.reply(cmd.response.replace('{user}', user).replace('{target}', target));
});

// --- Mensajes normales ---
client.on('messageCreate', async message => {
  try {
    if(message.author?.bot) return;

    // --- AutoMod ---
    const bloqueado = await checkMessage(message);
    if(bloqueado) return;

    // --- Música kawaii ---
    if (message.content.startsWith('!play ')) {
      const query = message.content.slice(6).trim();
      if (!query) return message.reply("🎵 Debes poner el nombre o link de la canción 💖");
      return playMusic(message, query);
    }

    if (message.content === '!pause') {
      if (player.state.status !== AudioPlayerStatus.Playing) return message.reply("💤 No hay música sonando, nya~");
      player.pause();
      return message.reply("⏸️ Pausé la canción uwu 💖");
    }

    if (message.content === '!resume') {
      if (player.state.status !== AudioPlayerStatus.Paused) return message.reply("🌸 No hay música pausada, nya~");
      player.unpause();
      return message.reply("▶️ Reanudé la música, nya~ 🎶");
    }

    if (message.content === '!stop') {
      player.stop();
      if (currentConnection) currentConnection.destroy();
      currentSong = null;
      return message.reply("💖 Detuve la música y salí del canal de voz, nya~");
    }

    // --- Imágenes ---
    if(message.attachments?.size){
      for(const a of message.attachments.values())
        if(a.contentType?.startsWith('image/')) return analizarImagen(a,message);
    }

    // --- IA ---
    const respuesta = await responderConIA(message.content);
    await message.reply(respuesta).catch(()=>{});
  } catch(err){ console.error(err); }
});

// --- Iniciar ---
registrarComandos();
client.login(TOKEN);
