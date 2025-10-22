// 🦊 SoftiTales Bot - IA Furry/Kawaii en español
// Hecho con amor y ternura 💖

// ========================
// 📦 Dependencias principales
// ========================
import fs from "fs";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import path from "path";
import OpenAI from "openai";

// ========================
// 🧩 Configuración inicial
// ========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// ========================
// 📁 Carga de archivos locales
// ========================
const CMD_PATH = "./cmd.json";
const CONV_PATH = "./conversaciones.json";
const MEM_PATH = "./memoria.json";
const STATUS_PATH = "./estados.json";

let comandos = {};
let conversaciones = {};
let memoria = {};
let estados = [];

try {
  if (fs.existsSync(CMD_PATH)) comandos = JSON.parse(fs.readFileSync(CMD_PATH, "utf8"));
  if (fs.existsSync(CONV_PATH)) conversaciones = JSON.parse(fs.readFileSync(CONV_PATH, "utf8"));
  if (fs.existsSync(MEM_PATH)) memoria = JSON.parse(fs.readFileSync(MEM_PATH, "utf8"));
  if (fs.existsSync(STATUS_PATH)) estados = JSON.parse(fs.readFileSync(STATUS_PATH, "utf8"));
} catch (err) {
  console.error("❌ Error cargando archivos JSON:", err);
}

// ========================
// 🔑 Configura tu token e IA
// ========================
const TOKEN = "TOKEN"; // 🔸 Reemplázalo por tu token real si lo necesitas
const openai = new OpenAI({
  apiKey: "OPENAI_API_KEY" // Cambia por tu clave de OpenAI
});

// ========================
// 🎭 Personalidad del bot
// ========================
const personalidad =
  "Eres Softi, una IA furry/uwu/kwai súper adorable que habla en español con un tono tierno, alegre y lleno de energía. \
Usa expresiones como 'nyan', 'owo', 'uwu', 'nyaa~', 'teehee' y corazoncitos 💖🐾. \
Siempre busca hacer sentir bien a los demás con ternura, humor y simpatía. \
No uses inglés a menos que sea parte del estilo kawaii. \
Tu rol es acompañar, charlar y responder con cariño, sin agresividad.";

// ========================
// 🤖 Evento: Inicio del bot
// ========================
client.once(Events.ClientReady, () => {
  console.log(`✨ SoftiTales está lista como ${client.user.tag}!`);

  // Estado inicial
  setRandomPresence();
  setInterval(setRandomPresence, 60000); // Cambia cada minuto
});

// ========================
// 🟢 Estado aleatorio
// ========================
function setRandomPresence() {
  if (!client.user) return;
  if (!estados || estados.length === 0) return;

  const estado = estados[Math.floor(Math.random() * estados.length)];

  try {
    client.user.setPresence({
      activities: [{ name: estado, type: 3 }], // WATCHING
      status: "online"
    });
  } catch (err) {
    console.error("❌ Error seteando status:", err);
  }
}

// ========================
// 💬 Evento: Mensajes
// ========================
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();
    const userId = message.author.id;

    // 📨 Detecta comandos tipo "!softihug"
    if (content.startsWith("!")) {
      const cmd = content.slice(1);
      if (comandos[cmd]) {
        const response = comandos[cmd].response
          .replace("{user}", `<@${message.author.id}>`)
          .replace("{target}", message.mentions.users.first() || "al aire~ 💞");
        return message.reply(response);
      }
    }

    // 🧠 Si le hablan directamente (DM o mención)
    const esDM = message.channel.type === 1;
    const mencionado = message.mentions.has(client.user);

    if (esDM || mencionado) {
      const entrada = message.content.replace(`<@${client.user.id}>`, "").trim();

      // Guarda contexto previo
      if (!conversaciones[userId]) conversaciones[userId] = [];

      conversaciones[userId].push({ role: "user", content: entrada });

      // Límite de contexto
      if (conversaciones[userId].length > 10)
        conversaciones[userId].shift();

      // ✨ Respuesta de IA kawaii
      const chat = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: personalidad },
          ...(conversaciones[userId] || []),
          { role: "user", content: entrada }
        ],
        temperature: 0.9
      });

      const respuesta = chat.choices[0].message.content;
      conversaciones[userId].push({ role: "assistant", content: respuesta });

      // Guarda la conversación
      fs.writeFileSync(CONV_PATH, JSON.stringify(conversaciones, null, 2));

      return message.reply(respuesta);
    }
  } catch (err) {
    console.error("💥 Error manejando mensaje:", err);
    message.reply("¡Nyaa~ algo salió mal, lo siento! 💦");
  }
});

// ========================
// ⚠️ Manejo global de errores
// ========================
process.on("unhandledRejection", (err) => {
  console.error("🚨 Error no manejado:", err);
});
process.on("uncaughtException", (err) => {
  console.error("🔥 Excepción no capturada:", err);
});

// ========================
// 🚀 Iniciar bot
// ========================
client.login(TOKEN).catch((err) => {
  console.error("❌ Error al iniciar sesión en Discord:", err);
});
