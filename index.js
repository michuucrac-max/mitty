// index.js (ESM) — completo y tolerante
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';

// --- Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Función segura para leer JSON
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

// --- Config seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
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
const frasesDetectadas = Array.isArray(frasesDetectadasFile) ? frasesDetectadasFile : [];

// --- Vocabulario
const vocabulario = (() => {
  if (!vocabularioFile) return { respuestas: [], detectar: [] };
  if (Array.isArray(vocabularioFile)) return { respuestas: vocabularioFile, detectar: [] };
  return { respuestas: vocabularioFile.respuestas || [], detectar: vocabularioFile.detectar || [] };
})();

// --- Client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID || admin.owner_id || admin.OWNER_ID || admin.ownerId;

// --- Cooldowns para no repetir mensajes
const userLastMessage = new Map(); // userId -> { lastMsg: string, timestamp: number }
const COOLDOWN_MS = 5000;

// --- Cambiar estado
function cambiarEstado() {
  if (!statusConfig.estados.length) return;
  const e = statusConfig.estados[Math.floor(Math.random() * statusConfig.estados.length)];
  const activityType = ActivityType[e.tipo] ?? ActivityType.Playing ?? 0;
  client.user.setActivity(e.mensaje, { type: activityType });
}

// --- Filtrar seguridad
async function filtrarSeguridad(message) {
  if (!message || !message.content || message.author.bot) return false;
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

  return true;
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
  setInterval(cambiarEstado, Math.max(1, statusConfig.intervaloMinutos) * 60 * 1000);
});

// --- messageCreate
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const ok = await filtrarSeguridad(message);
  if (!ok) return;

  // Cooldown por usuario y mensaje
  const userId = message.author.id;
  const contenido = (message.content || '').toLowerCase();
  const now = Date.now();
  const last = userLastMessage.get(userId);
  if (last && last.lastMsg === contenido && now - last.timestamp < COOLDOWN_MS) return;
  userLastMessage.set(userId, { lastMsg: contenido, timestamp: now });

  // --- Comandos desde cmd.json (tipo /softihug, /softidance)
  if (contenido.startsWith('/')) {
    const parts = contenido.slice(1).trim().split(/\s+/);
    const name = parts.shift().toLowerCase();
    const found = cmd.find(c => String(c.name).toLowerCase() === name);
    if (found) {
      await message.reply(`${found.response || 'UwU no entiendo ese comando'} ${found.emoji || ''}`);
      return;
    }
  }

  // --- Mencion o DM → respuesta kawaii
  if (message.mentions.has(client.user) || message.channel.type === 'DM') {
    const resp = respuestaRandom() || 'Nyaa~ ¿en qué puedo ayudarte? 💖';
    await message.reply(resp);
    return;
  }

  // --- Frases detectadas
  for (const f of frasesDetectadas) {
    if (!f) continue;
    if (contenido.includes(String(f).toLowerCase())) {
      const resp = respuestaRandom();
      if (resp) {
        await message.reply(resp);
        return;
      }
    }
  }

});

if (!TOKEN) {
  console.error('✖ TOKEN no encontrado en environment');
  process.exit(1);
}

client.login(TOKEN).catch(err => console.error('Error iniciando sesión:', err.message));
