// index.js (ESM) — completo y listo
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType
} from 'discord.js';

// --- paths seguros
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function safeReadJSON(filename, fallback = null) {
  try {
    const full = path.join(__dirname, filename);
    if (!fs.existsSync(full)) return fallback;
    const raw = fs.readFileSync(full, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[safeReadJSON] Error leyendo ${filename}:`, err.message);
    return fallback;
  }
}

// --- Cargar archivos
const cmd = safeReadJSON('cmd.json', []);
const admin = safeReadJSON('admin.json', {});
const estadosFile = safeReadJSON('estados.json', []);
const frasesDetectadasFile = safeReadJSON('frases_detectadas.json', []) || [];
const securityFile = safeReadJSON('security_manager.json', {});
const statusFile = safeReadJSON('status_manager.json', null);
const vocabularioFile = safeReadJSON('vocabulario.json', null);

// --- Seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: typeof securityFile.bloqueoLinks === 'boolean' ? securityFile.bloqueoLinks : true,
  antispam: securityFile.antispam || { maxMensajes: 5, intervaloMs: 5000, timeoutSegundos: 3600, advertencia: '⚠️ ¡OwO cuidado {usuario}! estás enviando muchos mensajitos seguidos, nyan~' },
  mensajes: securityFile.mensajes || { bloqueo: '🚫 Nya~ ¡no puedes decir eso, {usuario}!', link: '🔗 Nya~ no puedes enviar enlaces externos, {usuario} uwu 💖' }
};

// --- Estados
let statusConfig = { intervaloMinutos: 5, estados: [] };
if (statusFile) {
  if (Array.isArray(statusFile.estados)) {
    statusConfig.intervaloMinutos = statusFile.intervaloMinutos || 5;
    statusConfig.estados = statusFile.estados.map(e => ({ tipo: e.tipo || 'PLAYING', mensaje: e.mensaje || '' })).filter(e => e.mensaje);
  } else if (Array.isArray(statusFile)) {
    statusConfig.estados = statusFile.map(m => ({ tipo: 'PLAYING', mensaje: m }));
  }
}
if (statusConfig.estados.length === 0 && Array.isArray(estadosFile)) {
  statusConfig.estados = estadosFile.map(s => ({ tipo: 'PLAYING', mensaje: s }));
}

// --- Frases detectadas
const frasesDetectadas = Array.isArray(frasesDetectadasFile) ? frasesDetectadasFile : (frasesDetectadasFile?.frases || []);

// --- Vocabulario
const vocabulario = (() => {
  if (!vocabularioFile) return { respuestas: [], detectar: [] };
  if (Array.isArray(vocabularioFile)) return { respuestas: vocabularioFile, detectar: [] };
  return { respuestas: vocabularioFile.respuestas || [], detectar: vocabularioFile.detectar || [] };
})();

// --- Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

const TOKEN = process.env.TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const OWNER_ID = process.env.OWNER_ID || admin.owner_id || admin.OWNER_ID || admin.ownerId;

// --- Memorias
const userTraffic = new Map();
const cooldowns = new Set();

// --- Cambiar estado
function cambiarEstado() {
  try {
    if (!statusConfig.estados || statusConfig.estados.length === 0) return;
    const e = statusConfig.estados[Math.floor(Math.random() * statusConfig.estados.length)];
    const activityType = ActivityType[e.tipo] ?? ActivityType.Playing;
    client.user.setActivity(e.mensaje, { type: activityType });
    console.log(`[Estado] ${e.tipo} — ${e.mensaje}`);
  } catch (err) {
    console.error('Error cambiando estado:', err.message);
  }
}

// --- Seguridad
async function filtrarSeguridad(message) {
  try {
    if (!message || !message.content) return false;
    if (message.author?.bot) return false;

    const txt = message.content.toLowerCase();
    const userLabel = message.author.username || 'usuario';

    // Bloqueo links
    if (security.bloqueoLinks) {
      const linkRegex = /(https?:\/\/|www\.|discord\.gg\/)/i;
      if (linkRegex.test(txt)) {
        await message.delete().catch(() => {});
        await message.channel.send(security.mensajes.link.replace('{usuario}', userLabel)).catch(() => {});
        return false;
      }
    }

    // Palabras prohibidas
    for (const p of security.palabras) {
      if (!p) continue;
      if (txt.includes(p.toLowerCase())) {
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
      await message.channel.send((security.antispam.advertencia || '⚠️ Cuidado {usuario}').replace('{usuario}', userLabel)).catch(() => {});
      return false;
    } else {
      userTraffic.set(message.author.id, data);
    }

    return true;
  } catch (err) {
    console.error('filtrarSeguridad error:', err.message);
    return false;
  }
}

// --- Respuesta local random
function respuestaRandom() {
  const arr = vocabulario.respuestas || [];
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Ready
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} listo!`);
  cambiarEstado();
  setInterval(cambiarEstado, Math.max(1, parseInt(statusConfig.intervaloMinutos || 5, 10)) * 60 * 1000);
});

// --- messageCreate
client.on('messageCreate', async (message) => {
  try {
    if (message.author?.bot) return;
    if (!(await filtrarSeguridad(message))) return;

    if (cooldowns.has(message.author.id)) return;
    cooldowns.add(message.author.id);
    setTimeout(() => cooldowns.delete(message.author.id), 2000);

    const contenido = (message.content || '').trim();

    // --- Comandos softi*
    if (contenido.startsWith('!')) {
      const parts = contenido.slice(1).split(/\s+/);
      const name = parts.shift().toLowerCase();
      if (name.startsWith('softi')) {
        const sub = name.replace('softi', '');
        switch (sub) {
          case 'hug':
            return await message.reply(`OwO ${message.author.username}, ven~ te doy un abracito suave 🤗💕`);
          case 'kiss':
            return await message.reply(`Mwah~ 💋 ${message.author.username}, un besito tierno solo para ti~`);
          default:
            return await message.reply('Nyaa~ no entiendo ese comando, nyan~');
        }
      }
    }

    // --- DM o mención → OpenAI furry/uwu
    if (message.channel.type === 'DM' || message.mentions.has(client.user)) {
      try {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: OPENAI_KEY });
        const prompt = `Responde kawaii/furry/uwu con emojis adorables al siguiente mensaje:\n"${contenido}"`;
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8
        });
        const respuestaIA = resp.choices?.[0]?.message?.content || respuestaRandom() || 'Nyaa~ no sé qué decir, uwu 💖';
        await message.reply(respuestaIA);
        return;
      } catch (err) {
        console.error('OpenAI error:', err);
        await message.reply(respuestaRandom() || 'Nyaa~ no sé qué decir, uwu 💖');
        return;
      }
    }

    // --- Frases detectadas
    const frases = [...frasesDetectadas, ...(vocabulario.detectar || [])];
    for (const f of frases) {
      if (!f) continue;
      if (contenido.toLowerCase().includes(f.toLowerCase())) {
        const resp = respuestaRandom();
        if (resp) await message.reply(resp);
        return;
      }
    }

  } catch (err) {
    console.error('messageCreate error:', err);
  }
});

// --- Login
if (!TOKEN) {
  console.error('✖ TOKEN no encontrado. Añade TOKEN en environment');
  process.exit(1);
}
if (!OPENAI_KEY) {
  console.error('✖ OPENAI_KEY no encontrado. Añade OPENAI_KEY en environment');
  process.exit(1);
}

client.login(TOKEN).catch(err => {
  console.error('Error iniciando sesión:', err.message);
});
