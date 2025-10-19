// index.js (ESM) — completo y tolerante
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  EmbedBuilder
} from 'discord.js';
import OpenAI from 'openai';

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

// --- Configuración seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: typeof securityFile.bloqueoLinks === 'boolean' ? securityFile.bloqueoLinks : true,
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

// --- Estados dinámicos
let statusConfig = { intervaloMinutos: 5, estados: [] };
if (statusFile) {
  if (Array.isArray(statusFile.estados)) {
    statusConfig.intervaloMinutos = statusFile.intervaloMinutos || 5;
    statusConfig.estados = statusFile.estados.map(e => ({
      tipo: e.tipo || e.type || 'PLAYING',
      mensaje: e.mensaje || e.texto || e.name || ''
    })).filter(e => e.mensaje);
  } else if (Array.isArray(statusFile)) {
    statusConfig.estados = statusFile.map(m => ({ tipo: 'PLAYING', mensaje: m }));
  }
}
if (statusConfig.estados.length === 0 && Array.isArray(estadosFile) && estadosFile.length) {
  statusConfig.estados = estadosFile.map(s => ({ tipo: 'PLAYING', mensaje: s }));
}

// --- frases detectadas
const frasesDetectadas = Array.isArray(frasesDetectadasFile) ? frasesDetectadasFile : (frasesDetectadasFile?.frases || []);

// --- vocabulario
const vocabulario = (() => {
  if (!vocabularioFile) return { respuestas: [], detectar: [] };
  if (Array.isArray(vocabularioFile)) return { respuestas: vocabularioFile, detectar: [] };
  return {
    respuestas: vocabularioFile.respuestas || vocabularioFile.frases || [],
    detectar: vocabularioFile.detectar || []
  };
})();

// --- Bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// --- Keys
const TOKEN = process.env.TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const OWNER_ID = process.env.OWNER_ID || admin.owner_id || admin.OWNER_ID || admin.ownerId;

const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

// --- Memorias
const userTraffic = new Map(); // antispam
const userLastMessage = new Map(); // cooldown mensajes
const COOLDOWN_MS = 15000; // 15s

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
    const userLabel = message.author?.username || 'usuario';

    // Bloqueo links
    if (security.bloqueoLinks) {
      const linkRegex = /(https?:\/\/|www\.|discord\.gg\/)/i;
      if (linkRegex.test(txt)) {
        await message.delete().catch(() => {});
        await message.channel.send(security.mensajes.link.replace('{usuario}', userLabel)).catch(() => {});
        console.log(`[Seguridad] Link bloqueado por ${userLabel}`);
        return false;
      }
    }

    // Palabras prohibidas
    if (security.palabras.length) {
      for (const p of security.palabras) {
        if (!p) continue;
        if (txt.includes(p.toLowerCase())) {
          await message.delete().catch(() => {});
          await message.channel.send(security.mensajes.bloqueo.replace('{usuario}', userLabel)).catch(() => {});
          console.log(`[Seguridad] Palabra bloqueada "${p}" por ${userLabel}`);
          return false;
        }
      }
    }

    // Antispam
    const now = Date.now();
    const traffic = userTraffic.get(message.author.id) || { msgs: [], strikes: 0 };
    traffic.msgs = Array.isArray(traffic.msgs) ? traffic.msgs.filter(ts => now - ts < security.antispam.intervaloMs) : [];
    traffic.msgs.push(now);
    if (traffic.msgs.length > security.antispam.maxMensajes) {
      traffic.strikes = (traffic.strikes || 0) + 1;
      userTraffic.set(message.author.id, { msgs: [], strikes: traffic.strikes });
      await message.channel.send(security.antispam.advertencia.replace('{usuario}', userLabel)).catch(() => {});
      return false;
    } else {
      userTraffic.set(message.author.id, traffic);
    }

    return true;
  } catch (err) {
    console.error('filtrarSeguridad error:', err.message);
    return false;
  }
}

// --- Respuesta random
function respuestaRandom() {
  const arr = vocabulario.respuestas || [];
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Ready
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} listo!`);
  cambiarEstado();
  const mins = Math.max(1, parseInt(statusConfig.intervaloMinutos || 5, 10));
  setInterval(cambiarEstado, mins * 60 * 1000);
});

// --- messageCreate
client.on('messageCreate', async (message) => {
  try {
    if (message.author?.bot) return;

    // Seguridad
    const ok = await filtrarSeguridad(message);
    if (!ok) return;

    // Cooldown 15s
    const last = userLastMessage.get(message.author.id) || {};
    if (last.lastMsg === message.content && Date.now() - (last.timestamp || 0) < COOLDOWN_MS) return;
    userLastMessage.set(message.author.id, { lastMsg: message.content, timestamp: Date.now() });

    const contenido = (message.content || '').toLowerCase();

    // Comandos
    if (contenido.startsWith('/')) {
      const parts = contenido.slice(1).split(/\s+/);
      const name = parts.shift().toLowerCase();
      const found = cmd.find(c => c.name === name);
      if (found) {
        await message.reply(found.response);
        return;
      }
    }

    // DM o mención → IA / respuesta kawaii
    if (message.channel.type === 'DM' || message.mentions.has(client.user)) {
      let resp = respuestaRandom() || 'Nyaa~ ¿en qué puedo ayudarte? 💖';
      // Si hay OpenAI, generar respuesta furry/uwu
      if (openai) {
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Responde de forma kawaii, furry, tierna, con estilo UwU/OwO.' },
              { role: 'user', content: message.content }
            ],
            max_tokens: 200
          });
          resp = completion.choices?.[0]?.message?.content || resp;
        } catch (err) {
          console.error('OpenAI error:', err.message);
        }
      }
      await message.reply(resp);
      return;
    }

    // Detección por frases
    for (const f of [...frasesDetectadas, ...(vocabulario.detectar || [])]) {
      if (!f) continue;
      if (contenido.includes(f.toLowerCase())) {
        const resp = respuestaRandom();
        if (resp) {
          await message.reply(resp);
          return;
        }
      }
    }

  } catch (err) {
    console.error('messageCreate error:', err);
  }
});

// --- Login
if (!TOKEN) {
  console.error('✖ TOKEN no encontrado en environment');
  process.exit(1);
}
client.login(TOKEN).catch(err => {
  console.error('Error iniciando sesión:', err.message);
});
