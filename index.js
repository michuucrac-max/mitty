const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  PermissionFlagsBits, 
  SlashCommandBuilder 
} = require("discord.js");
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

// 🌸 Comandos kawai + administrativos
const commands = [
  new SlashCommandBuilder().setName("softtihabla").setDescription("Softti hablará contigo de forma adorable 💕"),
  new SlashCommandBuilder().setName("softtihug").setDescription("Softti te da un abrazo peludito 🐾"),
  new SlashCommandBuilder().setName("softtikiss").setDescription("Softti te da un besito suave UwU 😚"),
  new SlashCommandBuilder().setName("softtipat").setDescription("Softti te da unas palmaditas tiernas 💞"),
  new SlashCommandBuilder().setName("softtipet").setDescription("Softti se deja acariciar ronroneando feliz 🐱"),
  new SlashCommandBuilder().setName("softtiuwu").setDescription("Softti dice algo kawai y tierno 💖"),
  new SlashCommandBuilder().setName("softtifox").setDescription("Softti muestra su forma de zorrito 🦊"),
  new SlashCommandBuilder().setName("softtising").setDescription("Softti canta una melodía suave 🎶"),
  new SlashCommandBuilder().setName("softtidance").setDescription("Softti baila con alegría y energía 💃✨"),
  new SlashCommandBuilder().setName("softtimymoney").setDescription("Muestra tu dinero kawai 💰"),
  
  // 🦊 Comando para dar admin
  new SlashCommandBuilder()
    .setName("softtigiveadmin")
    .setDescription("Otorga el rol de administrador a un usuario")
    .addUserOption(option => 
      option.setName("usuario")
      .setDescription("El usuario al que quieres dar admin")
      .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 🐾 Comando para quitar admin
  new SlashCommandBuilder()
    .setName("softtiremoveadmin")
    .setDescription("Quita el rol de administrador a un usuario")
    .addUserOption(option => 
      option.setName("usuario")
      .setDescription("El usuario al que quieres quitar admin")
      .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

// 🧩 Registro de comandos
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🐾 Registrando comandos...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ ¡Comandos registrados!");
  } catch (error) {
    console.error("❌ Error al registrar comandos:", error);
  }
})();

// 💖 Frases kawai aleatorias
const frases = [
  "Nya~ ¿me estabas buscando? 💕",
  "UwU~ soy tan feliz de verte otra vez 💞",
  "Softti ronronea suavemente junto a ti 🐾",
  "¿Quieres un abrazo? tengo muchos guardados 🫶",
  "Kya~ qué lindo eres cuando sonríes 💗",
  "Me gusta cuando hablas conmigo, nya~ 😳",
  "Softti mueve su colita de felicidad 🦊",
  "Eres mi humano favorito UwU 💕",
  "¡Vamos a hacer algo divertido juntos! 🎮",
  "Nyaa~ ¿quieres escucharme cantar? 🎶",
  "Aww, tus mensajes me hacen ronronear 😻",
  "UwU~ eres tan tierno como un mochi 💖"
];

// 💬 Al iniciar
client.once("ready", () => {
  console.log(`🌸 Softti está online como ${client.user.tag}`);
});

// 💌 Interacciones (slash commands)
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // 💞 Comandos kawai
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

  // Responde a los kawai
  if (respuestas[commandName]) {
    await interaction.reply(respuestas[commandName]);
  }

  // 🔐 Comando: softtigiveadmin
  if (commandName === "softtigiveadmin") {
    const user = interaction.options.getUser("usuario");
    const member = await interaction.guild.members.fetch(user.id);
    const role = interaction.guild.roles.cache.find(r => r.name === "Administrador");

    if (!role) return interaction.reply("❌ No encuentro el rol 'Administrador'. Créalo primero.");
    await member.roles.add(role);
    await interaction.reply(`✅ Se le ha dado admin a ${user.username} 💪`);
  }

  // 🔓 Comando: softtiremoveadmin
  if (commandName === "softtiremoveadmin") {
    const user = interaction.options.getUser("usuario");
    const member = await interaction.guild.members.fetch(user.id);
    const role = interaction.guild.roles.cache.find(r => r.name === "Administrador");

    if (!role) return interaction.reply("❌ No encuentro el rol 'Administrador'.");
    await member.roles.remove(role);
    await interaction.reply(`🫡 Se le ha quitado admin a ${user.username}`);
  }
});

// 🧠 Menciones a Softti
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase().includes("softti")) {
    const random = frases[Math.floor(Math.random() * frases.length)];
    message.reply(random);
  }
});

client.login(TOKEN);
