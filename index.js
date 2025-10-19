// index.js — versión con memoria persistente y IA kawaii/uwu
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
} from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Función para leer JSON de forma segura
function safeReadJSON(filename, fallback = {}) {
  try {
    const full = path.join(__dirname, filename);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return fallback;
  }
}

// --- Archivos
const cmd = safeReadJSON("cmd.json", []);
const frasesDetectadas = safeReadJSON("frases_detectadas.json", []);
const securityFile = safeReadJSON("security_manager.json", {});
const vocabularioFile = safeReadJSON("vocabulario.json", []);
const conversaciones = safeReadJSON("conversaciones.json", {});
const memoria = safeReadJSON("memoria.json", {}); // <- nueva memoria persistente

// --- Config seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  mensajes: securityFile.mensajes || {
    bloqueo: "🚫 Nya~ ¡no puedes decir eso, {usuario}!",
    link: "🔗 Nya~ no puedes enviar enlaces, {usuario} uwu 💖",
  },
  antispam: securityFile.antispam || {
    maxMensajes: 5,
    intervaloMs: 5000,
    timeoutSegundos: 3600,
    advertencia:
      "⚠️ OwO cuidado {usuario}, estás enviando muchos mensajitos seguidos, nyan~",
  },
};

// --- Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const TOKEN = process.env.TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Estados kawaii
const estados = [
  { tipo: ActivityType.Playing, mensaje: "Softti uwu" },
  { tipo: ActivityType.Listening, mensaje: "susurros kawaii 💕" },
  { tipo: ActivityType.Watching, mensaje: "zorritos felices 💫" },
];
function cambiarEstado() {
  const e = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(e.mensaje, { type: e.tipo });
}

// --- Control de spam
const userMessages = new Map();
function checkSpam(userId) {
  const now = Date.now();
  const msgs = userMessages.get(userId) || [];
  const filtered = msgs.filter((t) => now - t < security.antispam.intervaloMs);
  filtered.push(now);
  userMessages.set(userId, filtered);
  return filtered.length > security.antispam.maxMensajes;
}

// --- Filtro de seguridad
async function filtrarSeguridad(message) {
  const content = message.content.toLowerCase();
  const user = message.author.username;

  if (security.bloqueoLinks && /(https?:\/\/|www\.|discord\.gg\/)/i.test(content)) {
    await message.delete().catch(() => {});
    await message.channel
      .send(security.mensajes.link.replace("{usuario}", user))
      .catch(() => {});
    return false;
  }

  for (const p of security.palabras) {
    if (p && content.includes(p.toLowerCase())) {
      await message.delete().catch(() => {});
      await message.channel
        .send(security.mensajes.bloqueo.replace("{usuario}", user))
        .catch(() => {});
      return false;
    }
  }
  return true;
}

// --- Función IA kawaii persistente
async function responderIA(userId, mensaje) {
  const historial = conversaciones[userId] || [];
  historial.push({ role: "user", content: mensaje });
  if (historial.length > 10) historial.shift();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres Softti, una IA zorrita kawaii, tierna, suave y amorosa. Usa lenguaje uwu/owo, emojis tiernos y responde con dulzura. Recuerda las conversaciones y emociones de los usuarios.",
        },
        ...historial,
      ],
      temperature: 0.9,
      max_tokens: 150,
    });

    const respuesta = completion.choices[0].message.content.trim();
    historial.push({ role: "assistant", content: respuesta });
    conversaciones[userId] = historial;

    fs.writeFileSync(
      path.join(__dirname, "conversaciones.json"),
      JSON.stringify(conversaciones, null, 2)
    );

    return respuesta;
  } catch (e) {
    console.error("Error IA:", e.message);
    return "Nya~ algo salió mal uwu 💔";
  }
}

// --- Memoria persistente
function recordarUsuario(userId, campo, valor) {
  if (!memoria[userId]) memoria[userId] = {};
  memoria[userId][campo] = valor;
  fs.writeFileSync(
    path.join(__dirname, "memoria.json"),
    JSON.stringify(memoria, null, 2)
  );
}

function obtenerMemoria(userId, campo, defecto = null) {
  return memoria[userId]?.[campo] ?? defecto;
}

// --- Ready
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} activo 24/7 con memoria`);
  cambiarEstado();
  setInterval(cambiarEstado, 5 * 60 * 1000);
});

// --- messageCreate
client.on("messageCreate", async (message) => {
  if (!message || message.author.bot) return;
  if (!(await filtrarSeguridad(message))) return;

  const userId = message.author.id;
  const contenido = message.content.toLowerCase();

  if (checkSpam(userId)) {
    await message.channel
      .send(
        security.antispam.advertencia.replace("{usuario}", message.author.username)
      )
      .catch(() => {});
    return;
  }

  // --- DM o mención → IA kawaii
  if (message.channel.type === 1 || message.mentions.has(client.user)) {
    let yaSaludo = obtenerMemoria(userId, "saludo", false);

    // Si no ha saludado antes
    if (!yaSaludo && /(hola|holi|buenas)/i.test(contenido)) {
      recordarUsuario(userId, "saludo", true);
      await message.reply("¡Holi~ 💕 qué lindo verte de nuevo! ¿Cómo estás, nyan~?");
      return;
    }

    const respuesta = await responderIA(userId, message.content);
    await message.reply(respuesta);
    return;
  }

  // --- Comandos tipo /softi
  if (contenido.startsWith("/")) {
    const cmdName = contenido.slice(1).split(/\s+/)[0];
    const found = cmd.find((c) => c.name.toLowerCase() === cmdName);
    if (found) {
      await message.reply(`${found.response || "UwU comando vacío"} ${found.emoji || ""}`);
      return;
    }
  }

  // --- Frases detectadas
  for (const f of frasesDetectadas) {
    if (f && contenido.includes(f.toLowerCase())) {
      const respuesta = await responderIA(userId, contenido);
      await message.reply(respuesta);
      return;
    }
  }
});

// --- Login
if (!TOKEN) {
  console.error("❌ No hay TOKEN configurado");
  process.exit(1);
}
client.login(TOKEN).catch((e) => console.error("Error al iniciar sesión:", e.message));
