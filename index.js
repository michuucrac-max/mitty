import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';

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

// 🔹 Cargar comandos normales
const commands = JSON.parse(fs.readFileSync('./cmd.json', 'utf-8'));
client.commands = new Collection();
commands.forEach(cmd => client.commands.set(cmd.name.toLowerCase(), cmd));

// 🔹 Cargar estados
const estados = JSON.parse(fs.readFileSync('./estados.json', 'utf-8'));
function cambiarEstado() {
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(estado, { type: 0 });
}

// 🔹 Cargar comandos secretos
const secretCommands = new Map();
const secretPath = path.join('./secret-commands');
fs.readdirSync(secretPath).forEach(file => {
  if (file.endsWith('.js')) {
    import(`./secret-commands/${file}`).then(mod => {
      secretCommands.set(mod.default.name.toLowerCase(), mod.default);
    });
  }
});

// 🧠 Memorias
const usuariosSaludados = new Set();
const advertencias = new Map();

// 🟢 Al iniciar
client.once('ready', () => {
  console.log(`✨ Softti Tales está lista como ${client.user.tag}!`);
  cambiarEstado();
  setInterval(cambiarEstado, 600000); // Cambia cada 10 minutos
});

// 💌 Manejar mensajes
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const userId = message.author.id;
  const ahora = Date.now();

  // 🛡 Antispam solo en servidores
  if (message.guild) {
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
  }

  // 🔑 Comandos secretos (solo dueño en DM)
  if (!message.guild && message.author.id === process.env.OWNER_ID) {
    const args = message.content.trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    if (secretCommands.has(commandName)) {
      const command = secretCommands.get(commandName);
      command.execute(client, message, args);
      return;
    }
  }

  // ⚡ Comandos normales !softi
  if (message.content.toLowerCase().startsWith('!softi')) {
    const args = message.content.slice('!softi'.length).trim().toLowerCase();
    const cmd = client.commands.get(args);
    if (cmd) {
      const respuestas = usuariosSaludados.has(userId) ? cmd.knownResponses : cmd.responses;
      const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
      await message.reply(respuesta);
      if (!usuariosSaludados.has(userId)) usuariosSaludados.add(userId);
    } else {
      await message.reply('OwO no conozco ese comando, nyan~ 😿');
    }
    return;
  }

  // 💖 Mensajes normales (saludos si mencionan al bot)
  if (message.mentions.has(client.user)) {
    if (message.replied) return;
    const respuestas = [
      'OwO ¡aquí estoy! ¿necesitas abracito nya~? 💕',
      'Nyaa~ ¿quieres jugar conmigo? ✨',
      '¡Hola nyan~! ¿me extrañaste? 🐾',
      'UwU~ vine corriendo a verte 💖'
    ];
    const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
    await message.reply(respuesta);

    if (!usuariosSaludados.has(userId)) {
      usuariosSaludados.add(userId);
      const dm = `OwO~ ¡Hola ${message.author.username}! 💕 Soy **Softti Tales**, tu compañerita peludita 🦊\n\n` +
        `Aquí tienes una listita de lo que puedo hacer:\n────────────────────────────\n` +
        commands.map(c => `${c.name} — ${c.description}`).join('\n') +
        `\n────────────────────────────`;
      try { await message.author.send(dm); } catch {}
    }
  }
});

// 🚀 Login
client.login(TOKEN);
