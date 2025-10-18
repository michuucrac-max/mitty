// index.js (ESM) — Discord + OpenAI kawaii/furry/uwu
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder } from 'discord.js';
import OpenAI from 'openai';

// --- Paths seguros
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Función para leer JSON de manera segura
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

// --- Cargar archivos JSON
const cmd = safeReadJSON('cmd.json', []);
const admin = safeReadJSON('admin.json', {});
const estadosFile = safeReadJSON('estados.json', []);
const frasesDetectadasFile = safeReadJSON('frases_detectadas.json', null) || safeReadJSON('frases_detect.json', null) || [];
const securityFile = safeReadJSON('security_manager.json', {});
const statusFile = safeReadJSON('status_manager.json', null);
const vocabularioFile = safeReadJSON('vocabulario.json', null);

// --- Configuración de seguridad
const security = {
  palabras: securityFile.palabrasProhibidas
    || securityFile.palabras_bloqueadas
    || securityFile.palabrasProhibidas
    || securityFile.palabras || [],
  bloqueoLinks: typeof securityFile.bloqueoLinks === 'boolean' ? securityFile.bloqueoLinks : (securityFile.bloquearLinks ?? true),
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
      tipo: e.tipo || e.type || e.activityType || 'PLAYING',
      mensaje: e.mensaje || e.texto || e.name || e.message || ''
    })).filter(e => e.mensaje);
  } else if (Array.isArray(statusFile)) {
    statusConfig.estados = statusFile.map(m => ({ tipo: 'PLAYING', mensaje: m }));
  }
}
if (statusConfig.estados.length === 0 && Array.isArray(estadosFile) && estadosFile.length) {
  statusConfig.estados = estadosFile.map(s => ({ tipo: 'PLAYING', mensaje: s }));
}

// --- Frases detectadas y vocabulario
const frasesDetectadas = Array.isArray(frasesDetectadasFile) ? frasesDetectadasFile : (frasesDetectadasFile?.frases || []);
const vocabulario = (() => {
  if (!vocabularioFile) return { respuestas: [], detectar: [] };
  if (Array.isArray(vocabularioFile)) return { respuestas: vocabularioFile, detectar: [] };
  return {
    respuestas: vocabularioFile.respuestas || vocabularioFile.frases || vocabularioFile || [],
    detectar: vocabularioFile.detectar || vocabularioFile.detectarFrases || []
  };
})();

// --- Cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// --- Tokens y IDs
const TOKEN = process.env.TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const OWNER_ID = process.env.OWNER_ID || admin.owner_id || admin.OWNER_ID || admin.ownerId;

// --- Memorias y antispam
const userTraffic = new Map();
const cooldowns = new Set();

// --- Cliente OpenAI
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Cambiar estado del bot
function cambiarEstado() {
  if (!statusConfig.estados.length) return;
  const e = statusConfig.estados[Math.floor(Math.random() * statusConfig.estados.length)];
  const activityType = ActivityType[e.tipo.toUpperCase()] ?? ActivityType.Playing;
  client.user.setActivity(e.mensaje, { type: activityType }).catch(() => {});
  console.log(`[Estado] ${e.tipo} — ${e.mensaje}`);
}

// --- Filtrado de seguridad
async function filtrarSeguridad(message) {
  try {
    if (!message?.content || message.author?.bot) return false;
    const txt = message.content.toLowerCase();
    const userLabel = message.author.username || 'usuario';

    // Bloqueo de links
    if (security.bloqueoLinks && /(https?:\/\/|www\.|discord\.gg\/)/i.test(txt)) {
      await message.delete().catch(() => {});
      await message.channel.send(security.mensajes.link.replace('{usuario}', userLabel)).catch(() => {});
      console.log(`[Seguridad] Link bloqueado por ${userLabel}`);
      return false;
    }

    // Palabras prohibidas
    if (security.palabras?.length) {
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
    const data = userTraffic.get(message.author.id) || { msgs: [], strikes: 0 };
    data.msgs = data.msgs.filter(ts => now - ts < (security.antispam.intervaloMs || 5000));
    data.msgs.push(now);
    if (data.msgs.length > (security.antispam.maxMensajes || 5)) {
      data.strikes = (data.strikes || 0) + 1;
      userTraffic.set(message.author.id, { msgs: [], strikes: data.strikes });
      try {
        const timeoutSec = security.antispam.timeoutSegundos || 3600;
        if (message.member?.timeout) {
          await message.member.timeout(timeoutSec * 1000, 'Spam detectado por security_manager');
        }
        await message.channel.send((security.antispam.advertencia || '⚠️ Cuidado {usuario}').replace('{usuario}', userLabel)).catch(() => {});
      } catch {
        await message.channel.send((security.antispam.advertencia || '⚠️ Cuidado {usuario}').replace('{usuario}', userLabel)).catch(() => {});
      }
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

// --- Función para pedirle algo a GPT estilo kawaii/furry/uwu
async function pedirGPT(prompt) {
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Responde al siguiente mensaje de forma kawaii, tierna, furry y uwu, usando emojis adorables:\n${prompt}`
      }],
      temperature: 0.8
    });
    return resp.choices[0].message.content;
  } catch (err) {
    console.error("Error OpenAI:", err.message);
    return "❌ Nyaa~ hubo un error kawaii al intentar responder";
  }
}

// --- Obtener respuesta random de vocabulario local
function respuestaRandom() {
  const arr = vocabulario.respuestas || [];
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Evento ready
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} listo!`);
  cambiarEstado();
  setInterval(cambiarEstado, Math.max(1, parseInt(statusConfig.intervaloMinutos || 5, 10)) * 60 * 1000);
});

// --- Evento messageCreate
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;

    // Seguridad primero
    const ok = await filtrarSeguridad(message);
    if (!ok) return;

    // Anti-cooldown local
    if (cooldowns.has(message.author.id)) return;
    cooldowns.add(message.author.id);
    setTimeout(() => cooldowns.delete(message.author.id), 2000);

    const contenido = (message.content || '').toLowerCase();

    // --- Comandos
    if (contenido.startsWith('!')) {
      const parts = contenido.slice(1).trim().split(/\s+/);
      const name = parts.shift().toLowerCase();

      // Array de comandos
      if (Array.isArray(cmd)) {
        const found = cmd.find(c => String(c.name).toLowerCase() === name);
        if (found) {
          if (found.image) {
            const embed = new EmbedBuilder()
              .setTitle(found.title || '')
              .setDescription(found.response || '')
              .setImage(found.image)
              .setColor(found.color || 0xffaaff);
            await message.reply({ embeds: [embed] });
          } else {
            await message.reply(found.response || '');
          }
          return;
        }
      } else if (cmd && typeof cmd === 'object') {
        const found = cmd[name];
        if (found) {
          await message.reply(typeof found === 'string' ? found : (found.response || ''));
          return;
        }
      }

      // Comando especial !softi
      if (name === 'softi') {
        const sub = parts.shift() || '';
        switch (sub.toLowerCase()) {
          case 'hablar':
            return message.reply(`Nyaa~ ${message.author.username}, ¿cómo estás hoy uwu? 💞`);
          case 'hug':
            return message.reply(`OwO ${message.author.username}, ven~ te doy un abracito suave 🤗💕`);
          case 'kiss':
            return message.reply(`Mwah~ 💋 ${message.author.username}, un besito tierno solo para ti~`);
          default:
            return message.reply('OwO no entiendo ese comando, nyan~');
        }
      }
    }

    // --- Menciones al bot → IA kawaii
    if (message.mentions.has(client.user) || message.channel.type === 'DM') {
      const userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();
      const respuesta = await pedirGPT(userMessage || contenido);
      await message.reply(respuesta);
      return;
    }

    // --- Detección por frases
    const frases = [...frasesDetectadas, ...vocabulario.detectar];
    for (const f of frases) {
      if (!f) continue;
      if (contenido.includes(String(f).toLowerCase())) {
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
if (!TOKEN) {
  console.error('✖ TOKEN no encontrado. Añade TOKEN a las variables de entorno en Render');
  process.exit(1);
}
if (!OPENAI_KEY) {
  console.error('✖ OPENAI_KEY no encontrada. Añade OPENAI_KEY a las variables de entorno en Render');
  process.exit(1);
}
client.login(TOKEN).catch(err => console.error('Error iniciando sesión:', err.message));
