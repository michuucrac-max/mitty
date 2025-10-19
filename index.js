import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ActivityType } from "discord.js";
import OpenAI from "openai";
import fs from "fs";
import express from "express";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("🌐 KeepAlive activo"));
app.listen(PORT, () => console.log("🌐 KeepAlive activo"));

const TOKEN = process.env.TOKEN;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let comandos = [];
let estados = [];

// Cargar comandos
if (fs.existsSync("./cmd.json")) {
  comandos = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
  console.log(`✅ ${comandos.length} comandos cargados.`);
} else {
  console.error("❌ No se encontró cmd.json");
}

// Cargar estados
if (fs.existsSync("./estados.json")) {
  estados = JSON.parse(fs.readFileSync("./estados.json", "utf8"));
  console.log(`✅ ${estados.length} estados cargados.`);
} else {
  estados = ["Cuidando servidores 💖", "Ronroneando en la nube ☁️", "Esperando abrazos UwU"];
}

// Sistema de comandos slash
client.commands = new Collection();
const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registrarComandos() {
  const slashCommands = comandos.map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: [
      {
        name: "target",
        type: 6,
        description: "Usuario objetivo",
        required: false
      }
    ]
  }));

  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
    console.log("✅ Comandos /softti registrados correctamente.");
  } catch (err) {
    console.error("❌ Error registrando comandos:", err);
  }
}

// Estado dinámico kawaii
function actualizarEstado() {
  if (estados.length === 0) return;
  const guilds = client.guilds.cache.size;
  const users = client.users.cache.size;
  const random = estados[Math.floor(Math.random() * estados.length)]
    .replace("{servers}", guilds)
    .replace("{users}", users);
  client.user.setActivity(random, { type: ActivityType.Playing });
}
setInterval(actualizarEstado, 30000);

// 🦊 Mensaje privado kawaii la primera vez
const usuariosConMensaje = new Set();

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  // Si mencionan al bot por primera vez
  if (message.mentions.has(client.user) && !usuariosConMensaje.has(message.author.id)) {
    usuariosConMensaje.add(message.author.id);
    try {
      await message.author.send(
        `Hii~ soy **Softti Tales** 💖\nSoy tu bot furry/uwu. Puedes usar mis comandos con **/softti...** en este server.\n\nAlgunos ejemplos:\n• /softihug\n• /softikiss\n• /softicuddle\n\n¡Vamos a divertirnos, nya~ 🦊💕!`
      );
    } catch (err) {
      console.error("❌ No pude enviar DM:", err);
    }
  }

  // IA en canal #chat-bot o por DM
  if (
    message.channel.type === 1 || // DM
    message.channel.name === "chat-bot"
  ) {
    try {
      const respuesta = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres Softti Tales, una IA furry kawaii que habla con muchos uwu y nya~. Sé dulce, amigable y juguetona. Usa emojis y habla con energía y ternura."
          },
          { role: "user", content: message.content }
        ],
        max_tokens: 100
      });

      const texto = respuesta.choices[0].message.content;
      await message.reply(`${texto} ✨`);
    } catch (err) {
      console.error("❌ Error IA:", err);
    }
  }
});

// Slash commands uwu
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = comandos.find(c => c.name === interaction.commandName);
  if (!cmd) return;

  const target = interaction.options.getUser("target") || interaction.user;
  const respuesta = cmd.response
    .replace("{user}", interaction.user.username)
    .replace("{target}", target.username);

  try {
    await interaction.reply({ content: respuesta, ephemeral: false });
  } catch (err) {
    console.error("❌ Error ejecutando comando:", err);
  }
});

client.once("clientReady", async () => {
  console.log(`🐾 Softti Tales conectado como ${client.user.tag}`);
  await registrarComandos();
  actualizarEstado();
});

client.login(TOKEN).catch(err => console.error("❌ Error al iniciar sesión:", err));
