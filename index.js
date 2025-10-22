// ================================
// index.js — Softti Tales Bot (Todo incluido)
// ================================
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import OpenAI from 'openai';

// Archivos locales
import { initAutoMod, checkMessage } from './automod.js';
import autoupdate from './autoupdate.js';
import { showHelpPanel, handleGuildConfigMessage } from './softitales-config.js';

// Configuración básica
const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// Inicializa AutoMod
initAutoMod();

// Autoupdate activo
autoupdate(client);

// Colecciones para comandos
client.commands = new Collection();

// Archivos JSON
const CMD_FILE = './cmd.json';
const GUILD_CMDS_FILE = './guildCommands.json';
const CONVERSA_FILE = './conversaciones.json';
const MEMORIA_FILE = './memoria.json';
const ESTADOS_FILE = './estados.json';

// Carga JSON o inicializa si no existe
function loadJson(file, empty = {}) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(empty, null, 2));
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

let cmdJson = loadJson(CMD_FILE, []);
let guildCommands = loadJson(GUILD_CMDS_FILE, {});
let conversaciones = loadJson(CONVERSA_FILE, []);
let memoria = loadJson(MEMORIA_FILE, []);
let estados = loadJson(ESTADOS_FILE, []);

// Borra y carga comandos antiguos
function loadCommands() {
  client.commands.clear();
  // cmd.json
  for (const c of cmdJson) {
    client.commands.set(c.name, c);
    console.log(`⚡ Cargado comando kawaii: /${c.name} — ${c.description}`);
  }
  // guildCommands.json
  for (const name in guildCommands) {
    client.commands.set(name, { name, description: 'Comando dinámico del servidor', response: guildCommands[name] });
    console.log(`⚡ Cargado comando dinámico: /${name}`);
  }
}

loadCommands();

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Estado aleatorio
function setRandomPresence() {
  if (!estados.length) return;
  const status = estados[Math.floor(Math.random() * estados.length)];
  client.user.setPresence({ activities: [{ name: status, type: 0 }] }).catch(() => {});
}
setInterval(setRandomPresence, 10_000);

// ================================
// EVENTO: ready
// ================================
client.on('ready', () => {
  console.log(`🤖 Softti Tales Bot listo! Conectado como ${client.user.tag}`);
  setRandomPresence();
});

// ================================
// EVENTO: messageCreate
// ================================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // --- 1) AutoMod
  const block = await checkMessage(message);
  if (block) return;

  const content = message.content.trim();
  const isOwner = message.author.id === OWNER_ID;

  // --- 2) Comandos /softi
  if (content.startsWith('/softi')) {
    const args = content.slice(1).split(/ +/);
    const cmdName = args[0].replace('softi', '').toLowerCase();

    // Panel de ayuda
    if (cmdName === 'help') {
      if (isOwner) {
        await showHelpPanel(message);
      } else {
        await message.reply('⚠️ Solo el Owner puede ver este panel.');
      }
      return;
    }

    if (cmdName === 'helpmod') {
      await message.reply('⚙️ Comandos de moderación: `/softihelpmod` solo para administradores.');
      return;
    }

    // Comandos kawaii
    const cmd = client.commands.get(cmdName);
    if (cmd) {
      const target = message.mentions.users.first()?.username || 'amigui';
      const response = cmd.response?.replace?.('{user}', message.author.username).replace('{target}', target) || 'uwu';
      await message.reply(response);
      return;
    }
  }

  // --- 3) Owner: configuración
  if (isOwner) {
    const handled = await handleGuildConfigMessage(message.guild?.id || 'dm', message);
    if (handled) {
      loadCommands(); // recarga comandos nuevos
      return;
    }
  }

  // --- 4) IA kawaii/furry/uwu
  if (message.mentions.has(client.user.id) || message.channel.type === 1) {
    let conversation = conversaciones.find(c => c.userId === message.author.id);
    if (!conversation) {
      conversation = { userId: message.author.id, messages: [] };
      conversaciones.push(conversation);
    }
    conversation.messages.push({ role: 'user', content });

    // Limita memoria
    if (conversation.messages.length > 10) conversation.messages.shift();

    const promptMessages = conversation.messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres Softi, una IA kawaii/furry/uwu. Responde de manera tierna y juguetona.' },
          ...promptMessages
        ],
        temperature: 0.8
      });

      const reply = completion.choices[0].message.content;
      conversation.messages.push({ role: 'assistant', content: reply });
      await message.reply(reply);

      fs.writeFileSync(CONVERSA_FILE, JSON.stringify(conversaciones, null, 2));
    } catch (err) {
      console.error('❌ Error en IA:', err);
      await message.reply('⚠️ Oops, la IA no respondió uwu 💖');
    }
  }
});

// ================================
// LOGIN
// ================================
client.login(TOKEN);
