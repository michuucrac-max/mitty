// 🦊 SoftiTales AI - index.js //
// Versión estable y corregida por completo 💖

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} from "discord.js";

// 🧠 Configuración de Entorno
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_TOKEN; // 🔥 corregido

// ✅ Verificación de variables
console.log("📦 Verificando variables de entorno...");
console.log({
  TOKEN: TOKEN ? "✅ Cargado" : "❌ No encontrado",
  CLIENT_ID: CLIENT_ID ? "✅ Cargado" : "❌ No encontrado",
  OWNER_ID: OWNER_ID ? "✅ Cargado" : "❌ No encontrado",
  OPENAI_API_TOKEN: OPENAI_API_KEY ? "✅ Cargado" : "❌ No encontrado",
});

// 💬 Archivos de memoria
const conversacionesPath = "./conversaciones.json";
const memoriaPath = "./memoria.json";
const estadosPath = "./estados.json";

// Asegurar que existan
for (const file of [conversacionesPath, memoriaPath, estadosPath]) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
}

// 🧩 Inicializar cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// 🌸 Inicializar cliente OpenAI
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 💕 Cargar comandos JSON
const comandosPath = "./cmd.json";
let comandos = [];
try {
  comandos = JSON.parse(fs.readFileSync(comandosPath, "utf8"));
  console.log(`✅ ${comandos.length} comandos cargados`);
} catch (err) {
  console.error("❌ Error cargando cmd.json:", err);
}

// 🐾 Presencias (status dinámicos)
let estados = {};
try {
  estados = JSON.parse(fs.readFileSync(estadosPath, "utf8"));
} catch {
  estados = {
    estado: "online",
    actividad: "✨ ronroneando contigo uwu ✨",
  };
  fs.writeFileSync(estadosPath, JSON.stringify(estados, null, 2));
}

// 🩷 Configurar presencia dinámica cada 2 minutos
async function actualizarEstado() {
  try {
    // Leer el archivo estados.json cada vez para reflejar cambios en tiempo real
    const datosEstados = JSON.parse(fs.readFileSync(estadosPath, "utf8"));
    const estadoActual = datosEstados.estado || "online";
    const actividadActual = datosEstados.actividad || "💖 ronroneando en el servidor";

    await client.user.setPresence({
      status: estadoActual,
      activities: [
        {
          name: actividadActual,
          type: 0, // 0 = Playing
        },
      ],
    });

    console.log(`🌸 Presencia actualizada: ${estadoActual} - ${actividadActual}`);
  } catch (error) {
    console.error("⚠️ Error al establecer presencia:", error);
  }
}

// 🌷 Evento listo
client.once("ready", async () => {
  console.log(`✨ Bot conectado como ${client.user.tag}`);
  
  // Actualizar inmediatamente
  await actualizarEstado();

  // Cambiar estado cada 2 minutos (120000 ms)
  setInterval(actualizarEstado, 120000);
});

// 💌 Manejador principal de mensajes
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // 📨 Responder a mensajes directos
  if (message.channel.type === 1) {
    await responderIA(message);
    return;
  }

  // 📣 Si es mención directa al bot
  if (message.mentions.has(client.user)) {
    await responderIA(message);
    return;
  }

  // 🎀 Si usa comando tipo "softi..."
  const contenido = message.content.trim().toLowerCase();
  const comando = comandos.find((cmd) => contenido.startsWith(`!${cmd.name}`));
  if (comando) {
    const partes = message.content.split(" ");
    const target =
      message.mentions.users.first() || { username: partes[1] || "alguien" };
    const respuesta = comando.response
      .replace("{user}", message.author.username)
      .replace("{target}", target.username);
    await message.reply(respuesta);
  }
});

// 💫 Función IA con memoria kawaii
async function responderIA(message) {
  const userId = message.author.id;

  let conversaciones = JSON.parse(
    fs.readFileSync(conversacionesPath, "utf8") || "{}"
  );

  if (!conversaciones[userId]) conversaciones[userId] = [];

  const promptBase = `
Eres Softi, una IA furry-uwu kawaii, dulce, tierna y juguetona.
Hablas en español con expresiones adorables: "nyaa~", "uwu", "kya~", "teehee~", etc.
Eres amable, cariñosa, curiosa, simpática y siempre das respuestas cálidas con emojis suaves.
Evita lenguaje ofensivo, grosero o muy adulto.
Tu tono siempre debe parecer de una mascota o compañero tierno digital.
Si te saludan, responde adorablemente con ternura.
Si te preguntan algo serio, sigue siendo dulce, pero también empática y respetuosa.`;

  conversaciones[userId].push({
    role: "user",
    content: message.content,
  });

  const mensajesIA = [
    { role: "system", content: promptBase },
    ...conversaciones[userId].slice(-10), // límite de historial
  ];

  try {
    const respuesta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: mensajesIA,
      temperature: 0.8,
      max_tokens: 300,
    });

    const contenidoRespuesta = respuesta.choices[0].message.content;
    await message.reply(contenidoRespuesta);

    conversaciones[userId].push({
      role: "assistant",
      content: contenidoRespuesta,
    });

    fs.writeFileSync(
      conversacionesPath,
      JSON.stringify(conversaciones, null, 2)
    );
  } catch (error) {
    console.error("⚠️ Error IA:", error);
    await message.reply("Nyaa~ hubo un error procesando tu mensajito 💔");
  }
}

// ⚡ Manejador global de errores
process.on("unhandledRejection", (reason) => {
  console.error("🚨 Error no manejado:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Excepción no capturada:", err);
});

// 🚀 Iniciar sesión
client
  .login(TOKEN)
  .then(() => console.log("🌟 Iniciando sesión en Discord..."))
  .catch((error) =>
    console.error("❌ Error al iniciar sesión en Discord:", error)
  );
