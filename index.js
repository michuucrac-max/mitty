import { Client, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import OpenAI from "openai";
import fs from "fs";
import express from "express";
import fetch from "node-fetch";

// =============================
// 🧠 Cargar variables del entorno
// =============================
const TOKEN = process.env.TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!TOKEN || !OPENAI_KEY) {
  console.error("❌ Falta TOKEN o OPENAI_API_KEY en los environments");
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
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const openai = new OpenAI({ apiKey: OPENAI_KEY });

// =============================
// ⚙️ Cargar archivos externos
// =============================
const leerArchivo = (ruta, defecto) => {
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch {
    console.warn(`⚠️ No se encontró ${ruta}, usando valores por defecto`);
    return defecto;
  }
};

let estados = leerArchivo("./estados.json", [
  { name: "uwu esperando mensajitos 💌", type: "Playing" },
]);
let comandos = leerArchivo("./cmd.json", []);
let conversaciones = leerArchivo("./conversaciones.json", {});
let seguridad = leerArchivo("./security_manager.json", {
  palabras_bloqueadas: [],
  limite_mensajes: 5,
});

// =============================
// 🚫 Antispam + filtro de palabras
// =============================
const userSpam = new Map();
const SPAM_LIMIT = seguridad.limite_mensajes;
const SPAM_TIME = 7000;

function esSpam(message) {
  const id = message.author.id;
  const ahora = Date.now();

  if (!userSpam.has(id)) {
    userSpam.set(id, { count: 1, last: ahora });
    return false;
  }

  const userData = userSpam.get(id);
  if (ahora - userData.last < SPAM_TIME) {
    userData.count++;
    if (userData.count > SPAM_LIMIT) return true;
  } else {
    userData.count = 1;
  }

  userData.last = ahora;
  userSpam.set(id, userData);
  return false;
}

function contienePalabrasBloqueadas(texto) {
  return seguridad.palabras_bloqueadas.some(p =>
    texto.toLowerCase().includes(p.toLowerCase())
  );
}

// =============================
// 💬 Chat + Memoria de conversación
// =============================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content) return;

  const canalDM = message.channel.type === 1; // DM
  const meMencionaron = message.mentions.has(client.user.id);
  if (!canalDM && !meMencionaron) return; // solo si DM o la mencionan

  if (esSpam(message)) {
    await message.reply("⚠️ Nyah~ estás escribiendo muy rápido, toma un respiro 💤");
    return;
  }

  if (contienePalabrasBloqueadas(message.content)) {
    await message.reply("🚫 Nyaa~ eso contiene palabras no permitidas...");
    return;
  }

  const userId = message.author.id;
  if (!conversaciones[userId]) conversaciones[userId] = [];

  conversaciones[userId].push({ rol: "user", contenido: message.content });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres Softti Tales, una bot furry, dulce, amigable, positiva y kawaii. Habla con cariño y muchos emojis, evita temas negativos o inapropiados.",
        },
        ...conversaciones[userId].map((m) => ({
          role: m.rol === "user" ? "user" : "assistant",
          content: m.contenido,
        })),
      ],
    });

    const respuesta =
      completion.choices[0]?.message?.content || "Nya~ no entendí eso 😿";
    conversaciones[userId].push({ rol: "assistant", contenido: respuesta });
    fs.writeFileSync(
      "./conversaciones.json",
      JSON.stringify(conversaciones, null, 2)
    );

    await message.reply(respuesta);
  } catch (error) {
    console.error("❌ Error con OpenAI:", error.message);
    await message.reply("😿 Algo salió mal, nyan~");
  }
});

// =============================
// 🧩 Slash Commands
// =============================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const comando = comandos.find((c) => c.name === interaction.commandName);
  if (!comando) return;

  try {
    const target = interaction.options.getUser("usuario");
    const userMention = `<@${interaction.user.id}>`;
    const targetMention = target ? `<@${target.id}>` : "alguien";

    const respuesta = comando.response
      .replace("{user}", userMention)
      .replace("{target}", targetMention);

    await interaction.reply(respuesta);
  } catch (error) {
    console.error("❌ Error ejecutando comando:", error);
    await interaction.reply({
      content: "Error ejecutando el comando.",
      ephemeral: true,
    });
  }
});

// =============================
// 🌈 Estados dinámicos (rotación)
// =============================
client.once("ready", () => {
  console.log(`🐾 Softti Tales conectada como ${client.user.tag}`);

  let i = 0;
  setInterval(() => {
    const estado = estados[i % estados.length];
    const tipo = ActivityType[estado.type] || ActivityType.Playing;
    client.user.setActivity(estado.name, { type: tipo });
    i++;
  }, 180000); // cada 3 min

  const inicial = estados[0];
  client.user.setActivity(inicial.name, { type: ActivityType[inicial.type] });
});

// =============================
// 🔄 Reiniciar conversaciones
// =============================
setInterval(() => {
  conversaciones = {};
  fs.writeFileSync("./conversaciones.json", JSON.stringify({}, null, 2));
  console.log("♻️ Conversaciones reiniciadas");
}, 10 * 60 * 1000);

// =============================
// 🌐 KeepAlive (para Render)
// =============================
const app = express();
app.get("/", (req, res) => res.send("✨ Softti Tales activa 24/7 💖"));
app.listen(process.env.PORT || 3000, () =>
  console.log("🌐 KeepAlive activo en Render")
);

setInterval(() => {
  fetch("https://softti-tales.onrender.com")
    .then(() => console.log("💖 Ping exitoso"))
    .catch(() => console.log("💤 Ping falló, pero sigo viva! uwu"));
}, 4 * 60 * 1000);

// =============================
// 🚀 Login
// =============================
client
  .login(TOKEN)
  .then(() => console.log("✨ Softti Tales está online UwU"))
  .catch((err) => console.error("❌ Error al iniciar sesión:", err));
