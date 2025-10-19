// index.js (ESM) — completo con OpenAI
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import OpenAI from 'openai';

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

// --- OpenAI
const OPENAI_KEY = process.env.OPENAI_KEY;
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID || admin.owner_id || admin.OWNER_ID || admin.ownerId;

// --- Memoria simple por usuario
const userMemory = new Map(); // userId -> { lastMessage: string, conversation: [{role, content}] }

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

  if (security.bloqueoLinks) {
    const linkRegex = /(https?:\/\/|www\.|discord\.gg\/)/i;
    if (linkRegex.test(txt)) {
      await message.delete().catch(() => {});
      await message.channel.send(security.mensajes.link.replace('{usuario}', userLabel)).catch(() => {});
      return false;
    }
  }

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

// --- Respuesta random local
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

// --- OpenAI responder
async function responderOpenAI(userId, content) {
  try {
    const memory = userMemory.get(userId) || { conversation: [] };
    // agregar mensaje del usuario
    memory.conversation.push({ role: 'user', content });
    // mantener max 20 mensajes
    if (memory.conversation.length > 20) memory.conversation.shift();

    // prompt kawaii/furry/uwu
    const prompt = [
      { role: 'system', content: 'Eres un bot adorable, kawaii, furry, muy cute y suave, usando lenguaje uwu y frases tiernas.' },
      ...memory.conversation
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: prompt,
      temperature: 0.8,
    });

    const resp = completion.choices[0].message.content || 'Nyaa~ 💖';
    memory.conversation.push({ role: 'assistant', content: resp });
    userMemory.set(userId, memory);
    return resp;
  } catch (err) {
    console.error('OpenAI error:', err.message);
    return respuestaRandom() || 'Nyaa~ 💖';
  }
}

// --- messageCreate
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const ok = await filtrarSeguridad(message);
  if (!ok) return;

  const contenido = (message.content || '').toLowerCase();
  const userId = message.author.id;

  // --- Comandos locales
  if (contenido.startsWith('/')) {
    const parts = contenido.slice(1).trim().split(/\s+/);
    const name = parts.shift().toLowerCase();
    const found = cmd.find(c => String(c.name).toLowerCase() === name);
    if (found) {
      await message.reply(`${found.response || 'UwU no entiendo ese comando'} ${found.emoji || ''}`);
      return;
    }
  }

  // --- Mencion al bot o DM → OpenAI
  if (message.mentions.has(client.user) || message.channel.type === 'DM') {
    const resp = await responderOpenAI(userId, message.content);
    await message.reply(resp);
    return;
  }

  // --- Frases detectadas locales
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

if (!OPENAI_KEY) {
  console.warn('⚠️ OPENAI_KEY no encontrada. Se usarán solo respuestas locales.');
}

client.login(TOKEN).catch(err => console.error('Error iniciando sesión:', err.message));
