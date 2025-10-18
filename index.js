import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// 🧩 Leer comandos desde cmd.json
let comandos = [];
try {
  comandos = JSON.parse(fs.readFileSync("./cmd.json", "utf-8"));
  console.log("✅ cmd.json cargado correctamente");
} catch (err) {
  console.error("❌ Error al leer cmd.json:", err.message);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = "!";

// 🚀 Cuando el bot inicia
client.once("ready", () => {
  console.log(`✨ Softti Tales iniciada como ${client.user.tag}`);
});

// 💌 Detectar mensajes
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const comandoNombre = args.shift().toLowerCase();

  // Buscar el comando en cmd.json
  const comando = comandos.find((c) => c.name === comandoNombre);

  if (!comando) {
    await message.reply("OwO no entiendo ese comando, nyan~ 😿");
    return;
  }

  // Si tiene imagen -> usa embed
  if (comando.image) {
    const embed = new EmbedBuilder()
      .setColor(comando.color || 0xffaaff)
      .setTitle(comando.title || "")
      .setDescription(comando.response || "")
      .setImage(comando.image);
    await message.reply({ embeds: [embed] });
  } else {
    // Solo texto
    await message.reply(comando.response);
  }
});

client.login(process.env.TOKEN);
