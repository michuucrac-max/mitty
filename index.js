// index.js — versión final, compatible con slash commands y OpenAI kawaii/furry
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  ActivityType,
  EmbedBuilder,
} from "discord.js";
import OpenAI from "openai";

// --- Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Utilidad: leer JSON seguro
function safeReadJSON(filename, fallback = []) {
  try {
    const full = path.join(__dirname, filename);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return fallback;
  }
}

// --- Cargar configuraciones
const cmd = safeReadJSON("cmd.json", []);
const securityFile = safeReadJSON("security_manager.json", {});
const estadosFile = safeReadJSON("estados.json", []);
const conversacionesFile = safeReadJSON("conversaciones.json", {});

// --- Configuración de seguridad
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  mensajes: {
    bloqueo:
      securityFile.mensajes?.bloqueo ||
      "🚫 ¡OwO! Eso no se puede decir, {usuario} 💢",
    link:
      securityFile.mensajes?.link ||
      "🔗 ¡Nya~! No puedes mandar links, {usuario} 💖",
  },
};

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

const TOKEN = process.env.TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;

// --- Inicializar OpenAI
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Cooldowns y conversación
const conversaciones = new Map();
const COOLDOWN_SPAM = new Map();
const SPAM_LIMIT = 5;
const SPAM_INTERVAL = 4000;

// --- Filtro de seguridad
async function filtrarSeguridad(message) {
  if (message.author.bot) return false;
  const txt = message.content.toLowerCase();

  if (security.bloqueoLinks && /(https?:\/\/|discord\.gg\/|www\.)/i.test(txt)) {
    await message.delete().catch(() => {});
    await message.channel
      .send(security.mensajes.link.replace("{usuario}", message.author.username))
      .catch(() => {});
    return false;
  }

  for (const p of security.palabras) {
    if (p && txt.includes(p.toLowerCase())) {
      await message.delete().catch(() => {});
      await message.channel
        .send(
          security.mensajes.bloqueo.replace(
            "{usuario}",
            message.author.username
          )
        )
        .catch(() => {});
      return false;
    }
  }

  return true;
}

// --- Cambiar estado
function cambiarEstado() {
  if (!estadosFile.length) return;
  const e = estadosFile[Math.floor(Math.random() * estadosFile.length)];
  client.user.setActivity(e, { type: ActivityType.Playing });
}

// --- Generar respuesta AI
async function generarRespuestaAI(usuario, mensaje) {
  try {
    const historial = conversaciones.get(usuario) || [];
    historial.push({ role: "user", content: mensaje });
    if (historial.length > 15) historial.shift();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Eres Softti, un bot kawaii y tierno, con energía furry y uwu. Habla siempre de forma adorable, afectuosa y suave.",
        },
        ...historial,
      ],
      temperature: 0.9,
      max_tokens: 80,
    });

    const respuesta = completion.choices[0].message.content;
    historial.push({ role: "assistant", content: respuesta });
    conversaciones.set(usuario, historial);
    return respuesta;
  } catch (err) {
    console.error("Error con OpenAI:", err.message);
    return "Nya~ algo salió mal, lo siento uwu 💔";
  }
}

// --- Ready
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} está online~ UwU`);
  cambiarEstado();
  setInterval(cambiarEstado, 1000 * 60 * 5);

  // Registrar comandos globales
  if (cmd.length) {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    const slashCommands = cmd.map((c) => {
      const builder = new SlashCommandBuilder()
        .setName(c.name)
        .setDescription(c.description || "Comando kawaii~ uwu");
      if (c.options)
        for (const opt of c.options) {
          if (opt.type === 6)
            builder.addUserOption((o) =>
              o
                .setName(opt.name)
                .setDescription(opt.description)
                .setRequired(opt.required)
            );
        }
      return builder.toJSON();
    });
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: slashCommands,
    });
    console.log("✨ Comandos registrados correctamente.");
  }
});

// --- Slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const { commandName } = interaction;
  const cmdFound = cmd.find((c) => c.name === commandName);
  if (!cmdFound) return;

  const target = interaction.options.getUser("usuario");
  const userMention = `<@${interaction.user.id}>`;
  const targetMention = target ? `<@${target.id}>` : "uwu 💞";

  const respuesta = cmdFound.response
    .replace("{user}", userMention)
    .replace("{target}", targetMention);

  await interaction.reply(respuesta);
});

// --- Mensajes normales y DMs
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const ok = await filtrarSeguridad(message);
  if (!ok) return;

  const userId = message.author.id;
  const now = Date.now();
  const spamData = COOLDOWN_SPAM.get(userId) || [];
  const nuevos = spamData.filter((t) => now - t < SPAM_INTERVAL);
  nuevos.push(now);
  COOLDOWN_SPAM.set(userId, nuevos);
  if (nuevos.length > SPAM_LIMIT) return;

  // Mensajes DM o mención directa
  if (message.channel.type === 1 || message.mentions.has(client.user)) {
    const respuesta = await generarRespuestaAI(userId, message.content);
    await message.reply(respuesta);
  }
});

// --- Login
client.login(TOKEN).catch((err) => {
  console.error("❌ Error al iniciar sesión:", err);
  process.exit(1);
});
