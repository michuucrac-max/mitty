/**
 * index.js - Softti Tales (Debug música)
 * Música con logging completo
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder, REST, Routes } from 'discord.js';
import play from 'play-dl';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
  NoSubscriberBehavior
} from '@discordjs/voice';
import { initAutoMod, checkMessage } from './automod.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Environment ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MUSIC_TEXT_CHANNEL_ID = process.env.MUSIC_TEXT_CHANNEL_ID || null;
const MUSIC_VOICE_CHANNEL_ID = process.env.MUSIC_VOICE_CHANNEL_ID || null;

const MUSIC_TEXT_CHANNEL_NAME = '🎶-reproductor-de-musica';
const MUSIC_VOICE_CHANNEL_NAME = '🎶・música-y-relax';

// --- JSON ---
function safeReadJSON(p) { try { return JSON.parse(fs.readFileSync(path.join(__dirname,p),'utf8')); } catch { return null; } }
const cmdJson = safeReadJSON('cmd.json') || [];
const estadosJson = safeReadJSON('estados.json') || [];

// --- Discord Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

// --- Music structures ---
const guildPlayers = new Map();

function getTextChannel(guild){
  if(!guild) return null;
  if(MUSIC_TEXT_CHANNEL_ID) return guild.channels.cache.get(MUSIC_TEXT_CHANNEL_ID)||null;
  return guild.channels.cache.find(ch=>ch.isTextBased()&&ch.name===MUSIC_TEXT_CHANNEL_NAME)||null;
}

function getVoiceChannel(guild){
  if(!guild) return null;
  if(MUSIC_VOICE_CHANNEL_ID) return guild.channels.cache.get(MUSIC_VOICE_CHANNEL_ID)||null;
  return guild.channels.cache.find(ch=>ch.type===2&&ch.name===MUSIC_VOICE_CHANNEL_NAME)||null;
}

function getOrCreateGuildPlayer(guildId){
  if(guildPlayers.has(guildId)) return guildPlayers.get(guildId);
  const player = createAudioPlayer({behaviors:{noSubscriber:NoSubscriberBehavior.Play}});
  const entry = {player, connection:null, currentSong:null};
  guildPlayers.set(guildId, entry);

  // --- Debugging events ---
  player.on(AudioPlayerStatus.Playing, ()=>console.log(`[DEBUG][guild ${guildId}] PLAYER STATUS: PLAYING`));
  player.on(AudioPlayerStatus.Idle, ()=>console.log(`[DEBUG][guild ${guildId}] PLAYER STATUS: IDLE`));
  player.on(AudioPlayerStatus.Paused, ()=>console.log(`[DEBUG][guild ${guildId}] PLAYER STATUS: PAUSED`));
  player.on('error', err=>console.error(`[DEBUG][guild ${guildId}] PLAYER ERROR:`,err));

  return entry;
}

async function playMusic(message, query){
  const guild = message.guild;
  if(!guild) return message.reply('💔 Esto solo funciona en servidores.');

  const textChannel = getTextChannel(guild);
  if(!textChannel) return message.reply(`❌ No encontré canal de texto ${MUSIC_TEXT_CHANNEL_NAME}`);
  if(message.channel.id!==textChannel.id) return message.reply(`🌸 Solo puedes pedir música en <#${textChannel.id}>`);

  const voiceChannel = getVoiceChannel(guild);
  if(!voiceChannel) return message.reply(`❌ No encontré canal de voz ${MUSIC_VOICE_CHANNEL_NAME}`);

  const me = guild.members.me || (await guild.members.fetch(client.user.id));
  if(!voiceChannel.permissionsFor(me)?.has('Connect')) return message.reply('❌ No puedo conectarme.');
  if(!voiceChannel.permissionsFor(me)?.has('Speak')) return message.reply('❌ No puedo hablar.');

  const g = getOrCreateGuildPlayer(guild.id);

  try {
    console.log(`[DEBUG] Intentando unirse al canal: ${voiceChannel.name} (${voiceChannel.id})`);
    const connection = joinVoiceChannel({
      channelId:voiceChannel.id,
      guildId:guild.id,
      adapterCreator:guild.voiceAdapterCreator
    });
    g.connection = connection;

    let songInfo;
    if(play.yt_validate(query)==='video'){
      const info = await play.video_basic_info(query);
      songInfo = {
        title:info.video_details.title,
        url:info.video_details.url,
        thumbnails:info.video_details.thumbnails||[],
        durationRaw:info.video_details.durationRaw||'desconocida',
        channel:{name:info.video_details.channel.name||''}
      };
      console.log(`[DEBUG] Video detectado: ${songInfo.title} | URL: ${songInfo.url}`);
    } else {
      const search = await play.search(query,{limit:1});
      if(!search||search.length===0) return message.reply('😿 No encontré resultados.');
      songInfo = search[0];
      console.log(`[DEBUG] Resultado de búsqueda: ${songInfo.title} | URL: ${songInfo.url}`);
    }

    console.log(`[DEBUG] Creando stream para: ${songInfo.url}`);
    const stream = await play.stream(songInfo.url, {discordPlayerCompatibility:true});
    console.log(`[DEBUG] Stream creado. Tipo: ${stream.type}`);
    const resource = createAudioResource(stream.stream,{
      inputType:stream.type,
      inlineVolume:true
    });
    resource.volume.setVolume(0.5);

    g.player.play(resource);
    g.connection.subscribe(g.player);
    g.currentSong = songInfo;
    console.log(`[DEBUG] Reproducción iniciada: ${songInfo.title}`);

    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle('🌸 Reproduciendo ahora')
      .setDescription(`**[${songInfo.title}](${songInfo.url})** 🎶`)
      .setThumbnail(songInfo.thumbnails?.[0]?.url||null)
      .addFields(
        {name:'Duración',value:songInfo.durationRaw||'Desconocida',inline:true},
        {name:'Pedido por',value:`<@${message.author.id}>`,inline:true}
      )
      .setFooter({text:'Softti Tales 💖'});

    await textChannel.send({embeds:[embed]});

  } catch(err){
    console.error('[DEBUG] Error en playMusic:', err);
    await message.reply('❌ Hubo un error al reproducir la canción. Revisa consola.');
  }
}

// --- Comandos pause/resume/stop con debug ---
async function pauseGuildMusic(message){
  const g = guildPlayers.get(message.guild.id);
  if(!g) return message.reply('❌ No hay música en reproducción.');
  g.player.pause();
  console.log(`[DEBUG] Música pausada en guild ${message.guild.id}`);
  return message.reply('⏸️ Música pausada.');
}

async function resumeGuildMusic(message){
  const g = guildPlayers.get(message.guild.id);
  if(!g) return message.reply('❌ No hay música pausada.');
  g.player.unpause();
  console.log(`[DEBUG] Música reanudada en guild ${message.guild.id}`);
  return message.reply('▶️ Música reanudada.');
}

async function stopGuildMusic(message){
  const conn = getVoiceConnection(message.guild.id);
  if(!conn) return message.reply('⚠️ No estoy en ningún canal de voz.');
  const g = guildPlayers.get(message.guild.id);
  if(g&&g.player) g.player.stop();
  try{ conn.destroy(); }catch{}
  guildPlayers.delete(message.guild.id);
  console.log(`[DEBUG] Música detenida y conexión destruida en guild ${message.guild.id}`);
  return message.reply('🛑 Reproducción detenida y desconectado.');
}

// --- Login & ready ---
client.once('ready',()=>{
  console.log(`🌸 Softti Tales en línea como ${client.user.tag}`);
});

client.login(TOKEN).catch(err=>console.error('Error login:',err));
