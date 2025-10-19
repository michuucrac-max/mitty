import { Client, GatewayIntentBits, Partials, ActivityType, REST, Routes } from "discord.js";
import OpenAI from "openai";
import fs from "fs";
import express from "express";
import fetch from "node-fetch";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =============================
// ⚙️ Cargar cmd.json
// =============================
let comandos = [];
try {
  comandos = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
  console.log(`✨ ${comandos.length} comandos cargados desde cmd.json`);
} catch (err) {
  console.error("❌ Error cargando cmd.json:", err);
  comandos = [];
}

// =============================
// ⚙️ Estados del bot
// =============================
const estados = [
  { name: "uwu esperando mensajitos 💌", type: "Playing" },
  { name: "Softti Tales cuidando tu server 💕", type: "Watching" },
  { name: "música kawaii~ 🎶", type: "Listening" },
  { name: "un sueño de estrellitas 🌙", type: "Competing" },
];

// =============================
// 🚫 Sistema antispam simple
// =============================
const userSpam = new Map();
const SPAM_LIMIT = 5;
const SPAM_TIME = 7000;

function esSpam(message) {
  const id = message.author.id;
  const ahora = Date.now();

  if (!userSpam.has(id)) {
    userSpam.set(id, { count: 1, last: ahora });
    return false;
  }

  const userData = userSpam.get(id);
  if (ahora - userData.last < SPAM_TIME) {
    userData.count++;
    if (userData.count > SPAM_LIMIT) return true;
  } else {
    userData.count = 1;
  }

  userData.last = ahora;
  userSpam.set(id, userData);
  return false;
}

// =============================
// 💬 Chat IA furry/kwai/uwu
// =============================
const conversaciones = {};

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content) return;
  const canalDM = message.channel.type === 1;
  const meMencionaron = message.mentions.has(client.user.id);

  if (!canalDM && !meMencionaron) return; // responde solo si DM o lo mencionan

  if (esSpam(message)) {
    await message.reply("⚠️ Nya~ estás escribiendo muy rápido, tómate un descansito 💞");
    return;
  }

  const userId = message.author.id;
  if (!conversaciones[userId]) conversaciones[userId] = [];

  conversaciones[userId].push({ rol: "user", contenido: message.content });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres Softti Tales, una IA kawaii, tierna y muy amigable. Hablas como un personaje furry adorable y alegre. Evita temas negativos, usa muchos emojis y frases como 'uwu', 'nya~', 'owo'.",
        },
        ...conversaciones[userId].map((m) => ({
          role: m.rol === "user" ? "user" : "assistant",
          content: m.contenido,
        })),
      ],
    });

    const respuesta = completion.choices[0]?.message?.content || "Nya~ no entendí eso 😿";
    conversaciones[userId].push({ rol: "assistant", contenido: respuesta });
    fs.writeFileSync("./conversaciones.json", JSON.stringify(conversaciones, null, 2));

    await message.reply(respuesta);
  } catch (error) {
    console.error("❌ Error con OpenAI:", error);
    await message.reply("😿 Algo salió mal, nyan~ intenta de nuevo 💕");
  }
});

// =============================
// 🧩 Slash Commands
// =============================
client.once("ready", async () => {
  console.log(`🐾 Softti Tales conectado como ${client.user.tag}`);

  // 🌸 Estados dinámicos
  let i = 0;
  setInterval(() => {
    const estado = estados[i % estados.length];
    const tipo = ActivityType[estado.type] || ActivityType.Playing;
    client.user.setActivity(estado.name, { type: tipo });
    i++;
  }, 300000); // cada 5 minutos

  // 🔧 Registrar slash commands
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: comandos.map((c) => ({
        name: c.name,
        description: c.description,
        options: [
          {
            name: "usuario",
            description: "El usuario objetivo (opcional)",
            type: 6,
            required: false,
          },
        ],
      })),
    });
    console.log("✅ Comandos registrados correctamente");
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
  }
});

// 🧩 Ejecutar comandos
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const comando = comandos.find((c) => c.name === interaction.commandName);
  if (!comando) return;

  try {
    const target = interaction.options.getUser("usuario");
    const userMention = `<@${interaction.user.id}>`;
    const targetMention = target ? `<@${target.id}>` : "alguien";

    const respuesta = comando.response
      .replace("{user}", userMention)
      .replace("{target}", targetMention);

    await interaction.reply(respuesta);
  } catch (error) {
    console.error("❌ Error ejecutando comando:", error);
    await interaction.reply({ content: "Error ejecutando el comando.", ephemeral: true });
  }
});

// =============================
// 🌐 KeepAlive para Render
// =============================
const app = express();
app.get("/", (req, res) => res.send("✨ Softti Tales activo y kawaii 💖"));
app.listen(process.env.PORT || 3000, () => console.log("🌐 KeepAlive activo"));

setInterval(() => {
  fetch("https://softti-tales.onrender.com")
    .then(() => console.log("💖 Ping a Render exitoso"))
    .catch(() => console.log("💤 Ping falló, pero sigo viva uwu"));
}, 4 * 60 * 1000);

// =============================
// 🚀 Login
// =============================
client
  .login(process.env.TOKEN)
  .then(() => console.log("✨ Softti Tales está online UwU"))
  .catch((err) => console.error("❌ Error al iniciar sesión:", err));
