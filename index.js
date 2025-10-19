// index.js — versión final con OpenAI, slash commands, memoria y seguridad kawaii 💖
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  EmbedBuilder,
} from "discord.js";
import OpenAI from "openai";

// --- Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Leer JSON seguro
function safeReadJSON(file, fallback = null) {
  try {
    const full = path.join(__dirname, file);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return fallback;
  }
}

// --- Archivos
const cmd = safeReadJSON("cmd.json", []);
const admin = safeReadJSON("admin.json", {});
const estadosFile = safeReadJSON("estados.json", []);
const conversaciones = safeReadJSON("conversaciones.json", {});
const securityFile = safeReadJSON("security_manager.json", {});

// --- Config
const TOKEN = process.env.TOKEN;
const OWNER_ID =
  process.env.OWNER_ID || admin.owner_id || admin.OWNER_ID || admin.ownerId;
const OPENAI_KEY = process.env.OPENAI_KEY;
if (!TOKEN || !OPENAI_KEY) {
  console.error("✖ Falta TOKEN o OPENAI_KEY en environment");
  process.exit(1);
}

// --- Cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  antispam: securityFile.antispam || {
    maxMensajes: 5,
    intervaloMs: 5000,
    timeoutSegundos: 3600,
    advertencia:
      "⚠️ ¡OwO cuidado {usuario}! estás enviando muchos mensajitos seguidos, nyan~",
  },
  mensajes: securityFile.mensajes || {
    bloqueo: "🚫 Nya~ ¡no puedes decir eso, {usuario}!",
    link: "🔗 Nya~ no puedes enviar enlaces externos, {usuario} uwu 💖",
  },
};

// --- Variables
let userSpamMap = new Map();
const conversacionesMemoria = conversaciones || {};
const COOLDOWN_MS = 5000;

// --- Guardar memoria
function guardarConversaciones() {
  fs.writeFileSync(
    path.join(__dirname, "conversaciones.json"),
    JSON.stringify(conversacionesMemoria, null, 2)
  );
}

// --- Seguridad
async function filtrarSeguridad(message) {
  if (!message || !message.content || message.author.bot) return false;
  const txt = message.content.toLowerCase();
  const user = message.author.username;

  if (security.bloqueoLinks && /(https?:\/\/|www\.|discord\.gg\/)/i.test(txt)) {
    await message.delete().catch(() => {});
    await message.channel
      .send(security.mensajes.link.replace("{usuario}", user))
      .catch(() => {});
    return false;
  }

  for (const p of security.palabras) {
    if (txt.includes(p.toLowerCase())) {
      await message.delete().catch(() => {});
      await message.channel
        .send(security.mensajes.bloqueo.replace("{usuario}", user))
        .catch(() => {});
      return false;
    }
  }

  // Antispam
  const now = Date.now();
  const spamData = userSpamMap.get(message.author.id) || [];
  const nuevos = spamData.filter((t) => now - t < security.antispam.intervaloMs);
  nuevos.push(now);
  userSpamMap.set(message.author.id, nuevos);
  if (nuevos.length > security.antispam.maxMensajes) {
    await message.reply(
      security.antispam.advertencia.replace("{usuario}", user)
    );
    return false;
  }

  return true;
}

// --- OpenAI respuesta kawaii
async function respuestaIA(message, promptExtra = "") {
  try {
    const userId = message.author.id;
    const historial = conversacionesMemoria[userId] || [];

    historial.push({ role: "user", content: message.content });

    const respuesta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres Softi, una IA kawaii, tierna, amable, con energía tipo furry/uwu. Responde con tono adorable y positivo. No seas repetitiva, y usa emojis suaves como 💕, 🌸, 🐾, uwu.",
        },
        ...historial,
      ],
      temperature: 0.8,
    });

    const content = respuesta.choices[0].message.content.trim();
    historial.push({ role: "assistant", content });
    conversacionesMemoria[userId] = historial.slice(-10);
    guardarConversaciones();

    return content;
  } catch (err) {
    console.error("Error IA:", err.message);
    return "Aww... algo salió mal, nyan 💔 intenta de nuevo uwu~";
  }
}

// --- Cambiar estado
function cambiarEstado() {
  const estados = Array.isArray(estadosFile) ? estadosFile : [];
  if (estados.length === 0) return;
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(estado, { type: ActivityType.Playing });
}

// --- Ready
client.once("ready", () => {
  console.log(`✨ Softi activa como ${client.user.tag}`);
  cambiarEstado();
  setInterval(cambiarEstado, 5 * 60 * 1000);
});

// --- messageCreate
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const ok = await filtrarSeguridad(message);
  if (!ok) return;

  const content = message.content.trim().toLowerCase();

  // --- Slash-like commands
  if (content.startsWith("/")) {
    const [cmdName, ...args] = content.slice(1).split(/\s+/);
    const comando = cmd.find((c) => c.name.toLowerCase() === cmdName);
    if (comando) {
      const mention =
        message.mentions.users.first()?.toString() || message.author.toString();
      const text = comando.response
        .replace("{usuario}", message.author.toString())
        .replace("{mencion}", mention);
      await message.reply(`${comando.emoji || ""} ${text}`);
      return;
    }
  }

  // --- DMs (no necesita mención)
  if (message.channel.type === 1) {
    const respuesta = await respuestaIA(message);
    await message.reply(respuesta);
    return;
  }

  // --- Mención directa
  if (message.mentions.has(client.user)) {
    const respuesta = await respuestaIA(message);
    await message.reply(respuesta);
    return;
  }
});

client.login(TOKEN).catch((e) =>
  console.error("Error iniciando sesión:", e.message)
);
