import { Client, GatewayIntentBits } from "discord.js";
import http from "http";
import fs from "fs";

// =========================
// VARIABLES DESDE RENDER
// =========================
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// =========================
// CARGA DE COMANDOS
// =========================
let commands = [];
try {
  const data = fs.readFileSync("./cmd.json", "utf8");
  commands = JSON.parse(data);
  console.log(`✔ ${commands.length} comandos cargados desde cmd.json`);
} catch (err) {
  console.error("❌ Error leyendo cmd.json:", err);
}

// =========================
// FRASES ALEATORIAS FURRY / UWU / KAWAII
// =========================
const randomSoftiLines = [
  "nyah~ uwu 🐾",
  "te olí desde lejos 👉🐺",
  "miau~ ¿qué haces? 😽",
  "holiii uwu ✨",
  "soy un lomito suavecito y vine a saludar 🐶💗",
  "nyaa te vi entrar 🐱",
  "kawaii~ estás cute uwu 🎀",
  "holaaa, vine a ronronear a tu lado 🐾",
  "uwu ¿me llamaste? ✨",
  "nyo sé qué decir pero *mrrr* 😳🐾"
];

// =========================
// CLIENTE DEL BOT
// =========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =========================
// BOT LISTO
// =========================
client.once("ready", () => {
  console.log(`✨ Bot conectado como ${client.user.tag}`);

  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) {
    console.error("❌ No se encontró el canal. Revisa CHANNEL_ID en Render.");
  }

  console.log("🐾 Bot listo y respondiendo a mensajes.");
});

// =========================
// MANEJO DE MENSAJES
// =========================
client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  if (msg.channel.id !== CHANNEL_ID) return;

  const content = msg.content.toLowerCase();

  // -----------------------
  // 1. RESPUESTAS UWU SI DICEN ALGO RELACIONADO
  // -----------------------
  if (content.includes("softi") || content.includes("uwu") || content.includes("nya") || content.includes("furry")) {
    const random = randomSoftiLines[Math.floor(Math.random() * randomSoftiLines.length)];
    return msg.reply(random);
  }

  // -----------------------
  // 2. COMANDOS DE cmd.json
  // -----------------------
  if (content.startsWith("softi ")) {
    const args = content.split(" ");
    const cmdName = args[1];
    const target = args[2] ? args[2] : "alguien";

    const cmd = commands.find(c => c.name === cmdName);
    if (!cmd) return;

    let response = cmd.response
      .replace("{user}", `<@${msg.author.id}>`)
      .replace("{target}", target);

    return msg.reply(response);
  }

  // -----------------------
  // 3. RESPUESTA GENERAL A TODO
  // -----------------------
  const random = randomSoftiLines[Math.floor(Math.random() * randomSoftiLines.length)];
  return msg.reply(random);
});

// =========================
// SERVIDOR HTTP PARA RENDER
// =========================
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot activo :3");
}).listen(3000, () => {
  console.log("🌐 Servidor HTTP escuchando en puerto 3000");
});

// =========================
// INICIAR BOT
// =========================
client.login(TOKEN).catch(err => {
  console.error("❌ Error al iniciar sesión:", err);
});
