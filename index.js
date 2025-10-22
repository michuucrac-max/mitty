// index.js — Softi-Tales Bot completo
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

// Archivos locales
import autoupdate from './autoupdate.js';
import { checkMessage, initAutoMod } from './automod.js';
import { handleGuildConfigMessage, showHelpPanel } from './softitales-config.js';

// Cargar JSON
const cmdList = JSON.parse(fs.readFileSync('./cmd.json', 'utf8'));
const estados = JSON.parse(fs.readFileSync('./estados.json', 'utf8'));

// Crear client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// Variables globales
let guildCommands = {};
const guildCommandsFile = './guildCommands.json';
if (fs.existsSync(guildCommandsFile)) {
  guildCommands = JSON.parse(fs.readFileSync(guildCommandsFile, 'utf8'));
} else {
  fs.writeFileSync(guildCommandsFile, '{}');
}

// === AUTOSAVE & AUTORELOAD ===
autoupdate(client);

// === INIT AutoMod ===
initAutoMod();

// === EVENTO READY ===
client.on('ready', () => {
  console.log(`🌸 Bot listo como ${client.user.tag}`);

  // Cambiar estados cada minuto
  function setRandomPresence() {
    if (!estados.length) return;
    const status = estados[Math.floor(Math.random() * estados.length)];
    client.user.setPresence({
      activities: [{ name: status, type: 0 }],
      status: 'online'
    });
  }
  setRandomPresence();
  setInterval(setRandomPresence, 60000);
});

// === EVENTO MESSAGE CREATE ===
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const guildId = message.guild?.id;

  // === AutoMod ===
  const blocked = await checkMessage(message);
  if (blocked) return;

  // === Comandos de configuración para OWNER ===
  if (guildId && content.startsWith('/softi')) {
    const isOwner = message.author.id === process.env.OWNER_ID;
    if (isOwner) {
      const handled = await handleGuildConfigMessage(guildId, message);
      if (handled) return;
    }
  }

  // === Comandos dinámicos de cmd.json y guildCommands.json ===
  const args = content.split(' ');
  const cmdName = args[0].replace('/', '').toLowerCase();

  if (cmdList.some(c => c.name === cmdName)) {
    const cmd = cmdList.find(c => c.name === cmdName);
    const response = cmd.response
      .replace('{user}', message.author.username)
      .replace('{target}', args[1] || 'alguien');
    message.reply(response);
    return;
  }

  if (guildCommands[cmdName]) {
    const response = guildCommands[cmdName].replace('{user}', message.author.username)
                                           .replace('{target}', args[1] || 'alguien');
    message.reply(response);
    return;
  }

  // === Respuesta IA kawaii/furry/uwu ===
  if (content.toLowerCase().includes('softi')) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'Eres Softi, un asistente kawaii/furry/uwu muy tierno y amable.' },
            { role: 'user', content }
          ],
          temperature: 1
        })
      });
      const data = await resp.json();
      if (data?.choices?.[0]?.message?.content) {
        message.reply(data.choices[0].message.content);
      }
    } catch (err) {
      console.error('❌ Error IA:', err);
    }
  }

  // === Panel /softihelp ===
  if (content === '/softihelp') {
    await showHelpPanel(message);
  }
});

// === LOGIN ===
client.login(process.env.TOKEN);
