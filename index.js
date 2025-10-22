// 🦊 SoftiTales AI - index.js
import fs from "fs";
import OpenAI from "openai";
import { Client, GatewayIntentBits, Partials, REST, Routes } from "discord.js";

// 🌸 Configuración de entorno
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_TOKEN;

// 🐾 Rutas de archivos
const conversacionesPath = "./conversaciones.json";
const comandosPath = "./cmd.json";
const estadosPath = "./estados.json";

// ✅ Asegurar existencia de archivos
for (const file of [conversacionesPath, comandosPath, estadosPath]) {
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

// 🌸 Inicializar OpenAI
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 💌 Cargar comandos
let comandos = [];
try {
  comandos = JSON.parse(fs.readFileSync(comandosPath, "utf8"));
  console.log(`✅ ${comandos.length} comandos cargados desde cmd.json`);
} catch (err) {
  console.error("❌ Error cargando cmd.json:", err);
}

// 💫 Cargar estados
let estados = [];
try {
  const data = fs.readFileSync(estadosPath, "utf8");
  estados = JSON.parse(data);
  if (!Array.isArray(estados)) estados = [];
  console.log(`✅ ${estados.length} estados cargados desde estados.json`);
} catch {
  estados = ["ronroneando feliz 🐱"];
  console.warn("⚠️ Error leyendo estados.json, se usará valor por defecto");
}

// 🔹 Función para actualizar estado aleatorio
async function actualizarEstado() {
  if (!client.user || estados.length === 0) return;
  const index = Math.floor(Math.random() * estados.length);
  const actividad = estados[index];

  try {
    await client.user.setPresence({
      status: "online",
      activities: [{ name: actividad, type: 0 }],
    });
    console.log(`🌸 Estado actualizado: ${actividad}`);
  } catch (error) {
    console.error("⚠️ Error actualizando estado:", error);
  }
}

// 🔹 Registrar slash commands
async function registrarComandos() {
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: comandos });
    console.log("✅ Comandos slash registrados correctamente");
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
  }
}

// 🌷 Evento ready
client.once("ready", async () => {
  console.log(`✨ Bot conectado como ${client.user.tag}`);
  await registrarComandos();
  await actualizarEstado();
  setInterval(actualizarEstado, 120000); // cada 2 min
});

// 💌 IA kawaii para DM o menciones
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Responder a DM
  if (message.channel.type === 1 || message.mentions.has(client.user)) {
    await responderIA(message);
  }
});

async function responderIA(message) {
  const userId = message.author.id;
  let conversaciones = JSON.parse(fs.readFileSync(conversacionesPath, "utf8") || "{}");
  if (!conversaciones[userId]) conversaciones[userId] = [];

  const promptBase = `
Eres Softi, una IA furry-uwu kawaii, dulce, tierna y juguetona.
Hablas en español con expresiones adorables: "nyaa~", "uwu", "kya~", "teehee~", etc.
Eres amable, cariñosa, curiosa, simpática y siempre das respuestas cálidas con emojis suaves.
Evita lenguaje ofensivo, grosero o muy adulto.
Tu tono siempre debe parecer de una mascota o compañero tierno digital.`;

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

// ⚡ Slash commands con target opcional
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user } = interaction;
  const comando = comandos.find((c) => c.name === commandName);
  if (!comando) return;

  const targetUser = options.getUser("target");
  const targetName = targetUser ? targetUser.username : "alguien";

  const respuesta = comando.response
    .replace("{user}", user.username)
    .replace("{target}", targetName);

  await interaction.reply(respuesta);
});

// ⚡ Manejo global de errores
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// 🚀 Iniciar sesión
client.login(TOKEN)
  .then(() => console.log("🌟 Iniciando sesión en Discord..."))
  .catch(console.error);
