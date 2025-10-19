// index.js (ESM) — completo, con comandos / y DM con IA furry/uwu
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  Collection,
  REST,
  Routes
} from 'discord.js';
import OpenAI from 'openai';

// --- Paths seguros
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Leer JSON seguro
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
const statusFile = safeReadJSON('status_manager.json', null);
const frasesDetectadasFile = safeReadJSON('frases_detectadas.json', []) || [];
const securityFile = safeReadJSON('security_manager.json', {});
const vocabularioFile = safeReadJSON('vocabulario.json', []);

// --- Normalizar seguridad
const security = {
  palabras: securityFile.palabras || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  antispam: securityFile.antispam || {
    maxMensajes: 5,
    intervaloMs: 5000,
    timeoutSegundos: 3600,
    advertencia: '⚠️ ¡OwO cuidado {usuario}! estás enviando muchos mensajitos, nyan~'
  },
  mensajes: securityFile.mensajes || {
    bloqueo: '🚫 Nya~ ¡no puedes decir eso, {usuario}!',
    link: '🔗 Nya~ no puedes enviar enlaces externos, {usuario} uwu 💖'
  }
};

// --- Estados
let statusConfig = { intervaloMinutos: 5, estados: [] };
if (statusFile) {
  if (Array.isArray(statusFile.estados)) {
    statusConfig.estados = statusFile.estados.map(e => ({
      tipo: e.tipo || 'PLAYING',
      mensaje: e.mensaje || e.name || ''
    })).filter(e => e.mensaje);
    statusConfig.intervaloMinutos = statusFile.intervaloMinutos || 5;
  } else if (Array.isArray(statusFile)) {
    statusConfig.estados = statusFile.map(m => ({ tipo: 'PLAYING', mensaje: m }));
  }
}

// --- Frases detectadas y vocabulario
const frasesDetectadas = Array.isArray(frasesDetectadasFile) ? frasesDetectadasFile : (frasesDetectadasFile?.frases || []);
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
const OWNER_ID = process.env.OWNER_ID || admin.owner_id;
const OPENAI_KEY = process.env.OPENAI_KEY; // desde environment
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Cooldowns y tráfico
const userTraffic = new Map();
const cooldowns = new Set();

// --- Cambiar estado
function cambiarEstado() {
  try {
    if (!statusConfig.estados.length) return;
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
  if (!message || !message.content) return false;
  if (message.author?.bot) return false;

  const txt = message.content.toLowerCase();
  const userLabel = message.author.username;

  // Links
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

  // Antispam
  const now = Date.now();
  const data = userTraffic.get(message.author.id) || { msgs: [], strikes: 0 };
  data.msgs = data.msgs.filter(ts => now - ts < (security.antispam.intervaloMs || 5000));
  data.msgs.push(now);
  if (data.msgs.length > (security.antispam.maxMensajes || 5)) {
    data.strikes++;
    userTraffic.set(message.author.id, { msgs: [], strikes: data.strikes });
    await message.channel.send((security.antispam.advertencia).replace('{usuario}', userLabel)).catch(() => {});
    return false;
  } else {
    userTraffic.set(message.author.id, data);
  }

  return true;
}

// --- Respuesta random
function respuestaRandom() {
  const arr = vocabulario.respuestas || [];
  if (!arr.length) return 'Nyaa~ ¿en qué puedo ayudarte? 💖';
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Crear slash commands
client.commands = new Collection();
for (const c of cmd) {
  client.commands.set(c.name, c);
}

// --- Ready
client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} listo!`);
  cambiarEstado();
  const mins = Math.max(1, parseInt(statusConfig.intervaloMinutos || 5, 10));
  setInterval(cambiarEstado, mins * 60 * 1000);

  // Registrar slash commands globales
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: cmd.map(c => ({ name: c.name, description: c.description, type: 1 })) }
    );
    console.log('[Slash] Comandos registrados globalmente');
  } catch (err) {
    console.error('Error registrando slash commands:', err.message);
  }
});

// --- Interacciones slash
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const cmdData = client.commands.get(interaction.commandName);
  if (!cmdData) return;

  let reply = cmdData.response || 'OwO no sé qué decir';
  if (cmdData.image) reply += `\n${cmdData.image}`;
  await interaction.reply(reply);
});

// --- messageCreate
client.on('messageCreate', async message => {
  try {
    if (message.author.bot) return;

    const ok = await filtrarSeguridad(message);
    if (!ok) return;

    if (cooldowns.has(message.author.id)) return;
    cooldowns.add(message.author.id);
    setTimeout(() => cooldowns.delete(message.author.id), 2000);

    const contenido = (message.content || '').toLowerCase();

    // --- Comandos prefix "!softi"
    if (contenido.startsWith('!softi')) {
      const parts = contenido.split(/\s+/).slice(1);
      const sub = parts.shift() || '';
      switch (sub.toLowerCase()) {
        case 'hablar':
          return message.reply(`Nyaa~ ${message.author.username}, ¿cómo estás hoy uwu? 💞`);
        case 'hug':
          return message.reply(`OwO ${message.author.username}, ven~ te doy un abracito suave 🤗💕`);
        case 'kiss':
          return message.reply(`Mwah~ 💋 ${message.author.username}, un besito tierno solo para ti~`);
        case 'commands':
          // enviar DM con lista de comandos y descripción
          const desc = cmd.map(c => `/${c.name} — ${c.description}`).join('\n');
          await message.author.send(`Nyaa~ Aquí están mis comandos uwu:\n${desc}`);
          return message.reply('Nyaa~ te envié la lista de comandos por DM 💌');
        default:
          return message.reply('OwO no entiendo ese comando, nyan~');
      }
    }

    // --- Menciones o DMs → usar IA furry/uwu
    if (message.mentions.has(client.user) || message.channel.type === 1 /* DM */) {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Habla siempre kawaii, furry, cute y uwu. Usa emojis, mimos y expresiones adorables.' },
          { role: 'user', content: message.content }
        ],
        max_tokens: 200
      });
      const text = resp.choices?.[0]?.message?.content || respuestaRandom();
      return message.reply(text);
    }

    // --- Detección de frases
    for (const f of [...frasesDetectadas, ...vocabulario.detectar]) {
      if (!f) continue;
      if (contenido.includes(f.toLowerCase())) {
        return message.reply(respuestaRandom());
      }
    }

  } catch (err) {
    console.error('messageCreate error:', err);
  }
});

// --- Login
if (!TOKEN) {
  console.error('✖ TOKEN no encontrado. Añade TOKEN al environment');
  process.exit(1);
}
client.login(TOKEN).catch(err => console.error('Error iniciando sesión:', err.message));
