// index.js
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
} from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { checkMessage } from "./automod.js";
import { handleConfigMessage, getGuildSettings } from "./softitales-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = "TOKEN"; // <-- tu token aquí
const CLIENT_ID = "CLIENT_ID"; // <-- ID del bot
const SETTINGS_DIR = path.join(__dirname, "autom", "guildSettings");

if (!fs.existsSync(SETTINGS_DIR)) fs.mkdirSync(SETTINGS_DIR, { recursive: true });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const activeConfigs = new Map();
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`✅ Softi Tales en línea como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "uwu configurando servidores", type: 0 }],
    status: "online",
  });
});

/* 🔄 Función para registrar los slash commands del servidor */
async function registerGuildCommands(guildId, guildSettings) {
  try {
    const commands = [];

    // Agregar comandos base del bot
    commands.push({
      name: "softihelp",
      description: "Muestra la lista de comandos Softi 💖",
    });

    // Agregar comandos personalizados del servidor
    for (const cmd of guildSettings.commands || []) {
      commands.push({
        name: cmd.name.toLowerCase(),
        description: cmd.response.slice(0, 90) || "Comando Softi personalizado 💖",
      });
    }

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), {
      body: commands,
    });

    console.log(`✅ Slash commands actualizados para ${guildId}`);
  } catch (err) {
    console.error("❌ Error registrando comandos:", err);
  }
}

/* 📩 Cuando llega un mensaje */
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const guildId = message.guild.id;
  let guildSettings = activeConfigs.get(guildId);

  if (!guildSettings) {
    guildSettings = getGuildSettings(guildId);
    activeConfigs.set(guildId, guildSettings);
  }

  // 🧩 Canal de configuración
  if (message.channel.name === "softitales-config") {
    const updated = await handleConfigMessage(message, guildSettings);

    // Si hubo cambios, actualizar en memoria y registrar slash commands
    if (updated) {
      activeConfigs.set(guildId, updated);
      await registerGuildCommands(guildId, updated);
      await message.reply("⚙️ Configuración actualizada y comandos recargados uwu 💖");
    }
    return;
  }

  // 🔒 AutoMod
  if (guildSettings.automod !== false) {
    const bloqueado = await checkMessage(message);
    if (bloqueado) return;
  }

  // 🩷 Mención
  if (message.mentions.has(client.user)) {
    await message.reply("Nya~ ¿me llamaste, senpai? 💕");
  }
});

/* ⚙️ Cuando se usa un slash command */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const guildId = interaction.guildId;
  const guildSettings = activeConfigs.get(guildId) || getGuildSettings(guildId);

  // /softihelp
  if (interaction.commandName === "softihelp") {
    const cmds = (guildSettings.commands || [])
      .map((c) => `• **/${c.name}** → ${c.response}`)
      .join("\n");
    await interaction.reply({
      content:
        "✨ **Comandos disponibles:**\n" +
        cmds +
        "\n\nUsa `/nombre` para interactuar conmigo~ 💖",
      ephemeral: true,
    });
    return;
  }

  // Comandos personalizados del servidor
  const custom = (guildSettings.commands || []).find(
    (c) => c.name === interaction.commandName
  );
  if (custom) {
    const user = interaction.user.toString();
    const response = custom.response.replace(/\{user\}/g, user);
    await interaction.reply(response);
  }
});

client.login(TOKEN);
