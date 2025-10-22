// 🦊 SoftiTales AI - index.js
// Versión estable y corregida 💖

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  ActivityType
} from "discord.js";

// 🧠 Configuración de Entorno
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_TOKEN;

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
const comandosPath = "./cmd.json";

// Asegurar que existan
for (const file of [conversacionesPath, memoriaPath, estadosPath, comandosPath]) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
}

// 🧩 Inicializar cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// 🌸 Inicializar cliente OpenAI
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 💕 Cargar comandos JSON
let comandos = [];
try {
  comandos = JSON.parse(fs.readFileSync(comandosPath, "utf8"));
  console.log(`✅ ${comandos.length} comandos cargados`);
} catch (err) {
  console.error("❌ Error cargando cmd.json:", err);
}

// 🐾 Cargar estados
let estadosList = [];
try {
  estadosList = JSON.parse(fs.readFileSync(estadosPath, "utf8"));
  console.log(`✅ ${estadosList.length} estados cargados`);
} catch (err) {
  console.error("❌ Error cargando estados.json:", err);
  estadosList = ["ronroneando uwu"];
}

// 🩷 Función para cambiar estado aleatorio
async function actualizarEstado() {
  if (!client.user) return;
  const actividad = estadosList[Math.floor(Math.random() * estadosList.length)];
  try {
    await client.user.setPresence({
      activities: [{ name: actividad, type: ActivityType.Playing }],
      status: "online"
    });
    console.log("🌸 Estado actualizado a:", actividad);
  } catch (err) {
    console.error("⚠️ Error al actualizar estado:", err);
  }
}

// ⚡ Registrar comandos en Discord
const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registrarComandos() {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: comandos.map(c => ({
          name: c.name,
          description: c.description,
          options: c.options || [
            {
              name: "target",
              description: "Usuario a quien aplicar",
              type: 6,
              required: false
            }
          ]
        }))
      }
    );
    console.log("✅ Comandos registrados en Discord");
  } catch (err) {
    console.error("❌ Error registrando comandos:", err);
  }
}

// 🌷 Evento listo
client.once("ready", async () => {
  console.log(`✨ Bot conectado como ${client.user.tag}`);
  registrarComandos();
  actualizarEstado();
  setInterval(actualizarEstado, 120000); // cada 2 min
});

// 💌 Manejador de interacciones (slash commands)
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const comando = comandos.find(c => c.name === interaction.commandName);
  if (!comando) return;

  const target = interaction.options.getUser("target") || interaction.user;
  const respuesta = comando.response
    .replace("{user}", interaction.user.username)
    .replace("{target}", target.username);

  await interaction.reply(respuesta);
});

// 💌 Manejador principal de mensajes
client.on("messageCreate", async message => {
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
});

// 💫 Función IA con memoria kawaii
async function responderIA(message) {
  const userId = message.author.id;

  let conversaciones = JSON.parse(fs.readFileSync(conversacionesPath, "utf8") || "{}");
  if (!conversaciones[userId]) conversaciones[userId] = [];

  const promptBase = `
Eres Softi, una IA furry-uwu kawaii, dulce y juguetona.
Hablas español con expresiones adorables: "nyaa~", "uwu", "kya~", "teehee~", etc.
Eres amable, cariñosa y siempre das respuestas cálidas con emojis suaves.
Evita lenguaje ofensivo o adulto.`;

  conversaciones[userId].push({
    role: "user",
    content: message.content
  });

  const mensajesIA = [
    { role: "system", content: promptBase },
    ...conversaciones[userId].slice(-10)
  ];

  try {
    const respuesta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: mensajesIA,
      temperature: 0.8,
      max_tokens: 300
    });

    const contenidoRespuesta = respuesta.choices[0].message.content;
    await message.reply(contenidoRespuesta);

    conversaciones[userId].push({
      role: "assistant",
      content: contenidoRespuesta
    });

    fs.writeFileSync(conversacionesPath, JSON.stringify(conversaciones, null, 2));
  } catch (error) {
    console.error("⚠️ Error IA:", error);
    await message.reply("Nyaa~ hubo un error procesando tu mensajito 💔");
  }
}

// ⚡ Manejador global de errores
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// 🚀 Iniciar sesión
client.login(TOKEN)
  .then(() => console.log("🌟 Iniciando sesión en Discord..."))
  .catch(err => console.error("❌ Error al iniciar sesión en Discord:", err));
