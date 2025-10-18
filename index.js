import 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { manejarComandoSecreto } from './admin.json' assert { type: 'json' };

// 🪄 Carga del cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// 📦 Variables de entorno
const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;

// 🧠 Memorias
const usuariosSaludados = new Set();
const advertencias = new Map();

// 📜 Cargar comandos
const comandos = JSON.parse(fs.readFileSync('./cmd.json', 'utf-8'));

// 🎮 Cargar estados
const estados = JSON.parse(fs.readFileSync('./estados.json', 'utf-8'));

// 🎲 Función para cambiar el estado aleatoriamente
function cambiarEstado() {
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(estado, { type: 0 });
}

// 🚀 Cuando el bot inicia
client.once('ready', () => {
  console.log(`✨ Softti Tales está lista como ${client.user.tag}!`);
  cambiarEstado();
  setInterval(cambiarEstado, 600000); // cambia cada 10 min
});

// 💌 Mensajes normales
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const ahora = Date.now();

  // ⚙️ Antispam
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

  // 🎯 Comandos con prefijo !softi
  if (message.content.startsWith('!softi')) {
    const [cmd, ...args] = message.content.slice('!softi'.length).trim().split(' ');
    const comando = cmd.toLowerCase();

    // 🔒 Comando secreto solo para el dueño en DM
    if (message.channel.type === 1 && message.author.id === OWNER_ID) {
      const resultado = await manejarComandoSecreto(comando, args, client);
      if (resultado) {
        await message.reply(resultado);
        return;
      }
    }

    // 🧩 Comandos normales
    let respuesta = '';

    switch (comando) {
      case 'hablar':
        respuesta = `Nyaa~ ${message.author.username}, ¿cómo estás hoy uwu? 💞`;
        break;
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

// 🚀 Login
client.login(TOKEN);
