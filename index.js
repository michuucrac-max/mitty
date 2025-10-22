// ============================
// 🌸 index.js — Softi-Tales Bot
// ============================

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import fs from 'fs';
import path from 'path';
import autoupdate from './autoupdate.js';
import { initAutoMod, checkMessage } from './automod.js';
import { handleGuildConfigMessage, showHelpPanel } from './softitales-config.js';
import estados from './estados.json' assert { type: "json" };
import cmdList from './cmd.json' assert { type: "json" };

// === CLIENTE DISCORD ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

let currentCmds = [];

// ============================
// 🔄 Autoupdate
// ============================
autoupdate(client);

// ============================
// 🌸 Inicialización
// ============================
client.once('ready', async () => {
  console.log(`🌸 Softi-Tales listo! Conectado como ${client.user.tag}`);

  initAutoMod();

  // Carga inicial de comandos
  reloadCommands();

  // Cambiar estados cada minuto
  setInterval(() => {
    const status = estados[Math.floor(Math.random() * estados.length)];
    client.user.setPresence({ activities: [{ name: status, type: 3 }], status: 'online' });
  }, 60 * 1000);
});

// ============================
// 🔁 Recargar comandos
// ============================
function reloadCommands() {
  try {
    const filePath = path.resolve('./cmd.json');
    delete require.cache[filePath];
    const newCmds = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    currentCmds = Array.isArray(newCmds) ? newCmds : [];
    console.log(`✨ Comandos cargados (${currentCmds.length}): ${currentCmds.map(c => c.name).join(', ')}`);
  } catch (err) {
    console.error('❌ Error cargando cmd.json:', err);
    currentCmds = [];
  }
}

// ============================
// 💬 Evento de mensajes
// ============================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const guildId = message.guild?.id;

  // --- AutoMod ---
  const blocked = await checkMessage(message);
  if (blocked) return;

  // --- Comandos Owner /softi* ---
  if (content.startsWith('/softi')) {
    const isOwner = message.author.id === process.env.OWNER_ID;
    if (isOwner) {
      const handled = await handleGuildConfigMessage(guildId, message);
      if (handled) return;

      if (content.startsWith('/softihelp')) {
        await showHelpPanel(message);
        return;
      }
    }
  }

  // --- Comandos dinámicos de cmd.json ---
  const args = content.split(' ');
  const cmdName = args[0].replace('/', '').toLowerCase();

  const safeCmds = Array.isArray(currentCmds) ? currentCmds : [];
  const cmd = safeCmds.find(c => c.name.toLowerCase() === cmdName);
  if (cmd) {
    const response = (cmd.response || '')
      .replace('{user}', message.author.username)
      .replace('{target}', args[1] || 'alguien');
    message.reply(response);
    return;
  }

  // --- IA kawaii/furry/uwu ---
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
});

// ============================
// 🔑 Login
// ============================
client.login(process.env.TOKEN);
