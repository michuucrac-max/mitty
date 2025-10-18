const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// 🩷 Comandos kawai de Softti
const commands = [
  { name: "softtihabla", description: "Softti hablará contigo de forma adorable 💕" },
  { name: "softtihug", description: "Softti te da un abrazo peludito 🐾" },
  { name: "softtikiss", description: "Softti te da un besito suave UwU 😚" },
  { name: "softtipat", description: "Softti te da unas palmaditas tiernas 💞" },
  { name: "softtipet", description: "Softti se deja acariciar ronroneando feliz 🐱" },
  { name: "softtiuwu", description: "Softti dice algo kawai y tierno 💖" },
  { name: "softtifox", description: "Softti muestra su forma de zorrito 🦊" },
  { name: "softtising", description: "Softti canta una melodía suave 🎶" },
  { name: "softtidance", description: "Softti baila con alegría y energía 💃✨" },
  { name: "softtimymoney", description: "Muestra tu dinero kawai 💰" },
];

// 💫 Registrar comandos automáticamente
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("✨ Registrando comandos de Softti...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ ¡Comandos registrados con éxito!");
  } catch (error) {
    console.error("❌ Error al registrar comandos:", error);
  }
})();

// 💖 Frases kawai (gran vocabulario)
const frases = [
  "Nya~ ¿me estabas buscando? 💕",
  "UwU~ soy tan feliz de verte otra vez 💞",
  "Softti ronronea suavemente junto a ti 🐾",
  "¿Quieres un abrazo? tengo muchos guardados 🫶",
  "Kya~ qué lindo eres cuando sonríes 💗",
  "Me gusta cuando hablas conmigo, nya~ 😳",
  "Softti mueve su colita de felicidad 🦊",
  "Me encanta tu energía positiva 💫",
  "Eres mi humano favorito UwU 💕",
  "¡Vamos a hacer algo divertido juntos! 🎮",
  "Nyaa~ ¿quieres escucharme cantar? 🎶",
  "A veces solo quiero acurrucarme contigo 💤",
  "Softti mira el cielo y sonríe pensando en ti 🌙",
  "Aww, tus mensajes me hacen ronronear 😻",
  "UwU~ eres tan tierno como un mochi 💖",
  "Te daría una galleta si tuviera patitas libres 🍪",
  "¡Softti lista para otra aventura kawai! ✨",
  "Me haces sentir especial, nya~ 💞",
  "Te protegeré con mis patitas suaves 🐾",
  "Eres mi solcito, nunca cambies 🌸"
];

// 🎀 Cuando el bot se inicia
client.once("ready", () => {
  console.log(`🐾 Softti está online como ${client.user.tag}`);
});

// 💌 Interacciones con los comandos slash
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  const respuestas = {
    softtihabla: frases[Math.floor(Math.random() * frases.length)],
    softtihug: "Softti te abraza con sus patitas suaves 🐾",
    softtikiss: "Mua~ 💋 *te da un besito kawaii*",
    softtipat: "*te da unas suaves palmaditas en la cabeza 🐾*",
    softtipet: "Nyaa~ qué lindo eres cuando me acaricias 💞",
    softtiuwu: "UwU~ ¡soy la gatita más feliz del servidor! 💖",
    softtifox: "*Softti mueve su colita de zorrito con ternura* 🦊",
    softtising: "🎶 *Softti canta con ternura una canción kawaii~* 🎵",
    softtidance: "*Softti baila dando saltitos kawai~* 💃✨",
    softtimymoney: "Tu saldo kawai es de **69 monedas suaves UwU 💰**"
  };

  if (respuestas[commandName]) {
    await interaction.reply(respuestas[commandName]);
  }
});

// 🧠 Responder al nombre del bot (opcional)
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase().includes("softti")) {
    const random = frases[Math.floor(Math.random() * frases.length)];
    message.reply(random);
  }
});

client.login(TOKEN);
