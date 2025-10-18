import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';

// 🔧 Configurar rutas seguras (funciona tanto en Render como local)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🪄 Cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// ⚙️ Variables del entorno
const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;

// 📁 Archivos locales (en la misma carpeta)
const cmdPath = path.join(__dirname, 'cmd.json');
const vocabPath = path.join(__dirname, 'vocabulario.json');
const detectarPath = path.join(__dirname, 'detectar.json');
const securityPath = path.join(__dirname, 'security_manager.json');
const statusPath = path.join(__dirname, 'status_manager.json');

// 📦 Leer archivos JSON
const comandos = JSON.parse(fs.readFileSync(cmdPath, 'utf-8'));
const vocabulario = JSON.parse(fs.readFileSync(vocabPath, 'utf-8'));
const detectar = JSON.parse(fs.readFileSync(detectarPath, 'utf-8'));
const seguridad = JSON.parse(fs.readFileSync(securityPath, 'utf-8'));
const estados = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));

// 🧠 Memorias y antispam
const usuariosSaludados = new Set();
const advertencias = new Map();

// 🎮 Función: cambiar estado automáticamente
function cambiarEstado() {
  const estado = estados.estados[Math.floor(Math.random() * estados.estados.length)];
  client.user.setActivity(estado.mensaje, { type: ActivityType[estado.tipo] });
  console.log(`🌀 Estado cambiado a: ${estado.tipo} → ${estado.mensaje}`);
}

// 🔹 Iniciar bot
client.once('ready', () => {
  console.log(`✨ Softti Tales está lista como ${client.user.tag}!`);
  cambiarEstado();
  setInterval(cambiarEstado, estados.intervaloMinutos * 60 * 1000);
});

// 💌 Detectar mensajes
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const contenido = message.content.toLowerCase();

  // 🚫 Seguridad: palabras bloqueadas
  for (const palabra of seguridad.palabrasBloqueadas) {
    if (contenido.includes(palabra)) {
      await message.delete().catch(() => {});
      return message.channel.send(`⚠️ ${message.author}, esa palabra está prohibida, nya~ 🐾`);
    }
  }

  // 🚫 Bloquear links externos
  if (seguridad.bloquearLinks && /(https?:\/\/[^\s]+)/.test(contenido)) {
    await message.delete().catch(() => {});
    return message.channel.send(`❌ ${message.author}, no puedes enviar enlaces externos uwu 🔒`);
  }

  // 🚫 Antispam automático
  const userId = message.author.id;
  const ahora = Date.now();
  if (!advertencias.has(userId)) {
    advertencias.set(userId, { mensajes: [ahora], strikes: 0 });
  } else {
    const data = advertencias.get(userId);
    data.mensajes = data.mensajes.filter(ts => ahora - ts < 5000);
    data.mensajes.push(ahora);
    if (data.mensajes.length > 6) {
      data.strikes++;
      if (data.strikes >= 3) {
        try {
          await message.member.timeout(60 * 60 * 1000, 'Spam detectado');
          await message.reply('⚠️ ¡Spameas mucho, nya! Te ganaste un descansito de 1 hora 💫');
        } catch {
          await message.reply('Nya~ no puedo castigarte, pero porfis no hagas spam 🥺');
        }
        data.strikes = 0;
      } else {
        await message.reply(`OwO cuidado ${message.author.username}, llevas ${data.strikes} advertencias 🐾`);
      }
    }
    advertencias.set(userId, data);
  }

  // 💬 Si mencionan al bot, responder estilo ChatGPT kawaii
  if (message.mentions.has(client.user)) {
    const respuesta = vocabulario[Math.floor(Math.random() * vocabulario.length)];
    return message.reply(respuesta);
  }

  // 🔠 Comandos desde cmd.json
  if (message.content.startsWith('!softi')) {
    const [cmd, ...args] = message.content.slice('!softi'.length).trim().split(' ');
    const comando = cmd.toLowerCase();
    const found = comandos[comando];
    if (found) {
      return message.reply(found);
    } else {
      return message.reply('OwO no entiendo ese comando, nya~ 💭');
    }
  }
});

// 🚀 Iniciar sesión
client.login(TOKEN);
