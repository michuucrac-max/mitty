// index.js (ESM)
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
const securityFile = safeReadJSON('security_manager.json', {});
const vocabularioFile = safeReadJSON('vocabulario.json', []);
const conversacionesFile = path.join(__dirname, 'conversaciones.json');

// --- Config seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  antispam: securityFile.antispam || { maxMensajes: 5, intervaloMs: 5000, timeoutSegundos: 3600, advertencia: '⚠️ ¡OwO cuidado {usuario}! estás enviando muchos mensajitos seguidos, nyan~' },
  mensajes: securityFile.mensajes || { bloqueo: '🚫 Nya~ ¡no puedes decir eso, {usuario}!', link: '🔗 Nya~ no puedes enviar enlaces externos, {usuario} uwu 💖' }
};

// --- Vocabulario
const vocabulario = Array.isArray(vocabularioFile) ? vocabularioFile : vocabularioFile.respuestas || [];

// --- Inicializar OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// --- Client Discord
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

// --- Memoria de conversaciones y antispam
let conversaciones = safeReadJSON('conversaciones.json', {});
const userTraffic = new Map();

// --- Guardar conversaciones
function saveConversaciones() {
  try { fs.writeFileSync(conversacionesFile, JSON.stringify(conversaciones, null, 2)); } 
  catch(err) { console.error('Error guardando conversaciones:', err); }
}

// --- Filtrar seguridad
async function filtrarSeguridad(message) {
  if (!message.content || message.author.bot) return false;
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
  const data = userTraffic.get(message.author.id) || { msgs: [] };
  data.msgs = data.msgs.filter(ts => now - ts < (security.antispam.intervaloMs || 5000));
  data.msgs.push(now);
  userTraffic.set(message.author.id, data);

  if (data.msgs.length > (security.antispam.maxMensajes || 5)) {
    await message.channel.send((security.antispam.advertencia || '⚠️ cuidado {usuario}').replace('{usuario}', userLabel)).catch(() => {});
    data.msgs = [];
    userTraffic.set(message.author.id, data);
    return false;
  }

  return true;
}

// --- Respuesta random vocabulario
function respuestaRandom() {
  if (!vocabulario.length) return 'Nyaa~ ¿en qué puedo ayudarte? 💖';
  return vocabulario[Math.floor(Math.random() * vocabulario.length)];
}

// --- Cambiar estado
const estados = ['jugando con estrellitas ✨', 'ronroneando feliz 🐱', 'soñando con galletitas 🥠'];
function cambiarEstado() {
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(estado, { type: ActivityType.Playing });
}

// --- Función OpenAI
async function responderOpenAI(userId, mensaje) {
  conversaciones[userId] = conversaciones[userId] || [];
  conversaciones[userId].push({ role: 'user', content: mensaje });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Responde de forma kawaii, furry, uwu, tierna, con emojis.' },
        ...conversaciones[userId]
      ],
      max_tokens: 200
    });

    const respuesta = completion.choices[0].message.content;
    conversaciones[userId].push({ role: 'assistant', content: respuesta });
    saveConversaciones();
    return respuesta;
  } catch(err) {
    console.error('OpenAI error:', err.message);
    return 'Nyaa~ uwu algo salió mal, intenta de nuevo 💖';
  }
}

// --- Ready
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} listo!`);
  cambiarEstado();
  setInterval(cambiarEstado, 5 * 60 * 1000);
});

// --- messageCreate
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const ok = await filtrarSeguridad(message);
  if (!ok) return;

  const contenido = message.content.toLowerCase();

  // Comandos /softihug etc
  if (contenido.startsWith('/')) {
    const parts = contenido.slice(1).trim().split(/\s+/);
    const name = parts.shift().toLowerCase();
    const found = cmd.find(c => c.name.toLowerCase() === name);
    if (found) {
      await message.reply(`${found.response || 'UwU no entiendo'} ${found.emoji || ''}`);
      return;
    }
  }

  // DM: siempre responde sin mentions
  if (message.channel.type === 'DM' || message.mentions.has(client.user)) {
    const resp = await responderOpenAI(message.author.id, message.content);
    if (resp) await message.reply(resp);
    return;
  }
});

if (!TOKEN) {
  console.error('✖ TOKEN no encontrado en environment');
  process.exit(1);
}

client.login(TOKEN).catch(err => console.error('Error iniciando sesión:', err.message));
