import 'dotenv/config';
import fs from 'fs';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events
} from 'discord.js';
import { initAutoMod, checkMessage } from './autom/automod.js';
import { getGuildSettings, handleGuildConfigMessage } from './softitales-config.js';

// =========================
// 🔧 CONFIGURACIÓN BASE
// =========================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN) {
  console.error("❌ No se encontró la variable de entorno TOKEN");
  process.exit(1);
}
if (!CLIENT_ID) {
  console.warn("⚠️ No se encontró CLIENT_ID, el registro de comandos puede fallar");
}

// =========================
// 🤖 CLIENTE DISCORD
// =========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();

// =========================
// ⚙️ CARGA DE COMANDOS
// =========================
function loadCommands() {
  client.commands.clear();
  const commandsPath = './autom/guildCommands.json';

  if (fs.existsSync(commandsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(commandsPath, 'utf8'));
      for (const [name, response] of Object.entries(data)) {
        client.commands.set(name, { execute: async (message) => message.reply(response) });
      }
      console.log(`✅ ${client.commands.size} comandos personalizados cargados.`);
    } catch (err) {
      console.error("❌ Error al leer comandos personalizados:", err);
    }
  } else {
    console.log("⚠️ No se encontraron comandos personalizados, se usará vacío.");
  }
}

// =========================
// 🧠 EVENTOS
// =========================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "Softitales 🌙", type: 0 }],
    status: "online"
  });
  initAutoMod();
  loadCommands();
});

// =========================
// 💬 MENSAJES
// =========================
client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.content || message.author.bot) return;

    // 🔐 Canal de configuración (solo "Owner")
    const guild = message.guild;
    if (guild && message.channel.name === "softitales-config") {
      const member = await guild.members.fetch(message.author.id);
      const isOwner = member.roles.cache.some(
        (r) => r.name.toLowerCase() === "owner"
      );

      if (!isOwner) return message.reply("🚫 Solo los usuarios con rol **Owner** pueden usar este canal.");

      const handled = await handleGuildConfigMessage(guild.id, message);
      if (handled) return;
    }

    // 🧩 Cargar ajustes del servidor
    const settings = await getGuildSettings(guild?.id);
    if (settings.automodEnabled) {
      const blocked = await checkMessage(message);
      if (blocked) return;
    }

    // ⚡ Slash-commands tipo texto
    if (message.content.startsWith("/")) {
      const cmd = message.content.slice(1).split(" ")[0];
      const command = client.commands.get(cmd);
      if (command) {
        await command.execute(message);
        return;
      }
    }

    // 🤖 Responder a menciones
    if (
      message.mentions.has(client.user) &&
      !message.content.includes("@everyone") &&
      !message.content.includes("@here")
    ) {
      return message.reply("💫 ¡Nya~ me has invocado! ¿Cómo puedo ayudarte?");
    }
  } catch (err) {
    console.error("❌ Error en message handler:", err);
  }
});

// =========================
// 🚪 LOGIN
// =========================
client.login(TOKEN).catch((err) => {
  console.error("❌ Error al iniciar sesión con el token:", err);
});
