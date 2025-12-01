// 🌸 Softi Tales Bot — index.js COMPLETO SIN OPENAI
import fs from 'fs';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import keepAlive from './server.js';
import { checkMessage } from './automod.js';
import { getGuildSettings, handleGuildConfigMessage, showHelpPanel } from './softitales-config.js';

// --- KeepAlive para Render ---
keepAlive();

// --- Archivos JSON ---
const CMD_FILE = './cmd.json';
const GUILD_CMD_FILE = './guildCommands.json';
const CONVERSATIONS_FILE = './conversaciones.json';
const MEMORIA_FILE = './memoria.json';
const STATES_FILE = './estados.json';

// --- Función para cargar archivos ---
function loadOrCreate(file, defaultValue = {}) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// --- Cargar JSONs ---
let globalCommands = loadOrCreate(CMD_FILE, {});
let guildCommands = loadOrCreate(GUILD_CMD_FILE, {});
let conversaciones = loadOrCreate(CONVERSATIONS_FILE, {});
let memoria = loadOrCreate(MEMORIA_FILE, {});
let estadosKawaii = loadOrCreate(STATES_FILE, [
  "ronroneando UwU",
  "abrazando gatitos 🐾"
]);

// --- Cliente Discord ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// --- Guardar memoria y conversaciones ---
function saveData() {
  try {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversaciones, null, 2));
    fs.writeFileSync(MEMORIA_FILE, JSON.stringify(memoria, null, 2));
  } catch (err) {
    logInfo('SaveError', err);
  }
}

// --- Logging avanzado ---
function logInfo(type, details) {
  console.log(`[${new Date().toISOString()}] [${type}]`, details);
}

// --- Anti-crash ---
process.on('unhandledRejection', err => logInfo('UnhandledRejection', err));
process.on('uncaughtException', err => logInfo('UncaughtException', err));

// **********************************************************************
//                      🌸 MANEJO DE MENSAJES
// **********************************************************************
client.on('messageCreate', async message => {
  try {
    if (message.author.bot) return;

    const guildId = message.guild?.id;
    const guildSettings = await getGuildSettings(guildId);

    // 1) AutoMod
    const blocked = await checkMessage(message);
    if (blocked) {
      logInfo('AutoMod', `Mensaje bloqueado: ${message.content}`);
      return;
    }

    // 2) Config Panel
    const handled = await handleGuildConfigMessage(guildId, message);
    if (handled) {
      logInfo('Config', `Comando config ejecutado: ${message.content}`);
      return;
    }

    // **********************************************************************
    //                      🌸 SISTEMA DE COMANDOS {/xxx}
    // **********************************************************************

    const content = message.content.trim();
    const isCommand = content.startsWith('/');

    if (isCommand) {
      const cmdName = content.slice(1).split(" ")[0].toLowerCase();

      let response;

      // comando por servidor
      if (guildId && guildCommands[guildId] && guildCommands[guildId][cmdName]) {
        response = guildCommands[guildId][cmdName];
      }
      // comando global
      else if (globalCommands[cmdName]) {
        response = globalCommands[cmdName];
      }

      if (response) {
        let replyText = response
          .replace(/{player}/g, message.author.username)
          .replace(/{player2}/g, message.mentions.users.first()?.username || "nadie")
          .replace(/{guild}/g, message.guild?.name || "este servidor")
          .replace(/{channel}/g, message.channel?.name || "este canal");

        await message.reply(replyText);
        logInfo('Command', `/${cmdName} ejecutado en ${guildId}`);
        return;
      } else {
        logInfo('CommandFail', `Comando no encontrado: /${cmdName}`);
      }
    }

    // **********************************************************************
    //             🌸 RESPUESTA AUTOMÁTICA (ya NO usa OpenAI)
    // **********************************************************************
    const mention = message.mentions.has(client.user.id);

    if (mention) {
      const userId = message.author.id;

      // Guardar conversación para memoria
      conversaciones[userId] = conversaciones[userId] || [];
      conversaciones[userId].push({ role: 'user', content: message.content });

      const respuesta = `¡Hola ${message.author.username}! UwU  
Soy Softi, una IA kawaii pero ya no uso ChatGPT. 💖`;

      memoria[userId] = memoria[userId] || [];
      memoria[userId].push({ question: message.content, answer: respuesta });
      saveData();

      await message.reply(respuesta);
      logInfo('AI', `Softi respondió sin ChatGPT a ${message.author.tag}`);
    }

    // **********************************************************************
    //                      🌸 DETECTAR IMÁGENES
    // **********************************************************************
    if (message.attachments.size > 0) {
      for (const attachment of message.attachments.values()) {
        if (attachment.contentType?.startsWith('image')) {
          await message.reply(`¡Qué imagen tan linda, ${message.author.username}! 🌸`);
          logInfo('Image', `Imagen recibida de ${message.author.tag}`);
        }
      }
    }

  } catch (err) {
    logInfo('Error', { message: message.content, error: err });
  }
});

// **********************************************************************
//                 🌸 READY + ESTADOS (NO CAMBIADO)
// **********************************************************************
client.on('ready', () => {
  console.log(`🌸 Softi-Tales está en línea como ${client.user.tag}`);
  console.log(`✅ ${Object.keys(globalCommands).length} comandos globales cargados`);
  console.log(`✅ ${Object.keys(guildCommands).length} comandos por servidor`);

  function cambiarEstado() {
    if (!estadosKawaii.length) return;
    const random = estadosKawaii[Math.floor(Math.random() * estadosKawaii.length)];
    client.user.setActivity(random, { type: 0 });
    console.log(`✨ Estado actualizado: ${random}`);
  }

  cambiarEstado();
  setInterval(cambiarEstado, 20000);
});

// --- Login ---
client.login(process.env.TOKEN);
