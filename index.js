import { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType, Partials } from "discord.js";
import fs from "fs";
import path from "path";
import express from "express";
import { watchBotFiles } from "./autoupdate.js"; // 👈 autoupdate activo

// =============================
// CONFIGURACIÓN DEL CLIENTE
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

client.commands = new Collection();
const TOKEN = process.env.TOKEN; // usando environments, no .env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// =============================
// MANTENER ACTIVO EN RENDER
// =============================
const app = express();
app.get("/", (_, res) => res.send("🌐 KeepAlive activo"));
app.listen(3000, () => console.log("🌐 KeepAlive activo"));

// =============================
// CARGAR COMANDOS DESDE cmd.json
// =============================
let comandos = [];
try {
  const data = fs.readFileSync("./cmd.json", "utf8");
  comandos = JSON.parse(data);
  console.log(`✅ ${comandos.length} comandos cargados desde cmd.json`);
} catch (err) {
  console.error("❌ No se pudo cargar cmd.json:", err);
}

// Registrar slash commands
const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registrarComandos() {
  try {
    const data = comandos.map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      options: [
        {
          name: "usuario",
          description: "Menciona a alguien",
          type: 6, // Usuario
          required: false
        }
      ]
    }));

    await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: data });
    console.log("✨ Comandos registrados correctamente.");
  } catch (err) {
    console.error("❌ Error al registrar comandos:", err);
  }
}

// =============================
// ESTADOS DINÁMICOS
// =============================
let estados = [];
try {
  estados = JSON.parse(fs.readFileSync("./estados.json", "utf8"));
} catch (err) {
  console.error("❌ Error cargando estados.json:", err);
  estados = ["💤 Softti Tales cuidando usuarios", "🌸 Soy tu bot kawaii", "🦊 Siempre contigo~"];
}

function actualizarEstado() {
  const servidores = client.guilds.cache.size;
  const usuarios = client.users.cache.size;
  const random = estados[Math.floor(Math.random() * estados.length)];
  const reemplazado = random
    .replace("{servidores}", servidores)
    .replace("{usuarios}", usuarios);

  client.user.setPresence({
    activities: [{ name: reemplazado, type: ActivityType.Playing }],
    status: "online"
  });
}

// =============================
// ANTI-SPAM
// =============================
const usuariosSpam = new Map();

function controlarSpam(message) {
  if (message.author.bot) return;
  const ahora = Date.now();
  const data = usuariosSpam.get(message.author.id) || { msgs: [], strikes: 0 };

  data.msgs = data.msgs.filter(t => ahora - t < 4000);
  data.msgs.push(ahora);

  if (data.msgs.length > 6) {
    data.strikes++;
    data.msgs = [];
    if (data.strikes >= 3) {
      message.member.timeout(3600000, "Spam detectado (1h)").catch(() => {});
      message.author.send("🚫 Fuiste expulsado temporalmente (1h) por spam.").catch(() => {});
      data.strikes = 0;
    } else {
      message.author.send(`⚠️ Advertencia ${data.strikes}/3 — evita el spam, nyan~`);
    }
  }

  usuariosSpam.set(message.author.id, data);
}

// =============================
// EVENTOS PRINCIPALES
// =============================
client.once("ready", async () => {
  console.log(`✨ Softti Tales está online UwU`);
  console.log(`🐾 Conectado como ${client.user.tag}`);

  await registrarComandos();
  actualizarEstado();
  setInterval(actualizarEstado, 60 * 1000);

  watchBotFiles(client); // 👀 activar autoupdate
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const comando = comandos.find(c => c.name === interaction.commandName);
  if (!comando) return;

  const targetUser = interaction.options.getUser("usuario");
  const user = interaction.user;
  const response = comando.response
    .replace("{user}", user.username)
    .replace("{target}", targetUser ? targetUser.username : "alguien");

  await interaction.reply({ content: response, ephemeral: false }).catch(() => {});
});

// =============================
// CHAT IA (en canal chat-bot)
// =============================
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  controlarSpam(message);

  const canalIA = ["chat-bot", "bot-chat"];
  if (canalIA.includes(message.channel.name)) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres Softti, una IA kawaii, tierna, tipo furry y con energía kwai. Habla siempre de forma dulce, con emojis, uwu y estilo cálido."
          },
          { role: "user", content: message.content }
        ]
      });

      const respuesta = completion.choices[0].message.content;
      await message.reply({ content: respuesta || "Nyaa~ no entendí eso 💞" });
    } catch (err) {
      console.error("❌ Error IA:", err);
      await message.reply("Nyaa~ tuve un error procesando eso 💔");
    }
  }
});

client.login(TOKEN).catch(err => {
  console.error("❌ Error al iniciar sesión:", err);
});
