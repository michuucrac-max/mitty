// 💞 Softti Tales — Furry & Kawaii Bot UwU 💞
// Compatible con IA + Slash Commands + Antispam + Canal de conversación

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes } from 'discord.js';
import OpenAI from 'openai';
import keepAlive from './server.js';
import fs from 'fs';

// 🐾 Inicialización del cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel]
});

// 🧠 Inicialización del cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 📦 Colección de comandos
client.commands = new Collection();

// 📁 Cargar comandos desde la carpeta ./comandos
const commandFiles = fs.readdirSync('./comandos').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = await import(`./comandos/${file}`);
  client.commands.set(command.data.name, command);
}

// 📋 Configurar comandos globales
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
try {
  const commandsData = client.commands.map(cmd => cmd.data.toJSON());
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsData });
  console.log('✅ Comandos registrados correctamente.');
} catch (error) {
  console.error('❌ Error al registrar comandos:', error);
}

// 🐱‍👤 Sistema antispam básico
const userMessageCount = new Map();
const SPAM_LIMIT = 6;
const TIME_WINDOW = 5000; // 5 segundos

function checkSpam(userId) {
  const now = Date.now();
  if (!userMessageCount.has(userId)) userMessageCount.set(userId, []);
  const timestamps = userMessageCount.get(userId).filter(t => now - t < TIME_WINDOW);
  timestamps.push(now);
  userMessageCount.set(userId, timestamps);
  return timestamps.length >= SPAM_LIMIT;
}

// 💬 Cuando el bot está online
client.once('ready', () => {
  console.log(`🐾 Softti Tales conectado como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: '✨ hablando con mis amiguit@s UwU ✨', type: 0 }],
    status: 'online'
  });
  keepAlive();
});

// 📜 Manejador de mensajes
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // 🚨 Antispam
  if (checkSpam(message.author.id)) {
    await message.delete().catch(() => {});
    message.author.send('⚠️ ¡Estás enviando mensajes muy rápido! Relájate un poquito, uwu 💞');
    return;
  }

  // 🎯 Canal de IA
  const chatChannel = message.guild.channels.cache.find(c => c.name === 'chat-bot');
  if (!chatChannel || message.channel.id !== chatChannel.id) return;

  // 🧠 IA furry/kawaii
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `
Eres Softti Tales, una bot furry/kawaii/uwu adorable, tierna y con energía positiva.
Hablas de manera dulce, amigable y divertida, usando muchos emojis, expresiones como "UwU", "nyaa~", "owo", "✨", "💞", etc.
Evita respuestas largas, sé natural, y responde con cariño.
`
        },
        { role: 'user', content: message.content }
      ],
      max_tokens: 150
    });

    const reply = completion.choices[0].message.content;
    if (reply) await message.reply(reply);
  } catch (error) {
    console.error('❌ Error IA:', error);
  }
});

// ⚙️ Manejador de comandos tipo "/"
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '⚠️ Ocurrió un error al ejecutar este comando, nyan~', ephemeral: true });
  }
});

// 🔑 Iniciar sesión
client.login(process.env.TOKEN);
