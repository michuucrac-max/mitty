import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import fs from "fs";
import fetch from "node-fetch";
import express from "express";
import OpenAI from "openai";

// --- Verificar variables de entorno ---
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DISCORD_TOKEN = process.env.TOKEN;

if (!OPENAI_KEY) {
  console.error("❌ ERROR: OPENAI_API_KEY no está definido en Render.");
  process.exit(1);
}
if (!DISCORD_TOKEN) {
  console.error("❌ ERROR: TOKEN de Discord no está definido en Render.");
  process.exit(1);
}

// --- Inicializar OpenAI ---
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Crear cliente Discord ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// --- Cargar comandos ---
let cmds = [];
if (fs.existsSync("cmd.json")) {
  cmds = JSON.parse(fs.readFileSync("cmd.json", "utf8"));
  for (const cmd of cmds) client.commands.set(cmd.name, cmd);
}

// --- Estados dinámicos ---
let estados = [];
if (fs.existsSync("estados.json")) {
  estados = JSON.parse(fs.readFileSync("estados.json", "utf8"));
}
setInterval(() => {
  if (estados.length > 0 && client.user) {
    const estado = estados[Math.floor(Math.random() * estados.length)];
    client.user.setPresence({ activities: [{ name: estado }], status: "online" });
  }
}, 5 * 60 * 1000);

// --- Cargar conversaciones ---
let conversaciones = {};
if (fs.existsSync("conversaciones.json")) {
  conversaciones = JSON.parse(fs.readFileSync("conversaciones.json", "utf8"));
}

// --- Manejo de mensajes ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (/https?:\/\//.test(message.content)) return message.reply("🚫 No se permiten enlaces, nya~ 💢");
  if (message.content.startsWith("/")) return;

  const userId = message.author.id;
  if (!conversaciones[userId]) conversaciones[userId] = [];

  conversaciones[userId].push({ role: "user", content: message.content });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Eres Softti Tales, un bot adorable y kawaii, alegre, expresivo, lleno de emojis. Nunca insultes ni hables temas sensibles."
        },
        ...conversaciones[userId].slice(-10) // limitar últimos 10 mensajes para evitar overflow
      ],
      temperature: 0.85,
      max_tokens: 250
    });

    const respuesta = completion.choices[0].message?.content?.trim();
    if (respuesta) {
      await message.reply(respuesta);
      conversaciones[userId].push({ role: "assistant", content: respuesta });
      fs.writeFileSync("conversaciones.json", JSON.stringify(conversaciones, null, 2));
    } else {
      message.reply("Ayy~ algo falló, nya 💔 intenta más tarde uwu~");
    }
  } catch (err) {
    console.error("❌ Error OpenAI:", err);
    message.reply("Ayy~ algo falló, nya 💔 intenta más tarde uwu~");
  }
});

// --- Slash commands ---
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return interaction.reply("Ese comando no existe, nya~ 🐾");

  try {
    await cmd.execute(interaction, client);
  } catch (err) {
    console.error("❌ Error comando:", err);
    interaction.reply("Algo salió mal con ese comando uwu 💔");
  }
});

// --- Express KeepAlive ---
const app = express();
app.get("/", (req, res) => res.send("✨ Softti Tales activo 24/7 💖"));
app.listen(process.env.PORT || 3000, () => console.log("🌐 KeepAlive activo en Render"));

// --- Watcher ---
setInterval(() => {
  fetch("https://softti-tales.onrender.com")
    .then(() => console.log("💖 Ping a Render exitoso"))
    .catch(() => console.log("💤 Ping falló, pero sigo viva! uwu"));
}, 4 * 60 * 1000);

// --- Autoreconexión Discord ---
client.on("shardDisconnect", () => {
  console.warn("⚠️ Conexión perdida, intentando reconectar...");
  client.login(DISCORD_TOKEN).catch(() => console.log("💔 Fallo al reconectar"));
});

// --- Ready ---
client.once("ready", () => {
  console.log(`💞 Softti Tales conectada como ${client.user.tag}`);
  client.user.setActivity("ser adorable 🐾", { type: 0 });
});

client.login(DISCORD_TOKEN);
