// index.js (ESM)
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

// --- Paths seguros
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
const frasesDetectadasFile = safeReadJSON('frases_detectadas.json', []);
const securityFile = safeReadJSON('security_manager.json', {});
const vocabularioFile = safeReadJSON('vocabulario.json', []);

// --- Configuración seguridad
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

// --- Estados
let statusConfig = { intervaloMinutos: 5, estados: [] };
if (Array.isArray(estadosFile) && estadosFile.length) {
  statusConfig.estados = estadosFile.map(s => ({ tipo: 'PLAYING', mensaje: s }));
}

// --- Frases detectadas
const frasesDetectadas = Array.isArray(frasesDetectadasFile) ? frasesDetectadasFile : [];

// --- Vocabulario
const vocabulario = Array.isArray(vocabularioFile) ? vocabularioFile : vocabularioFile.respuestas || [];

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
const OWNER_ID = process.env.OWNER_ID || admin.owner_id || admin.OWNER_ID;

// --- Cooldown para evitar mensajes repetidos
const userLastMessage = new Map();
const COOLDOWN_MS = 15000; // 15 segundos

// --- Cambiar estado
function cambiarEstado() {
  if (!statusConfig.estados || !statusConfig.estados.length) return;
  const e = statusConfig.estados[Math.floor(Math.random() * statusConfig.estados.length)];
  const activityType = ActivityType[e.tipo] ?? ActivityType.Playing ?? 0;
  client.user.setActivity(e.mensaje, { type: activityType });
  console.log(`[Estado] ${e.tipo} — ${e.mensaje}`);
}

// --- Seguridad y antispam
async function filtrarSeguridad(message) {
  if (!message.content || message.author?.bot) return false;
  const txt = message.content.toLowerCase();
  const userLabel = message.author.username || 'usuario';

  // Bloqueo links
  if (security.bloqueoLinks && /(https?:\/\/|www\.|discord\.gg\/)/i.test(txt)) {
    await message.delete().catch(() => {});
    await message.channel.send(security.mensajes.link.replace('{usuario}', userLabel)).catch(() => {});
    return false;
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

  // Antispam simple
  const now = Date.now();
  const data = userLastMessage.get(message.author.id) || { msgs: [], strikes: 0 };
  data.msgs = data.msgs.filter(ts => now - ts < security.antispam.intervaloMs);
  data.msgs.push(now);
  if (data.msgs.length > security.antispam.maxMensajes) {
    data.strikes = (data.strikes || 0) + 1;
    userLastMessage.set(message.author.id, { msgs: [], strikes: data.strikes });
    await message.channel.send(security.antispam.advertencia.replace('{usuario}', userLabel)).catch(() => {});
    return false;
  }
  userLastMessage.set(message.author.id, data);
  return true;
}

// --- Respuesta aleatoria
function respuestaRandom() {
  if (!vocabulario || !vocabulario.length) return 'Nyaa~ ¿en qué puedo ayudarte? 💖';
  return vocabulario[Math.floor(Math.random() * vocabulario.length)];
}

// --- OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// --- ready
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} listo!`);
  cambiarEstado();
  setInterval(cambiarEstado, (statusConfig.intervaloMinutos || 5) * 60 * 1000);
});

// --- messageCreate
client.on('messageCreate', async message => {
  try {
    if (message.author.bot) return;

    // Seguridad
    const ok = await filtrarSeguridad(message);
    if (!ok) return;

    // Evitar doble respuesta en cooldown
    const last = userLastMessage.get(message.author.id);
    if (last && last.lastMsg === message.content && Date.now() - (last.timestamp || 0) < COOLDOWN_MS) return;
    userLastMessage.set(message.author.id, { lastMsg: message.content, timestamp: Date.now() });

    const contenido = message.content.toLowerCase();

    // --- Comandos locales (cmd.json)
    if (contenido.startsWith('/')) {
      const parts = contenido.slice(1).split(' ');
      const cmdName = parts[0].toLowerCase();
      const command = cmd.find(c => c.name === cmdName);
      if (command) {
        if (command.description) {
          await message.reply(`**${command.name}** — ${command.description} ${command.emoji || ''}`);
        } else {
          await message.reply(`**${command.name}** ${command.emoji || ''}`);
        }
        return;
      }
    }

    // --- Responde al mencionar o DM
    if (message.channel.type === 'DM' || message.mentions.has(client.user)) {
      // Llamar a OpenAI para respuesta
      const prompt = `Responde de manera furry, kawaii y uwu a este mensaje:\n"${message.content}"`;
      const aiResp = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8
      });
      const text = aiResp.choices[0].message.content.trim();
      await message.reply(text);
      return;
    }

    // --- Detección por frases
    for (const f of frasesDetectadas) {
      if (contenido.includes(f.toLowerCase())) {
        await message.reply(respuestaRandom());
        return;
      }
    }

  } catch (err) {
    console.error('messageCreate error:', err.message);
  }
});

// --- login
if (!TOKEN) {
  console.error('✖ TOKEN no encontrado. Añade TOKEN al environment');
  process.exit(1);
}
client.login(TOKEN).catch(err => console.error('Error iniciando sesión:', err.message));
