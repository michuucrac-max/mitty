// index.js — estable, activo 24/7, recuerda saludos y no repite
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import http from 'http';

// --- Mantener activo 24/7
setInterval(() => {
  http.get('http://localhost:' + (process.env.PORT || 3000));
}, 240000);

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Softi activo 24/7 💖');
}).listen(process.env.PORT || 3000);

// --- Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Leer JSON
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

// --- Archivos
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
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  antispam: securityFile.antispam || { maxMensajes: 5, intervaloMs: 5000, timeoutSegundos: 3600 },
  mensajes: securityFile.mensajes || { bloqueo: '🚫 ¡no digas eso {usuario}!', link: '🔗 No puedes enviar enlaces, {usuario} 💕' }
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

// --- Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const TOKEN = process.env.TOKEN;

// --- Control de mensajes
const userLastMessage = new Map(); // userId -> { lastMsg, timestamp }
const userGreeted = new Set(); // usuarios que ya saludaron
const COOLDOWN_MS = 5000;

// --- Cambiar estado
function cambiarEstado() {
  if (!statusConfig.estados.length) return;
  const e = statusConfig.estados[Math.floor(Math.random() * statusConfig.estados.length)];
  const activityType = ActivityType[e.tipo] ?? ActivityType.Playing;
  client.user.setActivity(e.mensaje, { type: activityType });
}

// --- Seguridad
async function filtrarSeguridad(message) {
  if (!message || !message.content || message.author.bot) return false;
  const txt = message.content.toLowerCase();
  const userLabel = message.author.username || 'usuario';

  // Bloquear links
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

  return true;
}

// --- Respuesta aleatoria
function respuestaRandom() {
  const arr = vocabulario.respuestas || [];
  if (!arr.length) return 'Nyaa~ ¿en qué puedo ayudarte? 💖';
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Ready
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} está online 24/7 🩷`);
  cambiarEstado();
  setInterval(cambiarEstado, Math.max(1, statusConfig.intervaloMinutos) * 60 * 1000);
});

// --- Mensajes
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const ok = await filtrarSeguridad(message);
  if (!ok) return;

  const userId = message.author.id;
  const contenido = (message.content || '').toLowerCase();
  const now = Date.now();
  const last = userLastMessage.get(userId);

  // Evita spam de mensajes idénticos
  if (last && last.lastMsg === contenido && now - last.timestamp < COOLDOWN_MS) return;
  userLastMessage.set(userId, { lastMsg: contenido, timestamp: now });

  // --- Detectar saludos
  const saludos = ['hola', 'ola', 'buenas', 'holi', 'hello'];
  const esSaludo = saludos.some(s => contenido.startsWith(s));

  if (esSaludo) {
    if (userGreeted.has(userId)) {
      // Ya saludó, no repetir el saludo
      return;
    } else {
      userGreeted.add(userId);
      await message.reply('¡H-hola! 🐾 uwu ¿cómo estás? 💕');
      return;
    }
  }

  // --- Comandos /softi*
  if (contenido.startsWith('/')) {
    const name = contenido.slice(1).split(/\s+/)[0].toLowerCase();
    const found = cmd.find(c => c.name.toLowerCase() === name);
    if (found) {
      await message.reply(`${found.response} ${found.emoji || ''}`);
      return;
    }
  }

  // --- Mención o DM
  if (message.mentions.has(client.user) || message.channel.type === 'DM') {
    const resp = respuestaRandom();
    await message.reply(resp);
    return;
  }

  // --- Frases detectadas
  for (const f of frasesDetectadas) {
    if (contenido.includes(String(f).toLowerCase())) {
      await message.reply(respuestaRandom());
      return;
    }
  }
});

// --- Login
if (!TOKEN) {
  console.error('✖ No se encontró el TOKEN en environment');
  process.exit(1);
}
client.login(TOKEN).catch(err => console.error('Error iniciando sesión:', err.message));
