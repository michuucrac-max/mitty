import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, REST, Routes, Collection } from 'discord.js';
import fs from 'fs';

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
const CLIENT_ID = process.env.CLIENT_ID;
client.commands = new Collection();

// 🧩 Cargar comandos desde cmd.json
const commands = JSON.parse(fs.readFileSync('./cmd.json', 'utf-8'));
commands.forEach(cmd => client.commands.set(cmd.name, cmd));

// Registrar comandos en Discord
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('🌸 Registrando comandos slash...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands.map(c => ({ name: c.name, description: c.description })) });
    console.log('✅ Comandos registrados correctamente.');
  } catch (err) {
    console.error('❌ Error al registrar comandos:', err);
  }
});

// 🧠 Memorias
const usuariosSaludados = new Set();
const advertencias = new Map();

// 🟢 Al iniciar
client.once('ready', () => {
  console.log(`✨ Softti Tales está lista como ${client.user.tag}!`);
  client.user.setActivity('protegiendo servidores kawaii~ 💕', { type: 0 });
});

// 💌 Mensaje cuando mencionan al bot
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Antispam
  const userId = message.author.id;
  const ahora = Date.now();

  if (!advertencias.has(userId)) {
    advertencias.set(userId, { mensajes: [ahora], strikes: 0 });
  } else {
    const data = advertencias.get(userId);
    data.mensajes = data.mensajes.filter(ts => ahora - ts < 5000);
    data.mensajes.push(ahora);

    if (data.mensajes.length > 5) {
      data.strikes++;
      if (data.strikes === 3) {
        try {
          await message.member.timeout(60 * 60 * 1000, 'Spam detectado');
          await message.reply('⚠️ ¡Te pasaste, nya! Te ganaste un descansito de 1 hora 💫');
        } catch {
          await message.reply('Nya~ no puedo castigarte, pero ¡no hagas spam, porfis! 🥺');
        }
        data.strikes = 0;
      } else {
        await message.reply(`¡OwO cuidado! Llevas ${data.strikes} advertencias, nyan~ 🐾`);
      }
    }
    advertencias.set(userId, data);
  }

  // Si mencionan a Softti
  if (message.mentions.has(client.user)) {
    if (message.replied) return;

    // Extrae comando de mensaje
    const texto = message.content.replace(/<@!?(\d+)>/g, '').trim().toLowerCase();
    const cmd = client.commands.get(texto);

    if (cmd) {
      const respuestas = usuariosSaludados.has(userId) ? cmd.knownResponses : cmd.responses;
      const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
      await message.reply(respuesta);

      // Enviar DM solo una vez
      if (!usuariosSaludados.has(userId)) {
        usuariosSaludados.add(userId);
        const dm = `OwO~ ¡Hola ${message.author.username}! 💕 Soy **Softti Tales**, tu compañerita peludita 🦊\n\n` +
        `Aquí tienes una listita de lo que puedo hacer:\n────────────────────────────\n` +
        commands.map(c => `${c.name} — ${c.description}`).join('\n') +
        `\n────────────────────────────`;
        try { await message.author.send(dm); } catch {}
      }
    } else {
      await message.reply('OwO no entiendo ese comando, nyan~ 😿');
    }
  }
});

// 🎯 Interacciones de comandos slash
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;
  const cmd = client.commands.get(commandName);

  if (cmd) {
    const respuestas = usuariosSaludados.has(user.id) ? cmd.knownResponses : cmd.responses;
    const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
    await interaction.reply({ content: respuesta, ephemeral: false });

    if (!usuariosSaludados.has(user.id)) usuariosSaludados.add(user.id);
  } else {
    await interaction.reply({ content: 'OwO no conozco ese comando, nyan~', ephemeral: true });
  }
});

// 🚀 Login
client.login(TOKEN);
