import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, Partials } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel],
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// 🪄 Registro de comandos
const commands = [
  { name: 'softtihabla', description: 'Habla con Softti 🦊💬' },
  { name: 'softtihug', description: 'Te da un abrazo suavecito 🤗' },
  { name: 'softtikiss', description: 'Te da un besito kawaii 💋' },
  { name: 'softtipat', description: 'Acaricia a Softti o a un amigo 🐾' },
  { name: 'softtipet', description: 'Recibe mimitos UwU' },
  { name: 'softtimymoney', description: 'Mira tus moneditas 💰' },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Comandos registrados.');
  } catch (err) {
    console.error('❌ Error:', err);
  }
})();

// 🎀 Memoria
const saludados = new Map();

client.once('ready', () => {
  console.log(`🌸 Softti Tales lista como ${client.user.tag}!`);
  client.user.setActivity('dando abracitos UwU 💕');
});

// 💬 Banco de frases variadas
const frases = [
  'OwO ¡Hola! ¿me llamaste? 💕',
  'Nyaa~ vine corriendo desde otro servidor 🦊',
  'UwU ¿cómo estás, pequeñín?',
  'Hehe~ me alegra verte otra vez 💫',
  'OwO ¡qué lindo verte aquí! 🫶',
  'Nyaa~ vine con galletitas 🍪',
  'UwU si me das mimos, ronroneo 💕',
  'OwO ¿tienes tiempo para hablar un poquito?',
  'UwU *te da una patita digital* 🐾',
  'Hehe~ hoy huele a energía bonita 💖',
  'OwO ¿quieres un abrazo gratis? 🤗',
  'UwU ¡no soy IA, soy ternura en código! 💕',
  'OwO ¡prometo no morder! bueno… solo un poquito 😳',
  'Nyaa~ ¡qué alegría verte activo otra vez! ✨',
  'UwU tu nick me hace sonreír 💫',
  'OwO ¡te estaba esperando! 💕',
  'UwU me gusta hablar contigo, nya~',
  'Hehe~ mi colita se mueve de emoción 🦊',
  'OwO *te mira con ojitos brillantes* 💖',
  'UwU ¡soy tu compañerita kawaii de servidor! 💞',
  // + agrega 130 más si quieres (pueden ser variaciones tiernas o divertidas)
];

// 💌 Cuando la mencionan
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.mentions.has(client.user)) return;

  const id = msg.author.id;
  const primeraVez = !saludados.has(id);
  const randomFrase = frases[Math.floor(Math.random() * frases.length)];

  if (primeraVez) {
    saludados.set(id, Date.now());
    await msg.reply(`OwO ¡hola ${msg.author.username}! 💖 ${randomFrase}`);
    try {
      await msg.author.send(
        `💞 ¡Hola ${msg.author.username}! Soy **Softti Tales**, tu zorrita kawaii~ 🦊\n\n✨ Puedes probar:\n/softtihabla\n/softtihug\n/softtikiss\n/softtipat\n/softtipet\n/softtimymoney\n\n🐾 ¡Diviértete conmigo, nya~!`
      );
    } catch (e) {
      console.log('No pude enviar DM 😅');
    }
  } else {
    const respuestas = [
      'Nyaa~ ¡ya nos conocemos! 🐾✨ ¿quieres hablar otra vez?',
      'OwO ¡otra vez tú! qué emoción 💕',
      'UwU jeje, pensé que te habías ido~ 💫',
      'Nyaa~ ¡me alegra verte de nuevo! 🦊'
    ];
    const frase = respuestas[Math.floor(Math.random() * respuestas.length)];
    await msg.reply(frase);
  }
});

// 🎯 Slash commands (habla aleatorio)
client.on('interactionCreate', async (i) => {
  if (!i.isChatInputCommand()) return;
  const frase = frases[Math.floor(Math.random() * frases.length)];
  await i.reply(`${i.user.username}, ${frase}`);
});

client.login(TOKEN);
