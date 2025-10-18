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
    GatewayIntentBits.DirectMessages
  ],
  partials: ["CHANNEL"]
});

const prefix = "!";
const botName = "softti"; // nombre para detectar menciones

client.once("ready", () => {
  console.log(`✨ Softti Tales iniciada como ${client.user.tag}`);
});

// 💌 Detectar mensajes
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const contenido = message.content.toLowerCase();

  // 🧠 1️⃣ Responder si mencionan al bot (por nombre o @mención)
  if (
    contenido.includes(botName) ||
    message.mentions.users.has(client.user.id)
  ) {
    const respuestas = [
      "Nyaa~ ¿me llamabas, nya? 💕",
      "UwU aquí estoy, ¿qué necesitas?",
      "Miau~ Softti presente 💫",
      "¿Dijiste mi nombre? OwO",
      "¡Hola! Soy Softti, tu compañera mágica 💖"
    ];
    const random = respuestas[Math.floor(Math.random() * respuestas.length)];
    await message.reply(random);
    return;
  }

  // 🧠 2️⃣ Chat inteligente (simula una IA básica)
  const saludos = ["hola", "holi", "buenas", "hello", "hi"];
  const despedidas = ["adios", "bye", "chao", "nos vemos"];
  const estados = ["como estas", "cómo estás", "que tal", "todo bien"];
  const amor = ["te amo", "te quiero", "softti linda", "eres hermosa"];

  if (saludos.some((w) => contenido.includes(w))) {
    return message.reply(
      `Nyaa~ ¡Hola ${message.author.username}! ¿Cómo estás hoy? 🩷`
    );
  }

  if (despedidas.some((w) => contenido.includes(w))) {
    return message.reply(`Nyaa~ Adiós ${message.author.username}, cuídate 🐾`);
  }

  if (estados.some((w) => contenido.includes(w))) {
    return message.reply(
      "OwO estoy bien, gracias por preguntar 💖 ¿y tú cómo estás?"
    );
  }

  if (amor.some((w) => contenido.includes(w))) {
    return message.reply("Nyaa~ *se sonroja* yo también te quiero 💞");
  }

  // 3️⃣ Comandos de cmd.json
  if (!contenido.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const comandoNombre = args.shift().toLowerCase();
  const comando = comandos.find((c) => c.name === comandoNombre);

  if (!comando) {
    await message.reply("OwO no entiendo ese comando, nyan~ 😿");
    return;
  }

  if (comando.image) {
    const embed = new EmbedBuilder()
      .setColor(comando.color || 0xffaaff)
      .setTitle(comando.title || "")
      .setDescription(comando.response || "")
      .setImage(comando.image);
    await message.reply({ embeds: [embed] });
  } else {
    await message.reply(comando.response);
  }
});

client.login(process.env.TOKEN);
