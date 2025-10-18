import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// ✅ Cargar comandos desde cmd.json
let comandos = [];
try {
  const data = fs.readFileSync("./cmd.json", "utf-8");
  comandos = JSON.parse(data);
  console.log("✅ cmd.json cargado correctamente");
} catch (err) {
  console.error("⚠️ Error al leer cmd.json:", err.message);
  comandos = [];
}

// ✅ Inicializar bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
});

// ✅ Evento al iniciar
client.once("ready", () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// ✅ Responder a comandos desde cmd.json
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const contenido = message.content.toLowerCase();

  // Buscar coincidencia en los comandos del archivo JSON
  const cmd = comandos.find(c => contenido.startsWith(c.name.toLowerCase()));

  if (cmd) {
    if (cmd.image) {
      const embed = new EmbedBuilder()
        .setColor("Random")
        .setTitle(cmd.title || "✨ Softti dice:")
        .setDescription(cmd.response)
        .setImage(cmd.image);
      await message.reply({ embeds: [embed] });
    } else {
      await message.reply(cmd.response);
    }
  }
});

client.login(process.env.TOKEN);
