import fs from "fs";
import fetch from "node-fetch";
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  ActivityType
} from "discord.js";
import { exec } from "child_process";
import "./autoupdate.js"; // Importamos el autoupdate

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel],
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// === 💬 Cargar comandos desde cmd.json ===
let comandos = [];
try {
  const data = fs.readFileSync("./cmd.json", "utf8");
  comandos = JSON.parse(data);
} catch (error) {
  console.error("❌ Error cargando cmd.json:", error);
}

// === 🐾 Cargar estados desde estados.json ===
let estados = [];
try {
  const data = fs.readFileSync("./estados.json", "utf8");
  estados = JSON.parse(data);
} catch (error) {
  console.error("⚠️ No se pudo cargar estados.json:", error);
  estados = ["Cuidando {users} usuarios 💕", "En {servers} servidores ✨"];
}

// === 📡 Registrar comandos ===
const rest = new REST({ version: "10" }).setToken(TOKEN);
async function registrarComandos() {
  try {
    console.log("🔧 Registrando comandos en Discord...");
    const slashCommands = comandos.map(cmd => ({
      name: cmd.name.toLowerCase(),
      description: cmd.description,
      options: [
        {
          name: "target",
          description: "El usuario objetivo",
          type: 6, // USER
          required: false
        }
      ]
    }));
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommands });
    console.log("✅ Comandos registrados correctamente.");
  } catch (error) {
    console.error("❌ Error al registrar comandos:", error);
  }
}

// === 💖 Estado dinámico ===
function cambiarEstado() {
  const estado = estados[Math.floor(Math.random() * estados.length)];
  const servers = client.guilds.cache.size;
  const users = client.users.cache.size;
  const texto = estado
    .replace("{servers}", servers)
    .replace("{users}", users);
  client.user.setActivity(texto, { type: ActivityType.Playing });
}

// === 🧠 Analizar imágenes ===
async function analizarImagen(attachment, message) {
  try {
    const url = attachment.url;
    await message.reply(`📷 ¡Veo una imagen adorable! UwU\n(${url})\n✨ Procesando...`);
  } catch (error) {
    message.reply("❌ Error al analizar la imagen.");
  }
}

// === ⚙️ Ready ===
client.once("ready", async () => {
  console.log(`✨ Softi está online como ${client.user.tag}`);
  await registrarComandos();

  cambiarEstado();
  setInterval(cambiarEstado, 15000);
});

// === 🧸 Slash commands ===
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = comandos.find(c => c.name.toLowerCase() === interaction.commandName);
  if (!cmd) return interaction.reply("❌ Comando no encontrado.");

  const target = interaction.options.getUser("target");
  const response = cmd.response
    .replace("{user}", interaction.user.toString())
    .replace("{target}", target ? target.toString() : "al aire uwu~");

  await interaction.reply(response);
});

// === 💌 Mensajes ===
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const attachment = message.attachments.first();
  if (attachment && attachment.contentType?.startsWith("image/")) {
    return analizarImagen(attachment, message);
  }

  if (message.channel.name === "chat-bot") {
    const respuestas = [
      "Nyaa~ ¡qué lindo mensaje! 💕",
      "UwU me haces sonrojar… >///<",
      "Kyaa~ ¿me hablabas a mí? ✨",
      "Awww~ eso suena tan tierno 💞"
    ];
    const random = respuestas[Math.floor(Math.random() * respuestas.length)];
    await message.reply(random);
  }

  if (message.channel.type === 1) {
    const respuestasDM = [
      "¡Hola nya~! 🐾",
      "¿Cómo estás? uwu",
      "Te mando abracitos digitales 💖"
    ];
    const random = respuestasDM[Math.floor(Math.random() * respuestasDM.length)];
    await message.reply(random);
  }
});

// === 🚀 Login ===
client.login(TOKEN);
