import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, REST, Routes, Collection } from 'discord.js';

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

// 🧩 Comandos registrados
const commands = [
  { name: 'hablar', description: 'Charla conmigo uwu 💬' },
  { name: 'hug', description: 'Te doy un abracito suave 🤗' },
  { name: 'kiss', description: 'Te doy un besito tierno 💋' },
  { name: 'pat', description: 'Acaricia a alguien o a mí 🐾' },
  { name: 'pet', description: 'Pide mimito uwu 🐱' },
  { name: 'mymoney', description: 'Revisa tus moneditas 💰' }
];

// Registrar comandos en Discord
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('🌸 Registrando comandos slash...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Comandos registrados correctamente.');
  } catch (err) {
    console.error('❌ Error al registrar comandos:', err);
  }
})();

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
    // Evita duplicados
    if (message.replied) return;

    // Respuesta aleatoria kawaii
    const respuestas = [
      'OwO ¡aquí estoy! ¿necesitas abracito nya~? 💕',
      'Nyaa~ ¿quieres jugar conmigo? ✨',
      '¡Hola nyan~! ¿me extrañaste? 🐾',
      'UwU~ vine corriendo a verte 💖'
    ];

    const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
    await message.reply(respuesta);

    // Enviar mensaje privado solo una vez por usuario
    if (!usuariosSaludados.has(userId)) {
      usuariosSaludados.add(userId);

      const dm = `OwO~ ¡Hola ${message.author.username}! 💕 Soy **Softti Tales**, tu compañerita peludita 🦊\n\n` +
      `Aquí tienes una listita de lo que puedo hacer:\n` +
      `────────────────────────────\n` +
      `💬 /hablar — charla conmigo uwu\n` +
      `🤗 /hug — da un abracito suave\n` +
      `💋 /kiss — un besito tierno\n` +
      `🐾 /pat — acaricia a alguien\n` +
      `🐱 /pet — pide mimito\n` +
      `💰 /mymoney — revisa tus moneditas\n` +
      `────────────────────────────`;

      try {
        await message.author.send(dm);
      } catch (error) {
        console.log('No se pudo enviar DM:', error.message);
      }
    }
  }
});

// 🎯 Interacciones de comandos slash
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;
  let respuesta = '';

  switch (commandName) {
    case 'hablar':
      respuesta = `Nyaa~ ${user.username}, ¿cómo estás hoy uwu? 💞`;
      break;
    case 'hug':
      respuesta = `OwO ${user.username} recibe un abracito suave y calientito 🤗💕`;
      break;
    case 'kiss':
      respuesta = `Mwah~ 💋 ${user.username}, un besito tierno para ti~`;
      break;
    case 'pat':
      respuesta = `🐾 ${user.username} acaricia suavemente a Softti Tales~`;
      break;
    case 'pet':
      respuesta = `UwU ${user.username} le da mimito a Softti y ella ronronea feliz 🐱💖`;
      break;
    case 'mymoney':
      respuesta = `💰 ${user.username}, tienes 999 moneditas mágicas nya~ ✨`;
      break;
    default:
      respuesta = `OwO no conozco ese comando, nyan~`;
  }

  await interaction.reply({ content: respuesta, ephemeral: false });
});

// 🚀 Login
client.login(TOKEN);
