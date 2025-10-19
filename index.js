import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import fs from "fs";
import fetch from "node-fetch";
import express from "express";
import OpenAI from "openai";

// --- Inicializar OpenAI ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

// --- Cargar comandos desde cmd.json ---
const cmds = JSON.parse(fs.readFileSync("cmd.json", "utf8"));
for (const cmd of cmds) client.commands.set(cmd.name, cmd);

// --- Estados dinámicos ---
let estados = [];
if (fs.existsSync("estados.json")) {
  estados = JSON.parse(fs.readFileSync("estados.json", "utf8"));
}
setInterval(() => {
  if (estados.length > 0) {
    const estado = estados[Math.floor(Math.random() * estados.length)];
    client.user.setPresence({ activities: [{ name: estado }], status: "online" });
  }
}, 5 * 60 * 1000); // cada 5 min

// --- Cargar conversaciones ---
let conversaciones = {};
if (fs.existsSync("conversaciones.json")) {
  conversaciones = JSON.parse(fs.readFileSync("conversaciones.json", "utf8"));
}

// --- Sistema de conversación con OpenAI ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Evitar enlaces o spam
  if (/https?:\/\//.test(message.content)) {
    return message.reply("🚫 No se permiten enlaces, nya~ 💢");
  }

  // Ignorar comandos slash
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
            "Eres Softti Tales, un bot tierno, adorable y con energía uwu/furry. Habla con dulzura y muchos emojis kawaii. Sé alegre, amoroso y expresivo, sin insultos ni temas sensibles."
        },
        ...conversaciones[userId]
      ],
      temperature: 0.85,
      max_tokens: 200
    });

    const respuesta = completion.choices[0].message.content;
    await message.reply(respuesta);

    conversaciones[userId].push({ role: "assistant", content: respuesta });
    fs.writeFileSync("conversaciones.json", JSON.stringify(conversaciones, null, 2));
  } catch (err) {
    console.error("❌ Error en respuesta OpenAI:", err);
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
    console.error("❌ Error en comando:", err);
    interaction.reply("Algo salió mal con ese comando uwu 💔");
  }
});

// --- Express KeepAlive ---
const app = express();
app.get("/", (req, res) => res.send("✨ Softti Tales activo 24/7 💖"));
app.listen(process.env.PORT || 3000, () =>
  console.log("🌐 KeepAlive activo en Render")
);

// --- Watcher (auto-ping cada 4 min) ---
setInterval(() => {
  fetch("https://softti-tales.onrender.com")
    .then(() => console.log("💖 Ping a Render exitoso"))
    .catch(() => console.log("💤 Ping falló, pero sigo viva! uwu"));
}, 4 * 60 * 1000);

// --- Autoreconexión si se cae Discord ---
client.on("shardDisconnect", () => {
  console.warn("⚠️ Conexión perdida, intentando reconectar...");
  client.login(process.env.TOKEN).catch(() => console.log("💔 Fallo al reconectar"));
});

// --- Listo! ---
client.once("ready", () => {
  console.log(`💞 Softti Tales conectada como ${client.user.tag}`);
  client.user.setActivity("ser adorable 🐾", { type: 0 });
});

client.login(process.env.TOKEN);
