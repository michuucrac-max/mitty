// index.js — Softi-Tales Bot (Final Hot Reload)
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import autoupdate from './autoupdate.js';
import { initAutoMod, checkMessage } from './automod.js';
import { handleGuildConfigMessage, showHelpPanel } from './softitales-config.js';

// --- Archivos JSON ---
const CMD_FILE = './cmd.json';
const GUILD_CMD_FILE = './guildCommands.json';
const CONVERS_FILE = './conversaciones.json';
const MEMORIA_FILE = './memoria.json';
const ESTADOS_FILE = './estados.json';

// --- Carga JSON ---
function loadJSON(file) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}; }

let baseCmds = loadJSON(CMD_FILE);
let guildCmds = loadJSON(GUILD_CMD_FILE);
let conversaciones = loadJSON(CONVERS_FILE);
let memoria = loadJSON(MEMORIA_FILE);
let estados = loadJSON(ESTADOS_FILE);

// --- Cliente Discord ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// --- Variables ---
const ownerId = 'TU_USER_ID_AQUI'; // Cambiar por tu ID
const prefix = '/softi';
let presenceIndex = 0;
const presenceInterval = 30000;

// --- Colección de comandos activos ---
client.commands = new Collection();

// --- AutoMod ---
initAutoMod();

// --- Autoupdate ---
autoupdate(client);

// --- Función para recargar comandos ---
function reloadCommands() {
  client.commands.clear();
  baseCmds = loadJSON(CMD_FILE);
  guildCmds = loadJSON(GUILD_CMD_FILE);

  // Comandos base
  baseCmds.forEach(c => {
    client.commands.set(c.name.toLowerCase(), c);
  });

  // Comandos guild
  for (const name in guildCmds) {
    client.commands.set(name.toLowerCase(), { name, response: guildCmds[name] });
  }

  console.log('✨ Comandos recargados:');
  client.commands.forEach(cmd => console.log(` - ${cmd.name}: ${cmd.description || cmd.response || 'No description'}`));
}

// --- Inicializar reload al iniciar ---
reloadCommands();

// --- Cambiar presencia ---
function cambiarEstado() {
  if (!estados.length) return;
  const estado = estados[presenceIndex % estados.length];
  client.user.setPresence({ activities: [{ name: estado, type: 0 }] }).catch(() => {});
  presenceIndex++;
}
setInterval(cambiarEstado, presenceInterval);

// --- Función principal de mensajes ---
async function procesarMensaje(message) {
  if (message.author.bot) return;

  // AutoMod
  if (await checkMessage(message)) return;

  const content = message.content.trim();
  const contentLower = content.toLowerCase();

  // --- Owner panel ---
  if (message.author.id === ownerId && contentLower.startsWith(prefix)) {
    const handled = await handleGuildConfigMessage(message.guild?.id || 'DM', {
      ...message,
      content: content.replace(prefix, '')
    });
    if (handled) return;

    // /softihelp
    if (contentLower.startsWith(`${prefix}help`)) {
      await showHelpPanel(message);
      return;
    }
    // /softihelpmod
    if (contentLower.startsWith(`${prefix}helpmod`)) {
      await message.reply({
        content: "⚙️ **Softi AutoMod Panel** ⚙️\n" +
                 "`/softi automod on` — activa AutoMod\n" +
                 "`/softi automod off` — desactiva AutoMod\n" +
                 "`/softi addcmd nombre respuesta` — agrega un comando personalizado\n" +
                 "`/softi addai palabra respuesta` — agrega respuesta IA a palabra\n" +
                 "`/softi addfunc nombre {codigo}` — crea función JS personalizada"
      });
      return;
    }
  }

  // --- Comandos cargados ---
  const cmdName = contentLower.startsWith('/') ? contentLower.slice(1) : null;
  if (cmdName && client.commands.has(cmdName)) {
    const cmd = client.commands.get(cmdName);
    const target = message.mentions.users.first()?.username || 'alguien';
    const response = (cmd.response || '').replace(/\{user\}/g, message.author.username).replace(/\{target\}/g, target);
    if (response) await message.reply(response);
    return;
  }

  // --- Respuestas AI ---
  for (const trigger in conversaciones) {
    if (contentLower.includes(trigger.toLowerCase())) {
      const resp = conversaciones[trigger];
      await message.reply(resp.replace(/\{user\}/g, message.author.username));
      return;
    }
  }

  // --- Guardar en memoria ---
  memoria[message.author.id] = message.content;
  fs.writeFileSync(MEMORIA_FILE, JSON.stringify(memoria, null, 2));
}

// --- Eventos Discord ---
client.on('messageCreate', async message => {
  try { await procesarMensaje(message); }
  catch (err) { console.error('❌ Error procesando mensaje:', err); }
});

client.on('ready', () => {
  console.log(`🌸 ${client.user.tag} conectado y listo kawaii~ 💖`);
  cambiarEstado();
});

// --- Login ---
client.login('TOKEN'); // Reemplazar TOKEN por tu token

// --- server.js (opcional keep-alive) ---
try {
  const { initServer } = await import('./server.js');
  initServer();
} catch (err) {
  console.log('⚠️ server.js no encontrado o error al importar, se omite.');
}

// --- Watch para recargar comandos automáticamente ---
fs.watch([CMD_FILE, GUILD_CMD_FILE], { persistent: true }, (eventType, filename) => {
  if (filename) {
    console.log(`🔁 Detectado cambio en ${filename}, recargando comandos...`);
    reloadCommands();
  }
});
