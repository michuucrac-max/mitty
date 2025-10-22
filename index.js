// 🦊 SoftiTales AI - index.js //
// Versión estable y corregida por completo 💖

import fs from "fs";
import OpenAI from "openai";
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Collection,
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
const estadosPath = "./estados.json";
const comandosPath = "./cmd.json";

// Asegurar existencia
for (const file of [conversacionesPath, estadosPath]) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
}

// 🐾 Inicializar cliente Discord
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
let comandos = [];
try {
  comandos = JSON.parse(fs.readFileSync(comandosPath, "utf8"));
  console.log(`✅ ${comandos.length} comandos cargados`);
} catch (err) {
  console.error("❌ Error cargando cmd.json:", err);
}

// 🐱 Registrar slash commands
async function registrarComandos() {
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: comandos });
    console.log("✅ Comandos slash registrados correctamente");
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
  }
}

// 🐾 Función para actualizar estado dinámico
async function actualizarEstado() {
  try {
    const datosEstados = JSON.parse(fs.readFileSync(estadosPath, "utf8"));
    const estadoActual = datosEstados.estado || "online";
    const actividadActual = datosEstados.actividad || "💖 ronroneando en el servidor";

    await client.user.setPresence({
      status: estadoActual,
      activities: [{ name: actividadActual, type: 0 }],
    });

    console.log(`🌸 Presencia actualizada: ${estadoActual} - ${actividadActual}`);
  } catch (error) {
    console.error("⚠️ Error al establecer presencia:", error);
  }
}

// 🌷 Evento listo
client.once("ready", async () => {
  console.log(`✨ Bot conectado como ${client.user.tag}`);
  await actualizarEstado();
  await registrarComandos();
  setInterval(actualizarEstado, 120000); // cada 2 min
});

// 💌 Manejador IA kawaii (DM o mención)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.channel.type === "DM" || message.mentions.has(client.user)) {
    await responderIA(message);
  }
});

// 💫 Función IA con memoria kawaii
async function responderIA(message) {
  const userId = message.author.id;
  let conversaciones = JSON.parse(fs.readFileSync(conversacionesPath, "utf8") || "{}");

  if (!conversaciones[userId]) conversaciones[userId] = [];

  const promptBase = `
Eres Softi, una IA furry-uwu kawaii, dulce, tierna y juguetona.
Hablas en español con expresiones adorables: "nyaa~", "uwu", "kya~", "teehee~", etc.
Eres amable, cariñosa, curiosa, simpática y siempre das respuestas cálidas con emojis suaves.
Evita lenguaje ofensivo, grosero o muy adulto.
Tu tono siempre debe parecer de una mascota o compañero tierno digital.
Si te saludan, responde adorablemente con ternura.
Si te preguntan algo serio, sigue siendo dulce, pero también empática y respetuosa.`;

  conversaciones[userId].push({ role: "user", content: message.content });

  const mensajesIA = [
    { role: "system", content: promptBase },
    ...conversaciones[userId].slice(-10),
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

    conversaciones[userId].push({ role: "assistant", content: contenidoRespuesta });
    fs.writeFileSync(conversacionesPath, JSON.stringify(conversaciones, null, 2));
  } catch (error) {
    console.error("⚠️ Error IA:", error);
    await message.reply("Nyaa~ hubo un error procesando tu mensajito 💔");
  }
}

// ⚡ Manejar slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user } = interaction;
  const comando = comandos.find((c) => c.name === commandName);
  if (!comando) return;

  const target = options.getUser("target") || { username: "alguien" };
  const respuesta = comando.response.replace("{user}", user.username).replace("{target}", target.username);

  await interaction.reply(respuesta);
});

// ⚡ Manejo de errores globales
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// 🚀 Login
client.login(TOKEN).then(() => console.log("🌟 Iniciando sesión en Discord...")).catch(console.error);
