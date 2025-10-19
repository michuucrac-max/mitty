import { Client, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import OpenAI from "openai";
import fs from "fs";
import express from "express";
import fetch from "node-fetch";

// =============================
// ⚙️ Configuración (environments)
// =============================
const TOKEN = process.env.TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!TOKEN || !OPENAI_API_KEY) {
  console.error("❌ Faltan TOKEN o OPENAI_API_KEY en los environments");
  process.exit(1);
}

// =============================
// 🧩 Inicialización del cliente
// =============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// =============================
// 📂 Cargar archivos externos
// =============================
let estados, comandos, conversaciones, memoria, seguridad;

try {
  estados = JSON.parse(fs.readFileSync("./estados.json", "utf8"));
} catch {
  estados = [{ name: "uwu esperando mensajitos 💌", type: "Playing" }];
  console.warn("⚠️ No se encontró estados.json, usando valores por defecto");
}

try {
  comandos = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
} catch {
  comandos = [];
  console.error("❌ No se pudo cargar cmd.json");
}

try {
  conversaciones = JSON.parse(fs.readFileSync("./conversaciones.json", "utf8"));
} catch {
  conversaciones = {};
}

try {
  memoria = JSON.parse(fs.readFileSync("./memoria.json", "utf8"));
} catch {
  memoria = { personalidad: "tierna y kawaii", tono: "positivo" };
}

try {
  seguridad = JSON.parse(fs.readFileSync("./security_manager.json", "utf8"));
} catch {
  seguridad = { palabras_bloqueadas: [], limite_mensajes: 5 };
}

// =============================
// 🚫 Antispam + filtro de palabras
// =============================
const userSpam = new Map();
const SPAM_LIMIT = seguridad.limite_mensajes || 5;
const SPAM_TIME = 7000;

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
  } else data.count = 1;
  data.last = ahora;
  userSpam.set(id, data);
  return false;
}

function contienePalabrasBloqueadas(texto) {
  return seguridad.palabras_bloqueadas.some(p =>
    texto.toLowerCase().includes(p.toLowerCase())
  );
}

// =============================
// 💬 Chat con OpenAI
// =============================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const canalDM = message.channel.type === 1;
  const meMencionaron = message.mentions.has(client.user.id);
  if (!canalDM && !meMencionaron) return;

  if (esSpam(message)) {
    await message.reply("⚠️ Nyah~ estás escribiendo muy rápido, toma un respiro 💭");
    return;
  }

  if (contienePalabrasBloqueadas(message.content)) {
    await message.reply("🚫 Nyaa~ eso contiene palabras no permitidas...");
    return;
  }

  const id = message.author.id;
  if (!conversaciones[id]) conversaciones[id] = [];

  conversaciones[id].push({ rol: "user", contenido: message.content });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres Softti Tales, un bot kawaii y positivo. Habla con ternura y dulzura, usando emojis lindos 💖"
        },
        ...conversaciones[id].map(m => ({
          role: m.rol === "user" ? "user" : "assistant",
          content: m.contenido
        }))
      ],
    });

    const respuesta = completion.choices[0]?.message?.content || "Nya~ no entendí 😿";
    conversaciones[id].push({ rol: "assistant", contenido: respuesta });
    fs.writeFileSync("./conversaciones.json", JSON.stringify(conversaciones, null, 2));

    await message.reply(respuesta);
  } catch (error) {
    console.error("❌ Error con OpenAI:", error);
    await message.reply("😿 Algo salió mal con OpenAI, nyan~");
  }
});

// =============================
// 🧩 Slash Commands
// =============================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const comando = comandos.find(c => c.name === interaction.commandName);
  if (!comando) return;

  try {
    const userMention = `<@${interaction.user.id}>`;
    const target = interaction.options.getUser("usuario");
    const targetMention = target ? `<@${target.id}>` : "alguien";
    const respuesta = comando.response
      .replace("{user}", userMention)
      .replace("{target}", targetMention);

    await interaction.reply(respuesta);
  } catch (err) {
    console.error("❌ Error ejecutando comando:", err);
    await interaction.reply({ content: "Error ejecutando el comando.", ephemeral: true });
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
    client.user.setActivity(estado.name, { type: ActivityType[estado.type] || ActivityType.Playing });
    i++;
  }, 300000); // cada 5 min
});

// =============================
// 💤 Limpieza de conversaciones
// =============================
setInterval(() => {
  conversaciones = {};
  fs.writeFileSync("./conversaciones.json", JSON.stringify(conversaciones, null, 2));
  console.log("♻️ Conversaciones reiniciadas");
}, 10 * 60 * 1000);

// =============================
// 🚀 KeepAlive
// =============================
const app = express();
app.get("/", (_, res) => res.send("✨ Softti Tales activo 24/7 💖"));
app.listen(3000, () => console.log("🌐 KeepAlive activo"));

setInterval(() => {
  fetch("https://softti-tales.onrender.com").catch(() => {});
}, 4 * 60 * 1000);

// =============================
// 🔑 Login
// =============================
client.login(TOKEN)
  .then(() => console.log("✨ Softti Tales está online UwU"))
  .catch(err => console.error("❌ Error al iniciar sesión:", err));
