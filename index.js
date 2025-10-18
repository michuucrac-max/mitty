import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder
} from 'discord.js';

// 🔧 Configurar rutas seguras (funciona en Render y local)
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
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;

// 🧩 Cargar archivos JSON (con control de errores)
function cargarJSON(nombre) {
  try {
    const ruta = path.join(__dirname, nombre);
    return JSON.parse(fs.readFileSync(ruta, 'utf-8'));
  } catch (err) {
    console.warn(`⚠️ No se pudo cargar ${nombre}:`, err.message);
    return [];
  }
}

const commands = cargarJSON('cmd.json');
const estados = cargarJSON('estados.json');
const adminData = cargarJSON('admin.json');

// 🧠 Memorias
const usuariosSaludados = new Set();
const advertencias = new Map();

// 🎮 Estados aleatorios
function cambiarEstado() {
  if (estados.length === 0) return;
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(estado, { type: 0 });
}

// 🟢 Al iniciar
client.once('ready', () => {
  console.log(`✨ Softti Tales está lista como ${client.user.tag}!`);
  cambiarEstado();
  setInterval(cambiarEstado, 600000);
});

// 💌 Mensajes
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const ahora = Date.now();

  // 🛡️ Antispam
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

  const contenido = message.content.toLowerCase();

  // 🧩 Buscar comandos desde cmd.json
  const cmd = commands.find(c => contenido.startsWith(c.name?.toLowerCase()));
  if (cmd) {
    try {
      if (cmd.image) {
        const embed = new EmbedBuilder()
          .setColor("Random")
          .setTitle(cmd.title || "✨ Softti dice:")
          .setDescription(cmd.response)
          .setImage(cmd.image);
        return await message.reply({ embeds: [embed] });
      } else {
        return await message.reply(cmd.response);
      }
    } catch (err) {
      console.error("❌ Error al ejecutar comando desde cmd.json:", err.message);
    }
  }

  // 💬 Si mencionan a Softti o escriben en DM
  if (message.mentions.has(client.user) || message.channel.type === 1) {
    let respuesta = "¡Hola, soy Softti 🌸! ¿Cómo estás?";

    if (contenido.includes("hola")) respuesta = "Nya~ ¡Hola! 💕 ¿Todo bien?";
    else if (contenido.includes("quién eres")) respuesta = "Soy Softti Tales, tu bot adorable y protectora del servidor 🐾";
    else if (contenido.includes("gracias")) respuesta = "¡De nada, nyan~! 💖";
    else if (contenido.includes("te amo")) respuesta = "Aww~ yo también te quiero mucho 💞";
    else if (contenido.includes("triste")) respuesta = "Aww~ no estés triste, nya 🥺 ven que te abrazo 🤗";
    else if (contenido.includes("imagen")) respuesta = "Puedes usar mis comandos de imagen en `cmd.json`, uwu 🖼️";
    else if (contenido.includes("ayuda")) respuesta = "Puedes probar `!softi hablar`, `!softi hug`, o alguno de los comandos del archivo cmd.json 💬";

    return message.reply(respuesta);
  }

  // 🎯 Comandos con prefijo !softi
  if (message.content.startsWith('!softi')) {
    const [cmd, ...args] = message.content.slice('!softi'.length).trim().split(' ');
    const comando = cmd.toLowerCase();
    let respuesta = '';

    // 💠 Comandos secretos solo para el dueño
    if (message.channel.type === 1 && message.author.id === OWNER_ID) {
      if (comando === 'giveadmin' || comando === 'removeadmin') {
        const [guildId, userId, inviteLink] = args;
        if (!guildId || !userId || !inviteLink)
          return message.reply('⚠️ Debes ingresar: ID del servidor, ID del usuario y enlace de invitación.');

        try {
          const guild = await client.guilds.fetch(guildId);
          const member = await guild.members.fetch(userId);
          const role = guild.roles.cache.find(r => r.name.toLowerCase().includes('admin'));
          if (!role)
            return message.reply('❌ No encontré un rol de administrador en ese servidor.');

          if (comando === 'giveadmin') {
            await member.roles.add(role);
            return message.reply(`✅ Se le ha dado admin a <@${userId}> en **${guild.name}**.\n🔗 Invitación: ${inviteLink}`);
          } else {
            await member.roles.remove(role);
            return message.reply(`✅ Se ha quitado el admin a <@${userId}> en **${guild.name}**.\n🔗 Invitación: ${inviteLink}`);
          }
        } catch (err) {
          return message.reply('❌ Error al ejecutar el comando secreto: ' + err.message);
        }
      }
    }

    // 🧩 Comandos básicos (manteniendo tu estilo original)
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
client.login(TOKEN).catch(err => {
  console.error('❌ Error al iniciar sesión:', err.message);
});
