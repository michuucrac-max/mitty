import { Client, GatewayIntentBits, Partials, Collection, Events } from "discord.js";
import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

const usersGreeted = new Set();
const userMessageHistory = new Map(); // 🧠 Guarda los mensajes recientes
const userWarnings = new Map(); // 🚨 Guarda advertencias

client.once(Events.ClientReady, () => {
  console.log(`🌸 Softti Tales está en línea como ${client.user.tag}!`);
  client.user.setPresence({
    activities: [{ name: "protegiendo con amor 💞", type: 0 }],
    status: "online",
  });
});

// 💬 Cuando alguien menciona al bot
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // 🧡 SISTEMA ANTISPAM
  const now = Date.now();
  const userId = message.author.id;

  // Guardar historial
  if (!userMessageHistory.has(userId)) userMessageHistory.set(userId, []);
  const timestamps = userMessageHistory.get(userId);

  timestamps.push(now);
  // Solo contar los mensajes de los últimos 10 segundos
  const recentMessages = timestamps.filter((t) => now - t < 10000);
  userMessageHistory.set(userId, recentMessages);

  // Si envía 6 o más mensajes en 10 segundos → advertencia
  if (recentMessages.length >= 6) {
    const warnings = userWarnings.get(userId) || 0;
    userWarnings.set(userId, warnings + 1);

    if (warnings + 1 === 1) {
      message.reply("⚠️ OwO~ ¡tranquilo nya! estás enviando muchos mensajitos seguidos 💬, no quiero tener que regañarte 🥺");
    } else if (warnings + 1 === 2) {
      message.reply("⚠️ Segunda advertencia, nya~ 🐾 si sigues tan rápido tendré que darte un descansito 💔");
    } else if (warnings + 1 >= 3) {
      try {
        const member = await message.guild.members.fetch(userId);
        await member.timeout(60 * 60 * 1000, "Spam detectado"); // 1 hora
        message.channel.send(`🚫 Nya~ ${message.author.username} fue puesto en descanso de 1 hora por enviar spam 😿`);
        userWarnings.delete(userId);
        userMessageHistory.delete(userId);
      } catch (err) {
        console.error("Error aplicando timeout:", err);
      }
    }
  }

  // 💌 MENSAJE PRIVADO la primera vez que mencionan al bot
  if (message.mentions.has(client.user)) {
    if (!usersGreeted.has(message.author.id)) {
      usersGreeted.add(message.author.id);
      try {
        await message.author.send(
          `OwO~ ¡Hola ${message.author.username}! 💕 Soy **Softti Tales**, tu compañerita peludita 🐾✨\n\n` +
          `Aquí tienes una listita de lo que puedo hacer:\n` +
          `──────────────────────────────\n` +
          `💬 **/hablar** — charla conmigo uwu\n` +
          `🤗 **/hug** — da un abracito suave\n` +
          `💋 **/kiss** — un besito tierno\n` +
          `🐾 **/pat** — acaricia a alguien\n` +
          `🐱 **/pet** — pide mimitos\n` +
          `💸 **/mymoney** — revisa tus moneditas\n` +
          `🌸 **/uwu** — reacción adorable\n\n` +
          `Nyaa~ ¡gracias por invitarme a tu servidor! 💖`
        );
      } catch {
        console.log("No pude enviarle DM al usuario 🥺");
      }
      await message.reply("OwO ¡aquí estoy! ¿necesitas abracito nya~? 💞");
    } else {
      await message.reply("Nyaa~ ¡ya nos conocemos! 🐾✨ ¿quieres hablar otra vez?");
    }
  }
});

// 🌸 Interacciones con comandos (Slash)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  const responses = {
    hablar: `OwO~ ¡aquí estoy ${interaction.user.username}! ¿Qué quieres contarme nya~? 💬`,
    hug: `Nyaa~ ${interaction.user.username} da un abracito suave 💞`,
    kiss: `UwU ${interaction.user.username} da un besito tierno 💋`,
    pat: `Awww~ ${interaction.user.username} acaricia suavemente 🐾`,
    pet: `Miau~ ${interaction.user.username} pide mimitos uwu 🐱`,
    mymoney: `💸 ${interaction.user.username}, tu balance actual es: **100 moneditas de amor** ✨`,
    uwu: `OwO~ *abraza la ternura del momento* 💖`,
  };

  if (responses[commandName]) {
    await interaction.reply(responses[commandName]);
  } else {
    await interaction.reply("Nya~ comando desconocido... ¿quizá te confundiste uwu?");
  }
});

client.login(process.env.TOKEN);
