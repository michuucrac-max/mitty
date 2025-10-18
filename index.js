import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 📚 Cargar vocabulario y frases detectadas
const vocabulario = JSON.parse(fs.readFileSync(path.join(__dirname, 'vocabulario.json'), 'utf-8'));
const frasesDetectadas = JSON.parse(fs.readFileSync(path.join(__dirname, 'frases_detectadas.json'), 'utf-8'));

// 💬 Estados aleatorios
const estados = ["Jugando bailando con nyas~", "Ronroneando feliz UwU", "Cuidando a mis amigos 🦊", "Pensando en ti 💕"];

function cambiarEstado() {
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(estado, { type: 0 });
}

// 🚫 Antispam
const advertencias = new Map();

client.once('ready', () => {
  console.log(`✨ Softti Tales activa como ${client.user.tag}!`);
  cambiarEstado();
  setInterval(cambiarEstado, 600000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const ahora = Date.now();
  const id = message.author.id;

  // Antispam
  if (!advertencias.has(id)) advertencias.set(id, { msgs: [ahora], strikes: 0 });
  else {
    const d = advertencias.get(id);
    d.msgs = d.msgs.filter(ts => ahora - ts < 5000);
    d.msgs.push(ahora);
    if (d.msgs.length > 5) {
      d.strikes++;
      if (d.strikes >= 3) {
        await message.reply("⚠️ ¡Nya! Estás escribiendo muy rápido, relájate un poquito 💫");
        d.strikes = 0;
      }
    }
    advertencias.set(id, d);
  }

  const contenido = message.content.toLowerCase();

  // 🔎 Si menciona a Softti o contiene frases detectadas
  const detectado = frasesDetectadas.some(f => contenido.includes(f));

  if (message.mentions.has(client.user) || detectado) {
    const respuesta = vocabulario[Math.floor(Math.random() * vocabulario.length)];
    await message.reply(respuesta);
    return;
  }

  // 🎮 Comando simple
  if (contenido.startsWith('!softti')) {
    const [cmd] = contenido.split(' ').slice(1);
    if (cmd === 'hug') return message.reply("*te da un abrazo peludito, uwu* 💖");
    if (cmd === 'dance') return message.reply("*Softti empieza a bailar kawaii~ 💃✨*");
    return message.reply("Nya~ ¿qué comando es ese? 😳");
  }
});

client.login(TOKEN);
