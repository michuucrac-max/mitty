// 🌸 index.js — Softti Tales Bot conectado a Softitales AI Core UwU
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { Client, GatewayIntentBits, Partials, ActivityType, Events } from 'discord.js';
import keepAlive from './server.js';
import { checkMessage } from './automod.js';
import { getGuildSettings, handleGuildConfigMessage, showHelpPanel } from './softitales-config.js';

keepAlive();

// --- Paths para ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Variables de entorno ---
const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID || !OWNER_ID) {
  console.error("❌ Faltan variables de entorno necesarias.");
  process.exit(1);
}

// --- Cargar comandos JSON ---
const CMD_FILE = path.join(__dirname, 'cmd.json');
let commandsData = [];
if (fs.existsSync(CMD_FILE)) commandsData = JSON.parse(fs.readFileSync(CMD_FILE, 'utf-8'));

// --- URL del core IA ---
const CORE_URL = "https://softitales-ai-core.onrender.com/ask";

// --- Cliente Discord ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// --- Función para hablar con el core IA ---
async function hablarConCore(texto, userId) {
  try {
    const res = await fetch(CORE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: texto, userId })
    });
    const data = await res.json();
    return data.reply || "Mi cabecita se desconectó UwU";
  } catch {
    return "El core está durmiendo 😿✨";
  }
}

// --- Ready + registrar comandos ---
client.once(Events.ClientReady, async () => {
  console.log(`🌸 Softti Tales ONLINE como ${client.user.tag} UwU`);

  if (commandsData.length > 0) {
    try {
      await client.application.commands.set(commandsData);
      console.log(`✅ ${commandsData.length} comandos registrados globalmente`);
    } catch (err) {
      console.error("❌ Error registrando comandos:", err);
    }
  }

  // Estado dinámico cada 1 min
  const statuses = [
    "🌸 Cuidando tu servidor",
    "💞 Protegiendo tu comunidad",
    "🐾 Softti siempre contigo UwU"
  ];
  let i = 0;
  setInterval(() => {
    client.user.setActivity(statuses[i % statuses.length], { type: ActivityType.Playing });
    i++;
  }, 60000);
});

// --- Interacciones Slash Commands ---
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandsData.find(cmd => cmd.name === interaction.commandName);
  if (!command) return;

  if (command.name === "help") {
    await showHelpPanel(interaction);
  } else {
    await interaction.reply(`Ejecutaste el comando: **${command.name}** ✅`);
  }
});

// --- Mensajes normales (Moderación + IA) ---
client.on(Events.MessageCreate, async msg => {
  if (!msg.guild || msg.author.bot) return;

  // AutoMod
  const settings = getGuildSettings(msg.guild.id);
  await checkMessage(msg, settings);

  // Comandos de configuración
  await handleGuildConfigMessage(msg);

  // Mensajes mencionando al bot → IA kawaii
  const mention = msg.mentions.has(client.user.id);
  if (mention) {
    const reply = await hablarConCore(msg.content, msg.author.id);
    await msg.reply(reply);
  }
});

// --- Login ---
client.login(TOKEN)
  .then(() => console.log("✅ Bot conectado correctamente 🥳"))
  .catch(err => console.error("❌ Error al iniciar sesión:", err));
