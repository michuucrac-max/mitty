// 🌸 index.js — Softti Tales Bot completo
import fs from 'fs';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import keepAlive from './server.js';
import { checkMessage } from './automod.js';
import { getGuildSettings, handleGuildConfigMessage, showHelpPanel } from './softitales-config.js';
import OpenAI from 'openai';

// --- KeepAlive para Render ---
keepAlive();

// --- Configuración de OpenAI ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_TOKEN
});

// --- Archivos JSON ---
const CMD_FILE = './cmd.json';
const GUILD_CMD_FILE = './guildCommands.json';
const CONVERSATIONS_FILE = './conversaciones.json';
const MEMORIA_FILE = './memoria.json';
const STATES_FILE = './estados.json';

function loadOrCreate(file, defaultValue = {}) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

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

// --- Función para guardar conversaciones y memoria ---
function saveData() {
  try {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversaciones, null, 2));
    fs.writeFileSync(MEMORIA_FILE, JSON.stringify(memoria, null, 2));
  } catch (err) {
    logInfo('SaveError', err);
  }
}

// --- Función de logging detallado ---
function logInfo(type, details) {
  console.log(`[${new Date().toISOString()}] [${type}]`, details);
}

// --- Anti-error global ---
process.on('unhandledRejection', err => logInfo('UnhandledRejection', err));
process.on('uncaughtException', err => logInfo('UncaughtException', err));

// --- Detectar y responder a mensajes ---
client.on('messageCreate', async message => {
  try {
    if (message.author.bot) return;

    const guildId = message.guild?.id;
    const guildSettings = await getGuildSettings(guildId);

    const blocked = await checkMessage(message);
    if (blocked) return logInfo('AutoMod', `Mensaje bloqueado: ${message.content}`);

    const handled = await handleGuildConfigMessage(guildId, message);
    if (handled) return logInfo('Config', `Comando ejecutado: ${message.content}`);

    const contentLower = message.content.toLowerCase();
    const cmdName = contentLower.startsWith('/') ? contentLower.slice(1).split(' ')[0] : null;

    if (cmdName) {
      let response;
      if (guildId && guildCommands[guildId] && guildCommands[guildId][cmdName]) {
        response = guildCommands[guildId][cmdName];
      } else if (globalCommands[cmdName]) {
        response = globalCommands[cmdName];
      }

      if (response) {
        await message.reply(response);
        logInfo('Command', `Comando ejecutado: /${cmdName} -> ${response}`);
        return;
      }
    }

    const mention = message.mentions.has(client.user.id) || message.channel.type === 1;
    if (mention) {
      const userId = message.author.id;
      conversaciones[userId] = conversaciones[userId] || [];
      conversaciones[userId].push({ role: 'user', content: message.content });

      const prompt = [
        { role: 'system', content: "Eres Softi, una IA femenina kawaii, muy tierna estilo uwu." },
        ...conversaciones[userId]
      ];

      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: prompt,
          max_tokens: 500
        });

        let text = aiResponse.choices[0].message.content;

        memoria[userId] = memoria[userId] || [];
        memoria[userId].push({ question: message.content, answer: text });
        saveData();

        await message.reply(text);
        logInfo('AI', `IA respondió a ${message.author.tag}`);
      } catch (err) {
        await message.reply("¡Ups! Mi cerebro kawaii está ocupado UwU");
        logInfo('OpenAIError', err);
      }
    }

    if (message.attachments.size > 0) {
      for (const attachment of message.attachments.values()) {
        if (attachment.contentType?.startsWith('image')) {
          await message.reply(`¡Qué imagen tan linda, ${message.author.username}! 🌸`);
          logInfo('Image', `Imagen recibida de ${message.author.tag}`);
        }
      }
    }

  } catch (err) {
    logInfo('Error', { message: message.content, error: err.message });
  }
});

// ✅ --- Ready + Rotación de estados ---
client.on('ready', () => {
  console.log(`🌸 Softi-Tales está en línea como ${client.user.tag}`);
  console.log(`✅ ${Object.keys(globalCommands).length} comandos globales cargados`);
  console.log(`✅ ${Object.keys(guildCommands).length} comandos por servidor`);

  function cambiarEstado() {
    const random = estadosKawaii[Math.floor(Math.random() * estadosKawaii.length)];
    client.user.setActivity(random, { type: 0 }); // 0 = Playing
    console.log(`✨ Estado actualizado: ${random}`);
  }

  cambiarEstado();
  setInterval(cambiarEstado, 20000);
});

// --- Login ---
client.login(process.env.TOKEN);
