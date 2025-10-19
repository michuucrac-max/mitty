// index.js — versión completa y kawaii 💖
// Requiere discord.js v14

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Partials,
  ActivityType,
} from "discord.js";

// --- Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Leer JSON de forma segura
function safeReadJSON(filename, fallback = []) {
  try {
    const full = path.join(__dirname, filename);
    if (!fs.existsSync(full)) return fallback;
    const raw = fs.readFileSync(full, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[safeReadJSON] Error leyendo ${filename}:`, err.message);
    return fallback;
  }
}

// --- Cargar comandos desde cmd.json
const commands = safeReadJSON("cmd.json", []);
if (!commands.length) console.warn("⚠️ No se encontraron comandos en cmd.json");

// --- Crear cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// --- Configuración general
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const ACTIVITY_MESSAGES = [
  "uwu con amor 💖",
  "esperando abrazos suaves 🤗",
  "mordiendo cables virtuales 🦊",
  "soñando con caricias ✨",
  "diciendo nyaa~ 🐾",
];

// --- Antispam y link filter
const SPAM_INTERVAL = 5000; // 5 segundos
const linkRegex = /(https?:\/\/|www\.|discord\.gg\/)/i;
const userLastMessage = new Map();

// --- Registrar slash commands automáticamente
async function registerCommands() {
  try {
    if (!TOKEN || !CLIENT_ID) {
      console.error("❌ Faltan TOKEN o CLIENT_ID en environment");
      process.exit(1);
    }

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    const body = commands.map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      options: [
        {
          name: "usuario",
          description: "Menciona al usuario",
          type: 6, // USER
          required: false,
        },
      ],
    }));

    console.log("📡 Registrando comandos en Discord...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
    console.log(`✅ ${body.length} comandos registrados correctamente.`);
  } catch (err) {
    console.error("Error registrando comandos:", err);
  }
}

// --- Cambiar estado aleatoriamente
function cambiarEstado() {
  const msg =
    ACTIVITY_MESSAGES[Math.floor(Math.random() * ACTIVITY_MESSAGES.length)];
  client.user.setActivity(msg, { type: ActivityType.Playing });
}

// --- Listo
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  cambiarEstado();
  setInterval(cambiarEstado, 5 * 60 * 1000); // cambia estado cada 5 min
});

// --- Slash command handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = commands.find((c) => c.name === interaction.commandName);
  if (!cmd) return;

  const user = interaction.user;
  const target = interaction.options.getUser("usuario");

  const userMention = `<@${user.id}>`;
  const targetMention = target ? `<@${target.id}>` : "al aire~ 🌸";

  const text = cmd.response
    .replace("{user}", userMention)
    .replace("{target}", targetMention);

  await interaction.reply({
    content: text,
    allowedMentions: { users: [user.id, target?.id].filter(Boolean) },
  });
});

// --- messageCreate handler (para personalidad uwu)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // --- Filtrar links
  if (linkRegex.test(message.content)) {
    await message.delete().catch(() => {});
    await message.channel
      .send(
        `🔗 Nyaa~ no puedes enviar enlaces, ${message.author.username} uwu 💖`
      )
      .catch(() => {});
    return;
  }

  // --- Antispam simple
  const last = userLastMessage.get(message.author.id);
  const now = Date.now();
  if (last && now - last < SPAM_INTERVAL) return;
  userLastMessage.set(message.author.id, now);

  // --- Responder kawaii
  const content = message.content.toLowerCase();

  const uwuReplies = [
    "nyaa~ ¿me hablaste? 💖",
    "uwu~ aquí estoy, suavecito y esponjoso 🐾",
    "kyaaa~ me hiciste sonrojar 😳💞",
    "meow~ ¿qué pasa? 🐱",
    "h-hola... ¿quieres un abracito? 🤗",
  ];

  if (
    message.channel.type === 1 || // DM
    message.mentions.has(client.user)
  ) {
    const reply = uwuReplies[Math.floor(Math.random() * uwuReplies.length)];
    await message.reply(reply).catch(() => {});
  }
});

// --- Iniciar bot
await registerCommands();

client.login(TOKEN).catch((err) => {
  console.error("Error iniciando sesión:", err.message);
});
