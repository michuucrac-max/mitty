import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

// 💖 Configurar rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🪄 Cliente de Discord
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
const OWNER_ID = process.env.OWNER_ID;

// 🧩 Archivos base
const cmdPath = path.join(__dirname, 'cmd.json');
let commands = [];
if (fs.existsSync(cmdPath)) {
  commands = JSON.parse(fs.readFileSync(cmdPath, 'utf-8'));
}

const estadosPath = path.join(__dirname, 'estados.json');
const estados = JSON.parse(fs.readFileSync(estadosPath, 'utf-8'));

// 🧠 Memorias
const advertencias = new Map();

// 🌸 Cambiar estado cada 10 min
function cambiarEstado() {
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(estado, { type: 0 });
}

// ✅ Al iniciar
client.once('ready', () => {
  console.log(`🌸 Softti Tales lista como ${client.user.tag}`);
  cambiarEstado();
  setInterval(cambiarEstado, 600000);
});

// 🧸 Sistema IA furry uwu
function generarRespuestaFurry(mensajeUsuario) {
  const lower = mensajeUsuario.toLowerCase();

  // 💬 Detección básica de tono o tema
  if (lower.includes('hola') || lower.includes('ola')) {
    return 'Nyaa~ ¡Hola hola! 🌸 ¿Cómo estás hoy, miau? UwU';
  }
  if (lower.includes('bien')) {
    return 'OwO me alegra saberlo~ ¡Eso me hace ronronear de felicidad 🐾💞!';
  }
  if (lower.includes('mal') || lower.includes('triste')) {
    return 'Awww... ven, te doy un abracito suavecito~ 🤗💕 todo estará bien, nya~';
  }
  if (lower.includes('gracias')) {
    return 'Nya~ de nada 💖 siempre estaré aquí para ti, uwu~';
  }
  if (lower.includes('te amo') || lower.includes('love')) {
    return 'Kyaaa~ 💞 ¡Yo también te quiero mucho, nya~! *se sonroja y mueve la colita* 🐾';
  }
  if (lower.includes('?')) {
    return 'Hmm~ no estoy segura nya~ pero creo que... ¡sí! owo ¿tú qué piensas? 💭';
  }

  // 🧠 Respuestas aleatorias estilo ChatGPT-uwu
  const respuestas = [
    'Nya~ eso suena super lindo 💖, cuéntame más~',
    'OwO ¿en serio? ¡Eso es tan sugoi! 🌸',
    'UwU *se acurruca contigo mientras escucha* sigue contándome más, nya~',
    'Hmm~ interesante... *ladea las orejitas* cuéntame más sobre eso 🐾',
    'Aww eso suena adorable~ 💕 me haces feliz, nya~',
    'Mmm… no lo sé, pero tu energía se siente kawaii ✨',
    'OwO *ronronea* me gusta hablar contigo, sigue así nya~',
    'UwU te entiendo perfectamente 💫 a veces yo también me siento así~'
  ];

  return respuestas[Math.floor(Math.random() * respuestas.length)];
}

// 💌 Sistema antispam + IA
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const ahora = Date.now();

  // 🚫 Antispam
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

  // 💬 Si es DM o mencionan al bot → IA
  if (message.channel.type === 1 || message.mentions.has(client.user)) {
    const respuesta = generarRespuestaFurry(message.content);
    await message.reply(respuesta);
    return;
  }

  // 🎯 Comandos con prefijo
  if (message.content.startsWith('!softi')) {
    const [cmd, ...args] = message.content.slice('!softi'.length).trim().split(' ');
    const comando = cmd.toLowerCase();

    let respuesta = '';

    switch (comando) {
      case 'hug':
        respuesta = `OwO ${message.author.username}, ven~ te doy un abracito suave 🤗💕`;
        break;
      case 'kiss':
        respuesta = `Mwah~ 💋 ${message.author.username}, un besito tierno solo para ti~`;
        break;
      case 'pat':
        respuesta = `🐾 ${message.author.username} acaricia suavemente a Softti Tales~`;
        break;
      case 'pet':
        respuesta = `UwU ${message.author.username} le da mimito a Softti y ella ronronea feliz 🐱💖`;
        break;
      case 'mymoney':
        respuesta = `💰 ${message.author.username}, tienes 999 moneditas mágicas nya~ ✨`;
        break;
      default:
        respuesta = `OwO no entiendo ese comando, nyan~`;
    }

    await message.reply(respuesta);
  }
});

// 🚀 Iniciar bot
client.login(TOKEN);
