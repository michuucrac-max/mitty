// index.js
const { Client, GatewayIntentBits, Partials, Events } = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, () => {
  console.log(`🌸 Bot activo como ${client.user.tag}`);
  client.user.setActivity("con mis amigos UwU 🐾");
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;

  const furryTalk = (text) =>
    text
      .replace(/r/g, "w")
      .replace(/l/g, "w")
      .replace(/R/g, "W")
      .replace(/L/g, "W");

  switch (commandName) {
    case "hablar":
      await interaction.reply(
        furryTalk(`Hewwo ${user.username}~ ¿cómo estás, nyan? ✨`)
      );
      break;

    case "hug":
      await interaction.reply({
        content: furryTalk(
          `*${user.username} te da un abracito suave y calientito~* 🤗💞`
        ),
        files: ["https://media.tenor.com/S6x1TQzvYxIAAAAC/hug-anime.gif"],
      });
      break;

    case "kiss":
      await interaction.reply({
        content: furryTalk(
          `>///< ${user.username} te da un besito tierno... 💋✨`
        ),
        files: ["https://media.tenor.com/mBttS4f9Q9oAAAAC/anime-kiss.gif"],
      });
      break;

    case "pat":
      await interaction.reply({
        content: furryTalk(
          `${user.username} te acaricia suavemente en la cabecita~ 🐾💗`
        ),
        files: ["https://media.tenor.com/5I6N8YvA4eUAAAAC/anime-pat.gif"],
      });
      break;

    case "pet":
      await interaction.reply({
        content: furryTalk(
          `*${user.username} te da mimitos suaves con sus patitas UwU* 🐶💞`
        ),
        files: ["https://media.tenor.com/MYH5W1HnQ2UAAAAC/pet-pat.gif"],
      });
      break;

    case "mymoney":
      const coins = Math.floor(Math.random() * 5000) + 100;
      await interaction.reply(
        furryTalk(
          `UwU ${user.username}, en tu bolsita peludita tienes ${coins} moneditas~ 💰✨`
        )
      );
      break;

    case "uwu":
      const frases = [
        "Nya~ me alegra verte por aquí 💖",
        "Hehe~ ¿me acaricias, pwease? 🥺",
        "OwO ¡Eres tan suavito/a~! 💕",
        "*te mueve la cola felizmente* 🐾",
      ];
      await interaction.reply(furryTalk(frases[Math.floor(Math.random() * frases.length)]));
      break;

    default:
      await interaction.reply(furryTalk("OwO comando desconocido, nya~ 😿"));
      break;
  }
});

// Cuando lo mencionan en el chat
client.on(Events.MessageCreate, (message) => {
  if (message.author.bot) return;
  if (message.mentions.has(client.user)) {
    const respuestas = [
      "Hewwo~ ¿me llamaste, cutie? 💞",
      "*mueve las orejitas y te mira curioso* 🐾",
      "OwO ¡aquí estoy! ¿necesitas abracito?",
      "Nyaa~ ¿quieres jugar conmigo? ✨",
    ];
    message.reply(respuestas[Math.floor(Math.random() * respuestas.length)]);
  }
});

client.login(process.env.TOKEN);
