/**
 * index.js — Softti Tales Configurable
 * Funciones: IA, AutoMod, slash commands y configuración en vivo desde #softitales-config
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  REST,
  Routes,
} from "discord.js";
import { initAutoMod, checkMessage } from "./automod.js";
import { handleConfigMessage, getGuildSettings } from "./softitales-config.js";

// --- Paths y setup inicial ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_DIR = path.join(__dirname, "autom", "guildSettings");
if (!fs.existsSync(SETTINGS_DIR)) fs.mkdirSync(SETTINGS_DIR, { recursive: true });

// --- Environment ---
const TOKEN = "TOKEN"; // ← Reemplázalo por tu token
const CLIENT_ID = "CLIENT_ID";
const OPENAI_API_KEY = "OPENAI_API_KEY";

// --- Discord Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// --- Memoria de configuraciones ---
const activeConfigs = new Map();

// --- Slash commands loader (opcional si usas comandos /) ---
const rest = new REST({ version: "10" }).setToken(TOKEN);
async function registrarComandosGlobales() {
  try {
    const cmds = [
      { name: "softi", description: "Habla con Softi 💖" },
      { name: "estado", description: "Ver estado del bot uwu" },
    ];
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: cmds });
    console.log("✅ Comandos globales registrados");
  } catch (e) {
    console.error("Error al registrar comandos:", e);
  }
}

// --- AutoMod inicial ---
try {
  initAutoMod();
  console.log("🛡️ AutoMod inicializado correctamente");
} catch (err) {
  console.warn("⚠️ No se pudo iniciar el AutoMod:", err);
}

// --- IA kawaii (mock, usa API si tienes clave configurada) ---
async function generarRespuestaIA(texto) {
  if (!OPENAI_API_KEY) return "💖 No tengo conexión con la IA ahora, nyan~";
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [{ role: "user", content: [{ type: "input_text", text: texto }] }],
        max_output_tokens: 200,
      }),
    });
    const data = await res.json();
    return data.output?.[0]?.content?.[0]?.text || "UwU no entendí eso 💞";
  } catch (err) {
    console.error("Error con OpenAI:", err);
    return "Ups... algo falló >.<";
  }
}

// --- Evento principal ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const guild = message.guild;
  if (!guild) return;

  const guildId = guild.id;
  let guildSettings = activeConfigs.get(guildId);

  // Cargar configuración si no está en memoria
  if (!guildSettings) {
    guildSettings = getGuildSettings(guildId);
    activeConfigs.set(guildId, guildSettings);
  }

  // ⚙️ Canal de configuración
  if (message.channel.name === "softitales-config") {
    const updated = await handleConfigMessage(message, guildSettings);
    if (updated) {
      activeConfigs.set(guildId, updated);
      message.reply("⚙️ Configuración actualizada correctamente uwu 💖");
    }
    return;
  }

  // 🛡️ AutoMod (si está activado)
  if (guildSettings.automod !== false) {
    try {
      const bloqueado = await checkMessage(message);
      if (bloqueado) return; // mensaje moderado
    } catch (err) {
      console.error("Error en automod:", err);
    }
  }

  // 💬 Respuesta cuando mencionan al bot
  if (message.mentions.has(client.user)) {
    const respuesta = await generarRespuestaIA(`Me mencionaron: ${message.content}`);
    await message.reply(respuesta);
    return;
  }
});

// --- Cuando el bot está listo ---
client.once("ready", () => {
  console.log(`🌸 Softti Tales está en línea como ${client.user.tag}`);

  function setPresenceSafe() {
    try {
      const estados = [
        "🌸 cuidando corazones",
        "💖 abrazos digitales",
        "🐾 en modo kawaii",
      ];
      const estado = estados[Math.floor(Math.random() * estados.length)];
      client.user.setPresence({
        activities: [{ name: estado, type: ActivityType.Playing }],
        status: "online",
      });
    } catch (err) {
      console.error("Error setPresenceSafe:", err);
    }
  }

  setPresenceSafe();
  setInterval(setPresenceSafe, 1000 * 60 * 5);
  registrarComandosGlobales().catch(() =>
    console.warn("No se pudieron registrar los comandos globales")
  );
});

// --- Manejo de errores globales ---
process.on("unhandledRejection", (reason, p) => {
  console.error("❌ Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

// --- Iniciar sesión ---
client.login(TOKEN).catch((err) => console.error("Error al iniciar sesión:", err));
