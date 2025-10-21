/**
 * index.js - Softti Tales (Definitivo con cola)
 * Funcionalidad completa: Música con cola, IA, AutoMod, imágenes y comandos
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

// --- Paths ---
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

// --- JSON Config ---
function safeReadJSON(p){ try{ return JSON.parse(fs.readFileSync(path.join(__dirname,p),'utf8')); }catch{return null;} }
const cmdJson = safeReadJSON('cmd.json') || [];
const estadosJson = safeReadJSON('estados.json') || [];

// --- Optional autoupdate & server ---
try{ (await import('./autoupdate.js')).default || (await import('./autoupdate.js')); }catch{}
try{ await import('./server.js'); }catch{}

// --- Discord Client ---
const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ],
  partials:[Partials.Channel, Partials.Message]
});

// --- Slash commands ---
const rest = new REST({ version:'10' }).setToken(TOKEN);
async function registrarComandosGlobales(){
  if(!CLIENT_ID || !cmdJson.length) return;
  try{
    const data = cmdJson.map(cmd=>({
      name:cmd.name,
      description:cmd.description||'Comando personalizado',
      options:[{name:'usuario',type:6,description:'Usuario objetivo',required:false}]
    }));
    await rest.put(Routes.applicationCommands(CLIENT_ID),{body:data});
    console.log('✅ Comandos globales registrados');
  }catch(e){ console.error('Error registrar comandos:',e); }
}

// --- AutoMod ---
try{ initAutoMod(); console.log('🛡️ AutoMod inicializado'); }catch(e){ console.warn('No se pudo inicializar automod:',e); }

// --- Music structures con cola ---
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
  const entry = {player,connection:null,currentSong:null,queue:[],isPlaying:false};
  guildPlayers.set(guildId,entry);

  player.on(AudioPlayerStatus.Idle,async ()=>{
    const g = guildPlayers.get(guildId);
    if(g.queue.length>0){
      const nextSong = g.queue.shift();
      await playSong(guildId,nextSong);
    } else {
      g.isPlaying=false;
      g.currentSong=null;
    }
  });

  player.on(AudioPlayerStatus.Playing,()=>console.log(`[DEBUG][guild ${guildId}] PLAYING`));
  player.on(AudioPlayerStatus.Paused,()=>console.log(`[DEBUG][guild ${guildId}] PAUSED`));
  player.on('error',err=>console.error(`[DEBUG][guild ${guildId}] PLAYER ERROR:`,err));

  return entry;
}

async function playSong(guildId,songInfo){
  const g = guildPlayers.get(guildId);
  if(!g||!g.connection) return;
  try{
    const stream = await play.stream(songInfo.url,{discordPlayerCompatibility:true});
    const resource = createAudioResource(stream.stream,{inputType:stream.type,inlineVolume:true});
    resource.volume.setVolume(0.5);
    g.player.play(resource);
    g.connection.subscribe(g.player);
    g.currentSong=songInfo;
    g.isPlaying=true;

    const guild = await client.guilds.fetch(guildId);
    const textChannel = getTextChannel(guild);
    if(textChannel) await textChannel.send(`🎵 Ahora reproduciendo **${songInfo.title}** 😻\nEn el canal de voz <#${getVoiceChannel(guild)?.id}>`);
    console.log(`[DEBUG] Reproducción iniciada: ${songInfo.title}`);
  }catch(e){ console.error('[DEBUG] Error en playSong:',e); }
}

// --- Play command ---
async function playMusic(message,query){
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
  if(!g.connection){
    g.connection = joinVoiceChannel({
      channelId:voiceChannel.id,
      guildId:guild.id,
      adapterCreator:guild.voiceAdapterCreator
    });
  }

  let songInfo;
  try{
    if(play.yt_validate(query)==='video'){
      const info = await play.video_basic_info(query);
      songInfo = {title:info.video_details.title,url:info.video_details.url};
    }else{
      const search = await play.search(query,{limit:1});
      if(!search||search.length===0) return message.reply('😿 No encontré resultados.');
      songInfo = search[0];
    }

    g.queue.push(songInfo);
    if(!g.isPlaying) await playSong(guild.id,g.queue.shift());
    else await message.reply(`🎵 **${songInfo.title}** agregada a la cola! (${g.queue.length} en cola)`);
  }catch(err){ console.error('Error playMusic:',err); return message.reply('❌ Error al reproducir la canción.'); }
}

// --- Pause / Resume / Stop ---
async function pauseGuildMusic(message){
  const g = guildPlayers.get(message.guild.id);
  if(!g) return message.reply('❌ No hay música en reproducción.');
  g.player.pause();
  return message.reply('⏸️ Música pausada.');
}
async function resumeGuildMusic(message){
  const g = guildPlayers.get(message.guild.id);
  if(!g) return message.reply('❌ No hay música pausada.');
  g.player.unpause();
  return message.reply('▶️ Música reanudada.');
}
async function stopGuildMusic(message){
  const conn = getVoiceConnection(message.guild.id);
  if(!conn) return message.reply('⚠️ No estoy en ningún canal de voz.');
  const g = guildPlayers.get(message.guild.id);
  if(g&&g.player) g.player.stop();
  try{ conn.destroy(); }catch{}
  guildPlayers.delete(message.guild.id);
  return message.reply('🛑 Reproducción detenida y desconectado.');
}

// --- OpenAI IA ---
async function generarRespuestaIA(mensaje){
  if(!OPENAI_API_KEY) return '💖 IA no disponible';
  try{
    const prompt=`Eres Softi, una IA kawaii y tierna, muy amable, que responde con frases dulces, coherentes y adorables. Evita respuestas agresivas o incoherentes. Mensaje recibido: ${mensaje}`;
    const res = await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4.1-mini',input:[{role:'user',content:[{type:'input_text',text:prompt}]}],max_output_tokens:200})
    });
    const data = await res.json();
    return data.output?.[0]?.content?.[0]?.text||'💖';
  }catch(e){ console.error('OpenAI error:',e); return 'Ups... no pude generar respuesta >.<'; }
}

async function analizarImagenYResponder(attachment,message){
  if(!OPENAI_API_KEY) return message.reply('💖 No puedo analizar la imagen (API no configurada).');
  try{
    const prompt='Eres Softi, una IA kawaii. Describe esta imagen de forma tierna sin inventar cosas:';
    const response = await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4.1-mini',input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:attachment.url}]}],max_output_tokens:200})
    });
    const data = await response.json();
    const text = data.output?.[0]?.content?.[0]?.text||'💖 Se ve adorable';
    await message.reply(text);
  }catch(e){ console.error('analizarImagen error:',e); await message.reply('Ups... no pude analizar la imagen >.<'); }
}

// --- Message Handler ---
client.on('messageCreate',async message=>{
  if(message.author?.bot) return;

  const guild = message.guild;
  if(guild) try{ if(await checkMessage(message)) return; }catch(e){ console.error('automod error:',e); }

  if(message.attachments.size>0){
    for(const att of message.attachments.values()){
      if(att.contentType?.startsWith('image/')||att.url?.match(/\.(jpg|png|jpeg|gif|webp)$/i)){
        await analizarImagenYResponder(att,message); return;
      }
    }
  }

  const content = (message.content||'').trim();
  const textChannel = guild?getTextChannel(guild):null;

  if(content.startsWith('!')){
    const args = content.slice(1).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if(['play','pause','resume','stop'].includes(cmd)){
      if(guild&&textChannel&&message.channel.id!==textChannel.id) return message.reply(`🌸 Solo comandos de música en <#${textChannel.id}>`);
      if(cmd==='play'){ const query=args.join(' '); if(!query) return message.reply('✨ Usa: !play <nombre o enlace>'); return playMusic(message,query); }
      if(cmd==='pause') return pauseGuildMusic(message);
      if(cmd==='resume') return resumeGuildMusic(message);
      if(cmd==='stop') return stopGuildMusic(message);
    }

    const custom = cmdJson.find(c=>c.name===cmd);
    if(custom){
      const user = message.author.username;
      const target = message.mentions.users.first()?.username||'ellos mismos';
      const respuesta = (custom.response||'').replace('{user}',user).replace('{target}',target);
      return message.reply(respuesta);
    }
  }

  // IA en DM o canales normales
  const shouldUseIA = true;
  if(shouldUseIA && (!guild || !textChannel || message.channel.id!==textChannel.id)){
    const reply = await generarRespuestaIA(content);
    try{ await message.reply(reply); }catch(e){ console.warn('No pude responder con IA:',e); }
  }
});

// --- Ready & presence ---
client.once('ready',()=>{
  console.log(`🌸 Softti Tales en línea como ${client.user.tag}`);
  function setPresenceSafe(){
    try{
      const estados = estadosJson.length?estadosJson:['🌸 cuidando corazones','🎶 música kawaii','💖 abrazos digitales'];
      const estado = Array.isArray(estados)?estados[Math.floor(Math.random()*estados.length)]:estados;
      client.user.setPresence({activities:[{name:`${estado} | kawaii`,type:ActivityType.Playing}],status:'online'});
    }catch(err){ console.error('Error setPresenceSafe:',err); }
  }
  setPresenceSafe();
  setInterval(setPresenceSafe,1000*60*5);
  registrarComandosGlobales().catch(e=>console.warn('No se pudieron registrar comandos globales:',e));
});

// --- Global error handlers ---
process.on('unhandledRejection',(reason,p)=>{ console.error('Unhandled Rejection at Promise',p,'reason:',reason); });
process.on('uncaughtException',(err)=>{ console.error('Uncaught Exception thrown',err); });

// --- Login ---
client.login(TOKEN).catch(err=>console.error('Error login:',err));
