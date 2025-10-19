import { Client, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import OpenAI from "openai";
import fs from "fs";
import express from "express";
import fetch from "node-fetch";

// =============================
// ⚙️ CONFIGURACIÓN DIRECTA
// =============================
const TOKEN = "AQUI_TU_TOKEN_DE_DISCORD";
const OPENAI_API_KEY = "AQUI_TU_API_KEY_DE_OPENAI";

// =============================
// 🧩 Inicialización del cliente
// =============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// =============================
// ⚙️ Cargar archivos externos
// =============================
let estados = [];
try {
  estados = JSON.parse(fs.readFileSync("./estados.json", "utf8"));
  console.log(`🌸 ${estados.length} estados cargados`);
} catch {
  estados = [{ name: "uwu esperando mensajitos 💌", type: "Playing" }];
  console.warn("⚠️ No se encontró estados.json, usando valores por defecto");
}

let comandos = [];
try {
  comandos = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
  console.log(`✨ ${comandos.length} comandos cargados`);
} catch {
  console.error("❌ No se pudo cargar cmd.json");
}

let conversaciones = {};
try {
  conversaciones = JSON.parse(fs.readFileSync("./conversaciones.json", "utf8"));
} catch {
  conversaciones = {};
  console.warn("⚠️ No se encontró conversaciones.json, creando nuevo archivo");
}

let memoria = {};
try {
  memoria = JSON.parse(fs.readFileSync("./memoria.json", "utf8"));
} catch {
  memoria = { personalidad: "tierna, dulce, amigable y kawaii", tono: "positivo" };
}

let seguridad = {};
try {
  seguridad = JSON.parse(fs.readFileSync("./security_manager.json", "utf8"));
} catch {
  seguridad = { palabras_bloqueadas: [], limite_mensajes: 5 };
  console.warn("⚠️ No se encontró security_manager.json, usando configuración básica");
}

// =============================
// 🚫 Antispam + filtro de palabras
// =============================
const userSpam = new Map();
const SPAM_LIMIT = seguridad.limite_mensajes || 5;
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

function contienePalabrasBloqueadas(texto) {
  return seguridad.palabras_bloqueadas.some(p => texto.toLowerCase().includes(p.toLowerCase()));
}

// =============================
// 💬 Chat + Memoria de conversación
// =============================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content) return;

  const canalDM = message.channel.type === 1; // DM
  const meMencionaron = message.mentions.has(client.user.id);

  if (!canalDM && !meMencionaron) return; // Solo responder si DM o me mencionan

  if (esSpam(message)) {
    await message.reply("⚠️ Nyah~ estás escribiendo muy rápido, toma un respiro 💤");
    return;
  }

  if (contienePalabrasBloqueadas(message.content)) {
    await message.reply("🚫 Nyaa~ eso contiene palabras no permitidas...");
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
          content: `Eres Softti Tales, un bot kawaii, amigable y positivo. Usa tono dulce, emojis, y evita temas negativos.`
        },
        ...conversaciones[userId].map(m => ({
          role: m.rol === "user" ? "user" : "assistant",
          content: m.contenido
        }))
      ],
    });

    const respuesta = completion.choices[0]?.message?.content || "Nya~ no entendí eso 😿";
    conversaciones[userId].push({ rol: "assistant", contenido: respuesta });
    fs.writeFileSync("./conversaciones.json", JSON.stringify(conversaciones, null, 2));

    await message.reply(respuesta);
  } catch (error) {
    console.error("❌ Error con OpenAI:", error);
    await message.reply("😿 Algo salió mal, nyan~");
  }
});

// =============================
// 🌈 Estados dinámicos
// =============================
client.once("ready", () => {
  console.log(`🐾 Softti Tales conectado como ${client.user.tag}`);

  let i = 0;
  setInterval(() => {
    const estado = estados[i % estados.length];
    const tipo = ActivityType[estado.type] || ActivityType.Playing;
    client.user.setActivity(estado.name, { type: tipo });
    i++;
  }, 300000);

  const inicial = estados[0];
  client.user.setActivity(inicial.name, { type: ActivityType[inicial.type] });
});

// =============================
// 🚀 KeepAlive
// =============================
const app = express();
app.get("/", (req, res) => res.send("✨ Softti Tales activo 24/7 💖"));
app.listen(3000, () => console.log("🌐 KeepAlive activo"));

setInterval(() => {
  fetch("https://softti-tales.onrender.com")
    .then(() => console.log("💖 Ping exitoso"))
    .catch(() => console.log("💤 Ping falló, pero sigo viva UwU"));
}, 4 * 60 * 1000);

// =============================
// 🚀 Login
// =============================
client.login(TOKEN).then(() => {
  console.log("✨ Softti Tales está online UwU");
}).catch(err => {
  console.error("❌ Error al iniciar sesión:", err);
});
