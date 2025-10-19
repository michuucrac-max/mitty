// index.js — versión completa con comandos kawaii y OpenAI
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';

// --- Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Leer JSON seguro
function safeReadJSON(filename, fallback = null) {
  try {
    const full = path.join(__dirname, filename);
    if (!fs.existsSync(full)) return fallback;
    const raw = fs.readFileSync(full, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// --- Archivos base
const cmd = safeReadJSON('cmd.json', []);
const admin = safeReadJSON('admin.json', {});
const securityFile = safeReadJSON('security_manager.json', {});
const conversaciones = safeReadJSON('conversaciones.json', {});
const statusFile = safeReadJSON('status_manager.json', null);

// --- Config seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  mensajes: securityFile.mensajes || {
    bloqueo: '🚫 Nya~ ¡no puedes decir eso, {usuario}!',
    link: '🔗 Nya~ no puedes enviar enlaces, {usuario} uwu 💖'
  },
  antispam: securityFile.antispam || {
    maxMensajes: 5,
    intervaloMs: 5000,
    timeoutSegundos: 3600,
    advertencia: '⚠️ OwO ¡tranquilo {usuario}! estás escribiendo muy rápido, nya~'
  }
};

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

const TOKEN = process.env.TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Conversaciones por usuario
const memoria = new Map();
function guardarConversacion(userId, rol, contenido) {
  if (!memoria.has(userId)) memoria.set(userId, []);
  const historial = memoria.get(userId);
  historial.push({ role: rol, content: contenido });
  if (historial.length > 20) historial.shift();
  memoria.set(userId, historial);
}

// --- Estado dinámico
const statusConfig = {
  intervaloMinutos: statusFile?.intervaloMinutos || 5,
  estados: (statusFile?.estados || [{ tipo: 'PLAYING', mensaje: 'con tus emociones 💖' }])
    .map(e => ({ tipo: e.tipo || 'PLAYING', mensaje: e.mensaje || 'UwU jugando' }))
};

function cambiarEstado() {
  const e = statusConfig.estados[Math.floor(Math.random() * statusConfig.estados.length)];
  client.user.setActivity(e.mensaje, { type: ActivityType[e.tipo] || ActivityType.Playing });
}

// --- Seguridad: bloquear links y palabras
async function filtrarSeguridad(message) {
  if (!message || !message.content || message.author.bot) return false;
  const txt = message.content.toLowerCase();
  const user = message.author.username;

  // Links
  if (security.bloqueoLinks && /(https?:\/\/|www\.|discord\.gg\/)/i.test(txt)) {
    await message.delete().catch(() => {});
    await message.channel.send(security.mensajes.link.replace('{usuario}', user)).catch(() => {});
    return false;
  }

  // Palabras prohibidas
  for (const palabra of security.palabras) {
    if (txt.includes(palabra.toLowerCase())) {
      await message.delete().catch(() => {});
      await message.channel.send(security.mensajes.bloqueo.replace('{usuario}', user)).catch(() => {});
      return false;
    }
  }

  return true;
}

// --- Antispam
const antispamMap = new Map();
function controlarSpam(userId) {
  const ahora = Date.now();
  const data = antispamMap.get(userId) || { mensajes: [], bloqueado: false };
  data.mensajes = data.mensajes.filter(ts => ahora - ts < security.antispam.intervaloMs);
  data.mensajes.push(ahora);
  if (data.mensajes.length > security.antispam.maxMensajes) {
    data.bloqueado = true;
    setTimeout(() => (data.bloqueado = false), security.antispam.timeoutSegundos * 1000);
  }
  antispamMap.set(userId, data);
  return !data.bloqueado;
}

// --- On Ready
client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
  cambiarEstado();
  setInterval(cambiarEstado, statusConfig.intervaloMinutos * 60 * 1000);
});

// --- On Message
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const permitido = await filtrarSeguridad(message);
  if (!permitido) return;

  const userId = message.author.id;
  const contenido = message.content.trim();
  if (!controlarSpam(userId)) {
    await message.reply(security.antispam.advertencia.replace('{usuario}', message.author.username));
    return;
  }

  // --- Comandos tipo /softihug
  if (contenido.startsWith('/')) {
    const args = contenido.slice(1).split(/\s+/);
    const cmdName = args[0].toLowerCase();
    const mentioned = message.mentions.users.first();
    const found = cmd.find(c => c.name.toLowerCase() === cmdName);

    if (found) {
      if (mentioned) {
        const texto = found.response
          .replace('{usuario1}', message.author.username)
          .replace('{usuario2}', mentioned.username);
        await message.reply(`${texto} ${found.emoji || ''}`);
      } else {
        await message.reply(`Nyaa~ necesitas mencionar a alguien para usar **/${cmdName}**, uwu 💕`);
      }
      return;
    }
  }

  // --- Conversaciones (en servidor o DM)
  const esDM = message.channel.type === 1;
  const mencionado = message.mentions.has(client.user);

  if (esDM || mencionado) {
    guardarConversacion(userId, 'user', contenido);

    try {
      const historial = memoria.get(userId) || [];
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un bot kawaii y amable llamado Softi. Hablas con ternura y usas emojis UwU 💖' },
          ...historial
        ]
      });

      const respuesta = completion.choices[0].message.content;
      guardarConversacion(userId, 'assistant', respuesta);
      await message.reply(respuesta);
    } catch (err) {
      console.error('Error con OpenAI:', err);
      await message.reply('Nyaa~ algo salió mal, intenta de nuevo luego 💦');
    }
  }
});

if (!TOKEN) {
  console.error('❌ Falta TOKEN en las variables de entorno');
  process.exit(1);
}

client.login(TOKEN).catch(err => console.error('Error al iniciar sesión:', err.message));
