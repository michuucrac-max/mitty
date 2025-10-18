import { Client, GatewayIntentBits, Partials, Collection, Events } from "discord.js";
import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

// 🌸 Base de datos temporal (por sesión)
const usersGreeted = new Set();

client.once(Events.ClientReady, () => {
  console.log(`🌸 Softti Tales está en línea como ${client.user.tag}!`);
  client.user.setPresence({
    activities: [{ name: "dando abracitos uwu 💞", type: 0 }],
    status: "online",
  });
});

// 💬 Cuando alguien menciona al bot
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // Si mencionan al bot
  if (message.mentions.has(client.user)) {
    // Solo la primera vez
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
      } catch (err) {
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
