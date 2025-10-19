// index.js (ESM)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType, SlashCommandBuilder, Collection } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

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

// --- Cargar configuraciones
const cmd = safeReadJSON('cmd.json', []);
const admin = safeReadJSON('admin.json', {});
const securityFile = safeReadJSON('security_manager.json', {});
const statusFile = safeReadJSON('status_manager.json', null);

// --- Config seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  antispam: securityFile.antispam || { maxMensajes: 5, intervaloMs: 5000, timeoutSegundos: 3600, advertencia: '⚠️ ¡OwO cuidado {usuario}! estás enviando muchos mensajitos seguidos, nyan~' },
  mensajes: securityFile.mensajes || { bloqueo: '🚫 Nya~ ¡no puedes decir eso, {usuario}!', link: '🔗 Nya~ no puedes enviar enlaces externos, {usuario} uwu 💖' }
};

// --- Estados
let statusConfig = { intervaloMinutos: 5, estados: [{ tipo: 'PLAYING', mensaje: 'con comandos kawaii ✨' }] };
if (statusFile) {
  if (Array.isArray(statusFile.estados)) {
    statusConfig.intervaloMinutos = statusFile.intervaloMinutos || 5;
    statusConfig.estados = statusFile.estados.map(e => ({ tipo: e.tipo || 'PLAYING', mensaje: e.mensaje || '' })).filter(e => e.mensaje);
  }
}

// --- Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || admin.client_id || admin.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID || admin.owner_id || admin.OWNER_ID;

// --- Estado automático
function cambiarEstado() {
  if (!statusConfig.estados.length) return;
  const e = statusConfig.estados[Math.floor(Math.random() * statusConfig.estados.length)];
  const activityType = ActivityType[e.tipo] ?? ActivityType.Playing ?? 0;
  client.user.setActivity(e.mensaje, { type: activityType });
}

// --- Filtro de seguridad
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

// --- Sistema antispam
const userSpamMap = new Map();

function checkSpam(message) {
  const userId = message.author.id;
  const now = Date.now();

  if (!userSpamMap.has(userId)) {
    userSpamMap.set(userId, []);
  }

  const timestamps = userSpamMap.get(userId);
  timestamps.push(now);

  const filtered = timestamps.filter(t => now - t < security.antispam.intervaloMs);
  userSpamMap.set(userId, filtered);

  if (filtered.length > security.antispam.maxMensajes) {
    message.channel.send(security.antispam.advertencia.replace('{usuario}', message.author.username)).catch(() => {});
    message.member?.timeout(security.antispam.timeoutSegundos * 1000, 'Spam detectado').catch(() => {});
    return true;
  }

  return false;
}

// --- Registro dinámico de comandos
async function registrarSlashCommands() {
  if (!cmd.length) return;
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  const commands = cmd.map(c => ({
    name: c.name,
    description: c.description || `Comando ${c.name}`,
    options: [
      {
        name: 'usuario',
        description: 'Selecciona un usuario',
        type: 6, // USER
        required: false
      }
    ]
  }));

  try {
    console.log('📡 Registrando comandos en Discord...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Comandos registrados correctamente');
  } catch (err) {
    console.error('❌ Error al registrar comandos:', err);
  }
}

// --- Ready
client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} está online!`);
  cambiarEstado();
  setInterval(cambiarEstado, Math.max(1, statusConfig.intervaloMinutos) * 60 * 1000);
  await registrarSlashCommands();
});

// --- Interacción de comandos (/softihug, etc)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const comando = cmd.find(c => c.name === interaction.commandName);
  if (!comando) {
    await interaction.reply({ content: 'Nyaa~ comando no encontrado 💔', ephemeral: true });
    return;
  }

  const user = interaction.options.getUser('usuario');
  const author = interaction.user;

  let respuesta = comando.response || '{autor} hizo algo kawaii con {usuario} ✨';
  respuesta = respuesta
    .replace('{autor}', `<@${author.id}>`)
    .replace('{usuario}', user ? `<@${user.id}>` : 'al aire~');

  const finalMsg = `${respuesta} ${comando.emoji || ''}`;

  await interaction.reply({ content: finalMsg });
});

// --- Mensajes normales (incluye DMs)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const ok = await filtrarSeguridad(message);
  if (!ok) return;

  if (checkSpam(message)) return;

  // DMs: responder sin mencionar al bot
  if (message.channel.type === 1 || message.channel.isDMBased()) {
    await message.reply('💌 ¡Hola! Usa `/softihug`, `/softikiss`, `/softiwave`, etc. para interactuar kawaii ✨');
    return;
  }
});

// --- Login
if (!TOKEN) {
  console.error('✖ TOKEN no encontrado en environment');
  process.exit(1);
}

client.login(TOKEN).catch(err => console.error('Error iniciando sesión:', err.message));
