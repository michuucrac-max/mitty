// index.js (ESM) — ultra kawaii, sin límite de tokens
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import OpenAI from 'openai';

// --- Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- JSON seguro
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

function safeWriteJSON(filename, data) {
  try {
    fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`[safeWriteJSON] Error escribiendo ${filename}:`, err.message);
  }
}

// --- Archivos
const cmd = safeReadJSON('cmd.json', []);
const securityFile = safeReadJSON('security_manager.json', {});
const frasesDetectadasFile = safeReadJSON('frases_detectadas.json', []) || [];
const vocabularioFile = safeReadJSON('vocabulario.json', null);
const conversationsFile = safeReadJSON('conversations.json', {});

// --- Seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  antispam: securityFile.antispam || { maxMensajes: 5, intervaloMs: 5000, timeoutSegundos: 3600 },
  mensajes: securityFile.mensajes || { bloqueo: '🚫 Nya~ ¡no puedes decir eso, {usuario}!', link: '🔗 Nya~ no puedes enviar enlaces externos, {usuario} uwu 💖' }
};

// --- Frases detectadas
const frasesDetectadas = Array.isArray(frasesDetectadasFile) ? frasesDetectadasFile : [];

// --- Vocabulario
const vocabulario = (() => {
  if (!vocabularioFile) return { respuestas: [], detectar: [] };
  if (Array.isArray(vocabularioFile)) return { respuestas: vocabularioFile, detectar: [] };
  return { respuestas: vocabularioFile.respuestas || [], detectar: vocabularioFile.detectar || [] };
})();

// --- Discord Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

const TOKEN = process.env.TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;

// --- OpenAI
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Conversaciones persistentes
const userConversations = new Map(Object.entries(conversationsFile));
const RESET_TIMEOUT = 30 * 60 * 1000;

function getUserConversation(userId) {
  const entry = userConversations.get(userId) || { messages: [], lastActive: Date.now() };
  if (Date.now() - entry.lastActive > RESET_TIMEOUT) entry.messages = [];
  entry.lastActive = Date.now();
  userConversations.set(userId, entry);
  return entry.messages;
}

function saveUserConversation(userId, messages) {
  userConversations.set(userId, { messages, lastActive: Date.now() });
  safeWriteJSON('conversations.json', Object.fromEntries(userConversations));
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

// --- Responder OpenAI sin límite de tokens
async function responderOpenAI(userId, userMessage) {
  try {
    const conversation = getUserConversation(userId);
    const prompt = `Responde kawaii, furry, uwu/owo, tierna y con emojis al usuario: "${userMessage}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [...conversation, { role: "user", content: prompt }],
      temperature: 1.0
    });

    const reply = completion.choices[0].message.content;
    const nuevaConv = [...conversation, { role: "user", content: userMessage }, { role: "assistant", content: reply }].slice(-20);
    saveUserConversation(userId, nuevaConv);

    return reply;
  } catch (err) {
    console.error("OpenAI error:", err.message);
    return null;
  }
}

// --- Ready
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} listo!`);
});

// --- messageCreate
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const ok = await filtrarSeguridad(message);
  if (!ok) return;

  const contenido = (message.content || '').toLowerCase();
  const userId = message.author.id;

  // Comandos /softi*
  if (contenido.startsWith('/')) {
    const parts = contenido.slice(1).trim().split(/\s+/);
    const name = parts.shift().toLowerCase();
    const found = cmd.find(c => String(c.name).toLowerCase() === name);
    if (found) {
      await message.reply(`${found.response || 'UwU no entiendo ese comando'} ${found.emoji || ''}`);
      return;
    }
  }

  // DM o mención → OpenAI
  if (message.channel.type === 'DM' || message.mentions.has(client.user)) {
    const resp = await responderOpenAI(userId, message.content);
    if (resp) await message.reply(resp);
    return;
  }

  // Frases detectadas
  for (const f of frasesDetectadas) {
    if (!f) continue;
    if (contenido.includes(String(f).toLowerCase())) {
      const resp = vocabulario.respuestas[Math.floor(Math.random() * vocabulario.respuestas.length)];
      if (resp) await message.reply(resp);
      return;
    }
  }
});

if (!TOKEN || !OPENAI_KEY) {
  console.error('✖ TOKEN o OPENAI_KEY no encontradas en environment');
  process.exit(1);
}

client.login(TOKEN).catch(err => console.error('Error iniciando sesión:', err.message));
