// index.js — Softi-Tales Bot Completo v1.4.0
import fs from 'fs';
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';
import { config as env } from 'dotenv';
import OpenAI from 'openai';
import { handleGuildConfigMessage, showHelpPanel } from './softitales-config.js';
import { checkMessage, initAutoMod } from './automod.js';

env(); // carga variables de entorno

// ==== ARCHIVOS ====
const CMD_FILE = './cmd.json';
const GUILD_CMD_FILE = './guildcommands.json';
const CONV_FILE = './conversaciones.json';

// ==== CARGA DE ARCHIVOS JSON ====
function loadOrCreate(file, defaultData = {}) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

let globalCommands = loadOrCreate(CMD_FILE, {});
let guildCommands = loadOrCreate(GUILD_CMD_FILE, {});
let conversaciones = loadOrCreate(CONV_FILE, {});

// ==== OPENAI ====
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_TOKEN });

// ==== CLIENTE DISCORD ====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

let miniAntiError = new Set();

// ==== UTILIDADES ====
function log(...args) { console.log('[Softi-Tales]', ...args); }
function format(template, message) {
  const mention = message.author?.toString?.() || message.author?.username || 'usuario';
  return template.replace(/\{usuario\}/g, mention);
}

// ==== INICIO ====
client.once('ready', () => {
  log('🌸 Softi-Tales está activa kawaii! 💖');
  log('💡 Cargando AutoMod...');
  initAutoMod();
  log('✅ AutoMod activado');
  log('💡 Cargando comandos globales y por servidor...');
  log(`🌟 Comandos globales: ${Object.keys(globalCommands).length}`);
  log(`🌟 Comandos por servidor cargados: ${Object.keys(guildCommands).length}`);
  client.user.setPresence({ activities: [{ name: '¡Hola~ UwU 🐾' }], status: 'online' });
});

// ==== MESSAGE HANDLER ====
client.on('messageCreate', async message => {
  try {
    if (message.author.bot) return;

    // --- AutoMod ---
    const blocked = await checkMessage(message);
    if (blocked) return;

    // --- Config panel commands (solo owner) ---
    const guildId = message.guild?.id;
    const isOwner = message.member?.roles?.cache?.some(r => r.name === 'Owner');
    if (message.content.startsWith('/') && isOwner) {
      const handled = await handleGuildConfigMessage(guildId, message);
      if (handled) return;
    }

    // --- Help panel ---
    if (message.content === '/softihelp' && isOwner) {
      await showHelpPanel(message);
      return;
    }

    // --- Detecta comandos globales ---
    const cmdName = message.content.slice(1).split(' ')[0];
    if (message.content.startsWith('/') && globalCommands[cmdName]) {
      await message.reply(globalCommands[cmdName]);
      log('✨ Comando global ejecutado:', cmdName, 'por', message.author.tag);
      return;
    }

    // --- Detecta comandos de guild ---
    if (guildId && message.content.startsWith('/') && guildCommands[guildId]?.[cmdName]) {
      await message.reply(guildCommands[guildId][cmdName]);
      log('✨ Comando por servidor ejecutado:', cmdName, 'en', message.guild.name);
      return;
    }

    // --- Detecta mención a la IA o DM ---
    const mentioned = message.mentions.has(client.user) || message.channel.type === 1;
    if (!mentioned) return;

    // --- Manejo de IA kawaii/furry/uwu ---
    await handleIA(message);

  } catch (err) {
    if (!miniAntiError.has(err.message)) {
      console.error('❌ Error inesperado:', err);
      miniAntiError.add(err.message);
      setTimeout(() => miniAntiError.delete(err.message), 60000); // evita spam de error
    }
  }
});

// ==== FUNCION IA ====
async function handleIA(message) {
  try {
    const userId = message.author.id;
    conversaciones[userId] = conversaciones[userId] || [];

    // Guardar mensaje de usuario
    if (message.content) {
      if (conversaciones[userId].length > 20) conversaciones[userId].shift();
      conversaciones[userId].push({ role: 'user', content: message.content });
    }

    // --- Imagen enviada ---
    if (message.attachments.size > 0) {
      const urls = message.attachments.map(a => a.url);
      const embed = new EmbedBuilder()
        .setTitle('🖌️ Softi vio tu imagen kawaii!')
        .setDescription(`¡UwU! Qué cosita tan linda, ${message.author.username}~ 😳💖`)
        .setColor(0xffb6c1)
        .setImage(urls[0])
        .setFooter({ text: `Enviado por ${message.author.username}` });
      await message.reply({ embeds: [embed] });
      log('🖼️ Imagen recibida de', message.author.tag, message.guild ? `en servidor: ${message.guild.name}` : 'DM');
      return;
    }

    // --- Comando generar imagen ---
    if (message.content.startsWith('/image ')) {
      const prompt = message.content.slice(7).trim();
      if (!prompt) return message.reply('⚠️ Debes darme un prompt kawaii 😳');

      const imgResp = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: `Kawaii/furry/uwu style: ${prompt}`,
        size: '1024x1024'
      });

      const url = imgResp.data[0].url;
      const embed = new EmbedBuilder()
        .setTitle('🖌️ Softi generó tu imagen kawaii!')
        .setImage(url)
        .setColor(0xffb6c1)
        .setFooter({ text: `Generado para ${message.author.username}` });

      await message.reply({ embeds: [embed] });
      log('🖼️ Imagen generada para', message.author.tag);
      return;
    }

    // --- Preparar prompt para chat ---
    conversaciones[userId].push({
      role: 'system',
      content: 'Eres Softi-Tales, chica kawaii/furry/uwu, un poco infantil pero inteligente, responde con ternura y emojis.'
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-5-pro',
      messages: conversaciones[userId],
      temperature: 0.85,
      max_tokens: 500
    });

    const reply = response.choices[0].message.content;
    await message.reply(reply);
    log('🤖 IA respondió a', message.author.tag, message.guild ? `en servidor: ${message.guild.name}` : 'DM');

    // Guardar respuesta en conversaciones
    conversaciones[userId].push({ role: 'assistant', content: reply });
    fs.writeFileSync(CONV_FILE, JSON.stringify(conversaciones, null, 2));

  } catch (err) {
    log('❌ Error en IA Kwai:', err.message);
    try { await message.reply('⚠️ Oops, algo salió mal con mi cerebro kawaii 😿'); } catch {}
  }
}

// ==== LOGIN ====
client.login(process.env.TOKEN);
