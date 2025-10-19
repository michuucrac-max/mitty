import { Client, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import OpenAI from "openai";
import fs from "fs";
import express from "express";
import fetch from "node-fetch";

// =============================
// ⚙️ Configuración inicial
// =============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =============================
// 📂 Cargar archivos externos
// =============================
let comandos = [];
try {
  comandos = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
  console.log(`✨ ${comandos.length} comandos cargados desde cmd.json`);
} catch {
  console.error("❌ No se pudo cargar cmd.json");
}

let estados = [];
try {
  estados = JSON.parse(fs.readFileSync("./estados.json", "utf8"));
  console.log(`🌸 ${estados.length} estados cargados desde estados.json`);
} catch {
  estados = [{ name: "uwu esperando mensajitos 💌", type: "Playing" }];
  console.warn("⚠️ No se encontró estados.json, usando valor por defecto");
}

// =============================
// 🚫 Antispam
// =============================
const userSpam = new Map();
const SPAM_LIMIT = 5;
const SPAM_TIME = 8000;

function esSpam(message) {
  const id = message.author.id;
  const ahora = Date.now();

  if (!userSpam.has(id)) {
    userSpam.set(id, { count: 1, last: ahora });
    return false;
  }

  const data = userSpam.get(id);
  if (ahora - data.last < SPAM_TIME) {
    data.count++;
    if (data.count > SPAM_LIMIT) return true;
  } else {
    data.count = 1;
  }

  data.last = ahora;
  userSpam.set(id, data);
  return false;
}

// =============================
// 💬 Chat IA kawaii (furry uwu)
// =============================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Solo responde si se le menciona o si el mensaje está en el canal "chat-bot"
  const canalIA = message.channel.name?.toLowerCase() === "chat-bot";
  const mencionada = message.mentions.has(client.user.id);
  if (!canalIA && !mencionada) return;

  if (esSpam(message)) {
    await message.reply("Nyaa~ estás escribiendo muy rápido, descansa un poquito 💖");
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres Softti Tales, una IA furry kawaii, dulce, energética y amable 💞.
Usa expresiones tipo "nya", "uwu", "nyan~" y emojis tiernos. 
Hablas con cariño, evitas temas negativos, y haces sentir cómodos a todos 💗. 
Si alguien te saluda, devuélvele el saludo con ternura.`
        },
        { role: "user", content: message.content },
      ],
    });

    const respuesta = completion.choices[0].message.content;
    await message.reply(respuesta);
  } catch (err) {
    console.error("❌ Error IA:", err);
    await message.reply("Nya~ algo salió mal, no puedo pensar bien ahora 😿");
  }
});

// =============================
// 🧩 Comandos con prefijo /softti
// =============================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith("/softti")) return;

  const args = message.content.slice("/softti".length).trim().split(/ +/);
  const comando = args.shift()?.toLowerCase();

  const cmd = comandos.find(c => c.name === comando);
  if (!cmd) return;

  try {
    const respuesta = cmd.response
      .replace("{user}", `<@${message.author.id}>`)
      .replace("{server}", message.guild?.name || "servidor");

    await message.reply(respuesta);
  } catch (err) {
    console.error(`❌ Error ejecutando ${comando}:`, err);
    await message.reply("😿 Error al ejecutar este comando");
  }
});

// =============================
// 🌈 Estados dinámicos
// =============================
client.once("ready", () => {
  console.log(`🐾 Softti Tales conectado como ${client.user.tag}`);

  let i = 0;
  setInterval(() => {
    const estado = estados[i % estados.length];
    const tipo = ActivityType[estado.type] || ActivityType.Playing;
    const servidores = client.guilds.cache.size;
    const usuarios = client.users.cache.size;
    const texto = estado.name
      .replace("{servers}", servidores)
      .replace("{users}", usuarios);
    client.user.setActivity(texto, { type: tipo });
    i++;
  }, 300000); // cambia cada 5 min
});

// =============================
// 🌐 KeepAlive
// =============================
const app = express();
app.get("/", (req, res) => res.send("✨ Softti Tales activo y kawaii 💖"));
app.listen(process.env.PORT || 3000, () => console.log("🌐 KeepAlive activo"));

setInterval(() => {
  fetch("https://softti-tales.onrender.com")
    .then(() => console.log("💖 Ping a Render exitoso"))
    .catch(() => console.log("💤 Ping falló, pero sigo viva! uwu"));
}, 4 * 60 * 1000);

// =============================
// 🚀 Login
// =============================
client.login(process.env.TOKEN)
  .then(() => console.log("✨ Softti Tales está online UwU"))
  .catch(err => console.error("❌ Error al iniciar sesión:", err));
