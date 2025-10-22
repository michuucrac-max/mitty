// 🌸 SoftiTales Bot UwU
import fs from "fs";
import path from "path";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Partials,
  Collection,
} from "discord.js";
import OpenAI from "openai";
import autoupdate from "./autoupdate.js";
import automod from "./automod.js";
import expressServer from "./server.js";
import softiConfig from "./softitales-config.js";

const __dirname = path.resolve();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// 🧠 Archivos base
const convPath = "./conversaciones.json";
const memoriaPath = "./memoria.json";
const estadosPath = "./estados.json";
const seguridadPath = "./security_manager.json";
const guildCommandsPath = "./guildcommands.json";

// Cargar datos
const conversaciones = JSON.parse(fs.readFileSync(convPath, "utf8"));
const memoria = JSON.parse(fs.readFileSync(memoriaPath, "utf8"));
const estados = JSON.parse(fs.readFileSync(estadosPath, "utf8"));
const seguridad = JSON.parse(fs.readFileSync(seguridadPath, "utf8"));
const guildCommands = fs.existsSync(guildCommandsPath)
  ? JSON.parse(fs.readFileSync(guildCommandsPath, "utf8"))
  : {};

// ✨ Cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🌐 Servidor Express para panel/estado
expressServer(client);

// 🌀 Autoupdate activo
autoupdate(client);

// 💖 Estados kawaii rotativos
function setRandomPresence() {
  const estado =
    estados[Math.floor(Math.random() * estados.length)] ||
    "ronroneando suave~ 💕";
  client.user.setPresence({
    activities: [{ name: estado, type: 0 }],
    status: "online",
  });
  console.log("🌸 Estado actualizado a:", estado);
}
setInterval(setRandomPresence, 60 * 1000);

// 🌟 Registro automático de slash commands
async function registrarComandos() {
  const commands = [
    {
      name: "softihelp",
      description: "✨ Muestra la lista de comandos kawaii del bot 💕",
    },
    {
      name: "softihelpmod",
      description: "🛡️ Muestra los comandos para moderadores 🌸",
    },
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    console.log("♻️ Eliminando comandos antiguos...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: [],
    });

    console.log("🌸 Registrando nuevos comandos /softi...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("✅ Comandos /softi registrados correctamente");
  } catch (err) {
    console.error("❌ Error al registrar comandos:", err);
  }
}

// 🐾 Evento listo
client.once("ready", async () => {
  console.log(`💖 SoftiTales está en línea como ${client.user.tag}!`);
  setRandomPresence();
  await registrarComandos();
  automod(client);
});

// 💬 Mensajes e IA kawaii
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // AutoMod (links, palabras, spam)
  if (await automod(client, message)) return;

  const canal = message.channel;
  const userId = message.author.id;
  const texto = message.content.trim();

  if (!texto) return;

  // Guardar conversación
  if (!conversaciones[userId]) conversaciones[userId] = [];
  conversaciones[userId].push({ role: "user", content: texto });

  // IA kawaii/furry
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres Softi, una IA kawaii, tierna y algo furry que usa expresiones como 'uwu', 'nya~', 'owo', 'nyan', pero también responde con coherencia y ternura. Siempre hablas de forma positiva, amable y protectora 💕",
        },
        ...conversaciones[userId].slice(-10),
      ],
    });

    const respuesta = completion.choices[0].message.content;
    await canal.send(`💬 ${respuesta}`);
    conversaciones[userId].push({ role: "assistant", content: respuesta });

    fs.writeFileSync(convPath, JSON.stringify(conversaciones, null, 2));
  } catch (err) {
    console.error("❌ Error IA:", err);
    await canal.send("💢 Nya~ hubo un errorcito con mi magia, inténtalo luego~");
  }
});

// 💬 Slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "softihelp") {
    await interaction.reply({
      content:
        "🌸 **Comandos kawaii disponibles:**\n" +
        "• `/softihelp` → Muestra esta ayuda 💖\n" +
        "• `/softihelpmod` → Ayuda para moderadores 🛡️\n" +
        "• ¡Y puedes hablar conmigo directamente! 🐾",
      ephemeral: true,
    });
  }

  if (interaction.commandName === "softihelpmod") {
    if (interaction.user.id !== process.env.OWNER_ID)
      return await interaction.reply({
        content: "🚫 Nya~ solo el dueño puede ver eso 💢",
        ephemeral: true,
      });

    await interaction.reply({
      content:
        "🛡️ **Panel de moderación Softi**\n" +
        "• Detección automática de malas palabras y spam\n" +
        "• Bloqueo de enlaces sospechosos\n" +
        "• IA integrada para asistencia mágica 🌟",
      ephemeral: true,
    });
  }
});

// 💾 Guardado seguro al salir
process.on("SIGINT", () => {
  fs.writeFileSync(convPath, JSON.stringify(conversaciones, null, 2));
  fs.writeFileSync(memoriaPath, JSON.stringify(memoria, null, 2));
  console.log("💾 Conversaciones y memoria guardadas. Cerrando bot...");
  process.exit();
});

// 🚀 Conexión
client.login(process.env.TOKEN).catch((err) => {
  console.error("❌ Error al iniciar sesión en Discord:", err);
});
