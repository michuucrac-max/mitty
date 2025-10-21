/**
 * index.js - Softti Tales (versión slash commands)
 * Funcionalidad: IA, AutoMod, imágenes y comandos /
 */

import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  REST,
  Routes,
  EmbedBuilder
} from "discord.js";
import { initAutoMod, checkMessage } from "./automod.js";

// --- Paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Environment ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- JSON Config ---
function safeReadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, p), "utf8"));
  } catch {
    return [];
  }
}
const cmdJson = safeReadJSON("cmd.json");
const estadosJson = safeReadJSON("estados.json");

// --- Optional auto-update & server ---
try {
  (await import("./autoupdate.js")).default;
} catch {}
try {
  await import("./server.js");
} catch {}

// --- Discord Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

// --- Registrar Slash Commands ---
const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registrarComandosGlobales() {
  if (!CLIENT_ID || !cmdJson.length) return;
  try {
    const data = cmdJson.map((cmd) => ({
      name: cmd.name,
      description: cmd.description || "Comando de Softti Tales",
      options: [
        {
          name: "usuario",
          type: 6,
          description: "Usuario objetivo",
          required: false
        }
      ]
    }));
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: data });
    console.log("✅ Comandos globales registrados correctamente.");
  } catch (e) {
    console.error("Error registrando comandos:", e);
  }
}

// --- AutoMod ---
try {
  initAutoMod();
  console.log("🛡️ AutoMod inicializado");
} catch (e) {
  console.warn("No se pudo inicializar automod:", e);
}

// --- OpenAI IA ---
async function generarRespuestaIA(mensaje) {
  if (!OPENAI_API_KEY) return "💖 IA no disponible";
  try {
    const prompt = `Eres Softi, una IA kawaii, amable y dulce. Responde de forma tierna, coherente y positiva. 
Mensaje recibido: ${mensaje}`;

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }]
          }
        ],
        max_output_tokens: 200
      })
    });

    const data = await res.json();
    return data.output?.[0]?.content?.[0]?.text || "💖";
  } catch (e) {
    console.error("OpenAI error:", e);
    return "Ups... no pude responder >.<";
  }
}

// --- Análisis de Imágenes ---
async function analizarImagenYResponder(attachment, interaction) {
  if (!OPENAI_API_KEY)
    return interaction.reply("💖 No puedo analizar la imagen (API no configurada).");
  try {
    const prompt = "Eres Softi, una IA kawaii. Describe esta imagen de forma tierna y realista:";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: attachment.url }
            ]
          }
        ],
        max_output_tokens: 200
      })
    });

    const data = await response.json();
    const text = data.output?.[0]?.content?.[0]?.text || "💖 Se ve adorable";
    await interaction.reply(text);
  } catch (e) {
    console.error("analizarImagen error:", e);
    await interaction.reply("Ups... no pude analizar la imagen >.<");
  }
}

// --- Slash Command Handler ---
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = cmdJson.find((c) => c.name === interaction.commandName);
  if (cmd) {
    const user = interaction.user.username;
    const target =
      interaction.options.getUser("usuario")?.username || "ellos mismos";
    const respuesta = (cmd.response || "")
      .replace("{user}", user)
      .replace("{target}", target);
    return interaction.reply(respuesta);
  }
});

// --- Message Handler (para IA y menciones) ---
client.on("messageCreate", async (message) => {
  if (message.author?.bot) return;

  if (message.guild)
    try {
      if (await checkMessage(message)) return;
    } catch (e) {
      console.error("automod error:", e);
    }

  // Si contiene imagen
  if (message.attachments.size > 0) {
    for (const att of message.attachments.values()) {
      if (att.contentType?.startsWith("image/")) {
        await analizarImagenYResponder(att, {
          reply: (msg) => message.reply(msg)
        });
        return;
      }
    }
  }

  const content = message.content.trim();

  // Si se menciona a Softti
  if (message.mentions.has(client.user)) {
    const reply = await generarRespuestaIA(content);
    try {
      await message.reply(reply);
    } catch (e) {
      console.warn("No pude responder a la mención:", e);
    }
  }

  // Si es DM
  if (message.channel.type === 1) {
    const reply = await generarRespuestaIA(content);
    try {
      await message.reply(reply);
    } catch (e) {
      console.warn("No pude responder al DM:", e);
    }
  }
});

// --- Ready ---
client.once("ready", () => {
  console.log(`🌸 Softti Tales en línea como ${client.user.tag}`);

  function setPresenceSafe() {
    try {
      const estados = estadosJson.length
        ? estadosJson
        : ["🌸 cuidando corazones", "💖 abrazos digitales"];
      const estado = estados[Math.floor(Math.random() * estados.length)];
      client.user.setPresence({
        activities: [
          { name: `${estado} | kawaii`, type: ActivityType.Playing }
        ],
        status: "online"
      });
    } catch (err) {
      console.error("Error setPresenceSafe:", err);
    }
  }

  setPresenceSafe();
  setInterval(setPresenceSafe, 1000 * 60 * 5);

  registrarComandosGlobales().catch((e) =>
    console.warn("No se pudieron registrar comandos globales:", e)
  );
});

// --- Global error handlers ---
process.on("unhandledRejection", (r, p) =>
  console.error("Unhandled Rejection:", r)
);
process.on("uncaughtException", (e) =>
  console.error("Uncaught Exception:", e)
);

// --- Login ---
client.login(TOKEN).catch((err) => console.error("Error al iniciar sesión:", err));
