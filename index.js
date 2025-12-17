// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  Events,
  SlashCommandBuilder
} from "discord.js";

import fs from "fs";
import fetch from "node-fetch";
import http from "http";

// =====================
// ENV
// =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const LONGCAT_API = process.env.LONGCAT_API;

// =====================
// CLIENT
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// =====================
// LOG HELPER
// =====================
function log(...args) {
  console.log("🦊 [SOFTI]", ...args);
}

// =====================
// LOAD WELCOME CHANNELS
// =====================
let welcomeData = {};
try {
  welcomeData = JSON.parse(fs.readFileSync("welcome.json", "utf8"));
  log("welcome.json cargado");
} catch {
  log("welcome.json no existe, creando uno nuevo");
  fs.writeFileSync("welcome.json", "{}");
  welcomeData = {};
}

// =====================
// SLASH COMMANDS
// =====================
const slashCommands = [
  new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Configura el canal de bienvenida")
    .addChannelOption(opt =>
      opt
        .setName("canal")
        .setDescription("Canal de bienvenida")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Ping de Softi 💖")
].map(cmd => cmd.toJSON());

// =====================
// REGISTER SLASH
// =====================
async function registerSlashCommands() {
  try {
    log("Registrando slash commands...");
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: slashCommands }
    );
    log("Slash commands registrados correctamente");
  } catch (err) {
    console.error("❌ Error registrando slash:", err);
  }
}

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  log(`Softi lista como ${client.user.tag}`);
  await registerSlashCommands();
});

// =====================
// INTERACTIONS
// =====================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  log("Comando usado:", interaction.commandName);

  if (interaction.commandName === "ping") {
    return interaction.reply("🏓 Pong 💖");
  }

  if (interaction.commandName === "setwelcome") {
    const canal = interaction.options.getChannel("canal");

    welcomeData[interaction.guild.id] = canal.id;
    fs.writeFileSync(
      "welcome.json",
      JSON.stringify(welcomeData, null, 2)
    );

    log(
      `Canal de bienvenida configurado en ${interaction.guild.name}:`,
      canal.name
    );

    return interaction.reply({
      content: `✅ Canal de bienvenida configurado: ${canal}`,
      ephemeral: true
    });
  }
});

// =====================
// MENSAJES
// =====================
const mensajesBienvenida = [
  m => `🌸 ¡Bienvenido/a ${m}! Softi te abraza 💖`,
  m => `✨ ${m} acaba de llegar ✨`,
  m => `🦊 Softi dice hola a ${m}`,
  m => `💫 Nueva personita: ${m}`
];

const mensajesDespedida = [
  m => `💔 ${m.user.username} se fue…`,
  m => `🕊️ Hasta luego ${m.user.username}`,
  m => `✨ ${m.user.username} salió del server`
];

// =====================
// GUILD MEMBER ADD
// =====================
client.on("guildMemberAdd", member => {
  log("guildMemberAdd:", member.user.username);

  const canalId = welcomeData[member.guild.id];
  if (!canalId) {
    log("No hay canal de bienvenida configurado");
    return;
  }

  const canal = member.guild.channels.cache.get(canalId);
  if (!canal) {
    log("Canal guardado no existe");
    return;
  }

  const msg =
    mensajesBienvenida[Math.floor(Math.random() * mensajesBienvenida.length)];

  canal.send(msg(member.user.username))
    .then(() => log("Mensaje de bienvenida enviado"))
    .catch(err => console.error("❌ Error enviando bienvenida:", err));
});

// =====================
// GUILD MEMBER REMOVE
// =====================
client.on("guildMemberRemove", member => {
  log("guildMemberRemove:", member.user.username);

  const canalId = welcomeData[member.guild.id];
  if (!canalId) return;

  const canal = member.guild.channels.cache.get(canalId);
  if (!canal) return;

  const msg =
    mensajesDespedida[Math.floor(Math.random() * mensajesDespedida.length)];

  canal.send(msg(member))
    .then(() => log("Mensaje de despedida enviado"))
    .catch(err => console.error("❌ Error enviando despedida:", err));
});

// =====================
// 24/7 SERVER
// =====================
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Softi activa 💖");
}).listen(PORT, () => {
  log("Servidor HTTP activo en puerto", PORT);
});

// =====================
// LOGIN
// =====================
client.login(TOKEN)
  .then(() => log("Login correcto"))
  .catch(err => console.error("❌ Error login:", err));
