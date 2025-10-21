import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder } from 'discord.js';
import { Manager } from 'erela.js';
import fetch from 'node-fetch';
import { initAutoMod, checkMessage } from './automod.js';

// --- Env ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- Config canales ---
const MUSIC_TEXT_CHANNEL_ID = process.env.MUSIC_TEXT_CHANNEL_ID || null;
const MUSIC_VOICE_CHANNEL_ID = process.env.MUSIC_VOICE_CHANNEL_ID || null;

// --- Discord client ---
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

// --- Automod ---
try { initAutoMod(); console.log('🛡️ AutoMod inicializado'); } catch (e) { console.warn('No se pudo inicializar automod:', e); }

// --- Lavalink Manager ---
const manager = new Manager({
  nodes: [
    {
      host: 'lavalink.dev',
      port: 80,
      password: 'youshallnotpass',
      secure: false
    }
  ],
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
});

manager.on('nodeConnect', node => console.log(`[Lavalink] Nodo conectado: ${node.options.identifier}`));
manager.on('nodeError', (node, error) => console.error(`[Lavalink] Nodo error: ${node.options.identifier}`, error));
manager.on('trackStart', (player, track) => {
  const channel = client.channels.cache.get(player.textChannel);
  if(channel) channel.send(`🎵 Ahora reproduciendo: **${track.title}**`);
});
manager.on('queueEnd', player => {
  const channel = client.channels.cache.get(player.textChannel);
  if(channel) channel.send('✅ La cola ha terminado.');
  player.destroy();
});

client.on('ready', () => {
  console.log(`🌸 Softti Tales en línea como ${client.user.tag}`);
  manager.init(client.user.id);

  // Presencia
  client.user.setPresence({
    activities: [{ name: '🌸 cuidando corazones | !play <canción>', type: ActivityType.Playing }],
    status: 'online'
  });
});

// --- Conexión de voz ---
client.on('raw', d => manager.updateVoiceState(d));

// --- IA ---
async function generarRespuestaIA(mensaje) {
  if(!OPENAI_API_KEY) return '💖 IA no disponible';
  try {
    const prompt = `Eres Softi, una IA kawaii y tierna, que responde dulcemente y de forma coherente:\n${mensaje}`;
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {'Authorization':`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body: JSON.stringify({model:'gpt-4.1-mini',input:[{role:'user',content:[{type:'input_text',text:prompt}]}],max_output_tokens:200})
    });
    const data = await res.json();
    return data.output?.[0]?.content?.[0]?.text||'💖';
  } catch(e) { console.error('OpenAI error:',e); return 'Ups... no pude generar respuesta >.<'; }
}

// --- Mensajes ---
client.on('messageCreate', async message => {
  if(message.author.bot) return;

  // Automod
  try { if(await checkMessage(message)) return; } catch(e){ console.error('automod error:',e); }

  // Música
  const content = (message.content||'').trim();
  const textChannel = message.guild?.channels.cache.get(MUSIC_TEXT_CHANNEL_ID) || null;
  if(content.startsWith('!')) {
    const args = content.slice(1).split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if(['play','pause','resume','stop'].includes(cmd)) {
      if(!message.guild || (textChannel && message.channel.id!==textChannel.id))
        return message.reply(`🌸 Solo comandos de música en <#${textChannel?.id || 'el canal configurado'}>`);

      let player = manager.players.get(message.guild.id);

      if(cmd==='play'){
        const query = args.join(' ');
        if(!query) return message.reply('✨ Usa: !play <nombre o enlace>');
        if(!player) player = manager.create({
          guild: message.guild.id,
          voiceChannel: MUSIC_VOICE_CHANNEL_ID,
          textChannel: message.channel.id,
          selfDeafen: true
        });

        const res = await player.search(query, message.author);
        if(res.loadType==='NO_MATCHES') return message.reply('😿 No encontré resultados.');

        if(res.loadType==='PLAYLIST_LOADED'){
          res.tracks.forEach(track=>player.queue.add(track));
          message.channel.send(`✅ Playlist agregada a la cola: ${res.playlist.name}`);
        } else {
          player.queue.add(res.tracks[0]);
          message.channel.send(`🎵 Canción agregada a la cola: **${res.tracks[0].title}**`);
        }

        if(!player.playing && !player.paused) player.play();
      }

      if(cmd==='pause'){ if(player) { player.pause(true); message.reply('⏸️ Música pausada'); } }
      if(cmd==='resume'){ if(player) { player.pause(false); message.reply('▶️ Música reanudada'); } }
      if(cmd==='stop'){ if(player) { player.destroy(); message.reply('🛑 Música detenida y desconectado'); } }
      return;
    }
  }

  // IA
  const reply = await generarRespuestaIA(message.content);
  try{ await message.reply(reply); }catch(e){ console.warn('No pude responder con IA:',e); }
});

// --- Login ---
client.login(TOKEN);
