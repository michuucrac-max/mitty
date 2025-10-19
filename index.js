// index.js — Softi Tales Bot kawaii/furry/uwu
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import OpenAI from 'openai';

// --- Helper para leer JSON
function safeReadJSON(filename, fallback = null) {
  try {
    if (!fs.existsSync(filename)) return fallback;
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    return fallback;
  }
}

// --- Cargar archivos JSON desde la misma carpeta
const admin = safeReadJSON('admin.json', {});
const estadosFile = safeReadJSON('estados.json', []);
const frasesDetectadasFile = safeReadJSON('frases_detectadas.json', []);
const securityFile = safeReadJSON('security_manager.json', {});
const vocabularioFile = safeReadJSON('vocabulario.json', null);

// --- Configuración de seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  antispam: securityFile.antispam || {
    maxMensajes: 5,
    intervaloMs: 5000,
    timeoutSegundos: 3600,
    advertencia: '⚠️ ¡OwO cuidado {usuario}! estás enviando muchos mensajitos seguidos, nyan~'
  },
  mensajes: securityFile.mensajes || {
    bloqueo: '🚫 Nya~ ¡no puedes decir eso, {usuario}!',
    link: '🔗 Nya~ no puedes enviar enlaces externos, {usuario} uwu 💖'
  }
};

// --- Configuración de estados
let statusConfig = { intervaloMinutos: 5, estados: [] };
if (Array.isArray(estadosFile) && estadosFile.length) {
  statusConfig.estados = estadosFile.map(s => ({ tipo: 'PLAYING', mensaje: s }));
}

// --- Frases y vocabulario
const frasesDetectadas = Array.isArray(frasesDetectadasFile) ? frasesDetectadasFile : [];
const vocabulario = vocabularioFile ? { respuestas: vocabularioFile.respuestas || [], detectar: vocabularioFile.detectar || [] } : { respuestas: [], detectar: [] };

// --- Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// --- Variables de entorno directas
const TOKEN = process.env.TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const OWNER_ID = process.env.OWNER_ID || admin.owner_id;

// --- Memorias y OpenAI
const userTraffic = new Map();
const cooldowns = new Set();
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Cambiar estado
function cambiarEstado() {
  if (!statusConfig.estados.length) return;
  const e = statusConfig.estados[Math.floor(Math.random() * statusConfig.estados.length)];
  const activityType = ActivityType[e.tipo] ?? ActivityType.Playing;
  client.user.setActivity(e.mensaje, { type: activityType }).catch(() => {});
  console.log(`[Estado] ${e.tipo} — ${e.mensaje}`);
}

// --- Seguridad
async function filtrarSeguridad(message) {
  if (!message?.content || message.author?.bot) return false;
  const txt = message.content.toLowerCase();
  const userLabel = message.author.username || 'usuario';

  if (security.bloqueoLinks && /(https?:\/\/|www\.|discord\.gg\/)/i.test(txt)) {
    await message.delete().catch(() => {});
    await message.channel.send(security.mensajes.link.replace('{usuario}', userLabel)).catch(() => {});
    return false;
  }

  for (const p of security.palabras) {
    if (p && txt.includes(p.toLowerCase())) {
      await message.delete().catch(() => {});
      await message.channel.send(security.mensajes.bloqueo.replace('{usuario}', userLabel)).catch(() => {});
      return false;
    }
  }

  const now = Date.now();
  const data = userTraffic.get(message.author.id) || { msgs: [], strikes: 0 };
  data.msgs = data.msgs.filter(ts => now - ts < (security.antispam.intervaloMs || 5000));
  data.msgs.push(now);

  if (data.msgs.length > (security.antispam.maxMensajes || 5)) {
    data.strikes++;
    userTraffic.set(message.author.id, { msgs: [], strikes: data.strikes });
    try {
      if (message.member?.timeout) await message.member.timeout((security.antispam.timeoutSegundos || 3600) * 1000, 'Spam detectado');
      await message.channel.send((security.antispam.advertencia || '⚠️ Cuidado {usuario}').replace('{usuario}', userLabel)).catch(() => {});
    } catch {
      await message.channel.send((security.antispam.advertencia || '⚠️ Cuidado {usuario}').replace('{usuario}', userLabel)).catch(() => {});
    }
    return false;
  } else {
    userTraffic.set(message.author.id, data);
  }

  return true;
}

// --- OpenAI kawaii/furry/uwu
async function pedirGPT(prompt) {
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Responde kawaii/furry/uwu con emojis adorables:\n${prompt}` }],
      temperature: 0.8
    });
    return resp.choices[0].message.content;
  } catch {
    return '❌ Nyaa~ hubo un error kawaii al intentar responder';
  }
}

// --- Respuesta random local
function respuestaRandom() {
  const arr = vocabulario.respuestas || [];
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Ready
client.once('ready', () => {
  console.log(`✅ Softi Tales (${client.user.tag}) listo!`);
  cambiarEstado();
  const mins = Math.max(1, parseInt(statusConfig.intervaloMinutos || 5, 10));
  setInterval(cambiarEstado, mins * 60 * 1000);
});

// --- Message Handler
client.on('messageCreate', async message => {
  try {
    if (message.author?.bot) return;
    if (!(await filtrarSeguridad(message))) return;
    if (cooldowns.has(message.author.id)) return;
    cooldowns.add(message.author.id);
    setTimeout(() => cooldowns.delete(message.author.id), 2000);

    const contenido = (message.content || '').toLowerCase();

    // Menciones y DMs → OpenAI kawaii
    if (message.mentions.has(client.user) || message.channel.type === 'DM') {
      const userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();
      const respuesta = await pedirGPT(userMessage || contenido);
      await message.reply(respuesta);
      return;
    }

    // Frases detectadas
    const frases = [...frasesDetectadas, ...vocabulario.detectar];
    for (const f of frases) {
      if (f && contenido.includes(f.toLowerCase())) {
        const resp = respuestaRandom() || await pedirGPT(contenido);
        await message.reply(resp);
        return;
      }
    }

  } catch (err) {
    console.error('messageCreate error:', err);
  }
});

// --- Login
if (!TOKEN || !OPENAI_KEY) {
  console.error('❌ Faltan variables de entorno TOKEN o OPENAI_KEY');
  process.exit(1);
}
client.login(TOKEN).catch(err => console.error('Error iniciando sesión:', err.message));
