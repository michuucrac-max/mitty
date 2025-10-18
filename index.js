// index.js — Softi Tales Bot kawaii/furry/uwu
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import OpenAI from 'openai';

// --- Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Función para leer JSON seguro
function safeReadJSON(filename, fallback = null) {
  try {
    const full = path.join(__dirname, filename);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    return fallback;
  }
}

// --- Cargar todos los JSONs desde la misma carpeta
const securityFile = safeReadJSON('security_manager.json', {});
const frasesDetectadas = safeReadJSON('frases_detectadas.json', []);
const vocabularioFile = safeReadJSON('vocabulario.json', null);
const estadosFile = safeReadJSON('estados.json', []);

// --- Configuración de seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  antispam: securityFile.antispam || { maxMensajes: 5, intervaloMs: 5000, timeoutSegundos: 3600, advertencia: '⚠️ ¡OwO cuidado {usuario}!' },
  mensajes: securityFile.mensajes || { bloqueo: '🚫 Nya~ ¡no puedes decir eso, {usuario}!', link: '🔗 Nya~ no puedes enviar enlaces externos, {usuario} uwu 💖' }
};

// --- Vocabulario kawaii/furry/uwu
const vocabulario = vocabularioFile ? { respuestas: vocabularioFile, detectar: frasesDetectadas } : { respuestas: [], detectar: [] };

// --- Discord Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

// --- Variables de entorno
const TOKEN = process.env.TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;

// --- OpenAI
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Memorias y cooldowns
const userTraffic = new Map();
const cooldowns = new Set();

// --- Función para cambiar estado
let statusConfig = { intervaloMinutos: 5, estados: [] };
statusConfig.estados = Array.isArray(estadosFile) ? estadosFile.map(m => ({ tipo: 'PLAYING', mensaje: m })) : [];
function cambiarEstado() {
  if (!statusConfig.estados.length) return;
  const e = statusConfig.estados[Math.floor(Math.random() * statusConfig.estados.length)];
  client.user.setActivity(e.mensaje, { type: ActivityType[e.tipo] ?? ActivityType.Playing }).catch(() => {});
}

// --- Filtrado de seguridad y antispam
async function filtrarSeguridad(message) {
  if (!message?.content || message.author?.bot) return false;
  const txt = message.content.toLowerCase();
  const userLabel = message.author.username || 'usuario';

  // Bloqueo de links
  if (security.bloqueoLinks && /(https?:\/\/|www\.|discord\.gg\/)/i.test(txt)) {
    await message.delete().catch(() => {});
    await message.channel.send(security.mensajes.link.replace('{usuario}', userLabel)).catch(() => {});
    return false;
  }

  // Palabras prohibidas
  for (const p of security.palabras) {
    if (p && txt.includes(p.toLowerCase())) {
      await message.delete().catch(() => {});
      await message.channel.send(security.mensajes.bloqueo.replace('{usuario}', userLabel)).catch(() => {});
      return false;
    }
  }

  // Antispam
  const now = Date.now();
  const data = userTraffic.get(message.author.id) || { msgs: [], strikes: 0 };
  data.msgs = data.msgs.filter(ts => now - ts < (security.antispam.intervaloMs || 5000));
  data.msgs.push(now);

  if (data.msgs.length > (security.antispam.maxMensajes || 5)) {
    data.strikes = (data.strikes || 0) + 1;
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
  setInterval(cambiarEstado, Math.max(1, parseInt(statusConfig.intervaloMinutos || 5, 10)) * 60 * 1000);
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
    const frases = vocabulario.detectar || [];
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
