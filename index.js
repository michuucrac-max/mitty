// 🌸 Softi-Tales Bot — versión final con autoupdate integrado
import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import keepAlive from "./server.js";
import { checkMessage } from "./automod.js";

// ===== CONFIGURACIÓN =====
const TOKEN = process.env.TOKEN || "TU_TOKEN_DISCORD_AQUI";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "TU_TOKEN_OPENAI_AQUI";

// ===== CLIENTE DISCORD =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessageReactions
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

client.commands = new Collection();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ===== AUTOUPDATE =====
const watchDir = './'; // raíz del bot
fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  if (filename.endsWith(".js") || filename.endsWith(".json")) {
    console.log(`🌀 Detectado cambio en: ${filename}`);
    try {
      const filePath = path.resolve(filename);
      delete require.cache[require.resolve(filePath)];
      if (filename.endsWith(".json")) console.log(`🔁 Archivo JSON actualizado: ${filename}`);
      else import(filePath + "?update=" + Date.now())
        .then(() => console.log(`✨ Módulo recargado: ${filename}`))
        .catch(err => console.error(`❌ Error recargando ${filename}:`, err));
    } catch (err) { console.error("❌ Error en autoupdate:", err); }
  }
});
console.log("👀 Autoupdate activo — cambios en JS/JSON se recargan sin reinicio");

// ===== FUNCIONES DE SERVIDORES =====
function ensureServerFolder(guildId) {
  const dir = `./servers/${guildId}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function loadServerJSON(guildId, fileName, defaultData) {
  const dir = ensureServerFolder(guildId);
  const filePath = path.join(dir, fileName);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveServerJSON(guildId, fileName, data) {
  const dir = ensureServerFolder(guildId);
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ===== READY =====
client.once("ready", async () => {
  console.log(`🌸 Softi está en línea como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "💖 dando amor kawaii a todos~", type: 0 }],
    status: "online"
  });
  keepAlive();
});

// ===== MENSAJES =====
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const guildId = message.guild?.id;

  // ===== AUTO-MOD =====
  if (guildId && await checkMessage(message)) return;

  // ===== CANAL CONFIGURACIÓN SOLO OWNER =====
  const configChannel = message.guild?.channels.cache.find(ch => ch.name === "softitales-config");
  const ownerRole = message.guild?.roles.cache.find(r => r.name.toLowerCase() === "owner");
  const isOwner = ownerRole && message.member?.roles.cache.has(ownerRole.id);

  if (configChannel && message.channel.id === configChannel.id) {
    if (!isOwner) {
      await message.delete().catch(() => {});
      await message.author.send("❌ Solo los Owners pueden usar este canal, nya~");
      return;
    }

    const args = message.content.trim().split(" ");
    const serverCmds = loadServerJSON(guildId, "cmd.json", []);
    const serverBehaviors = loadServerJSON(guildId, "aiBehaviors.json", {});

    // Panel de ayuda
    if (args[0] === "/help") {
      const embed = {
        color: 0xffb6c1,
        title: "🌸 Panel de configuración Softi 🌸",
        description: "Hola Owner~ 💖 Aquí puedes administrar Softi en tu servidor.",
        fields: [
          { name: "⚙️ AutoMod", value: "`/automod on|off` — activa o desactiva" },
          { name: "💬 Comandos", value: "`/addcmd nombre respuesta` — agrega un comando kawaii" },
          { name: "🧠 Comportamientos IA", value: "`/addai palabra respuesta` — agrega respuestas de la IA" },
          { name: "💻 Funciones JS", value: "`/addfunc nombre {codigo}` — funciones personalizadas" }
        ],
        footer: { text: "Softi-Tales v1.3.1 💞" }
      };
      await message.reply({ embeds: [embed] });
      return;
    }

    // Agregar comando
    if (args[0] === "/addcmd") {
      const name = args[1];
      const response = args.slice(2).join(" ");
      if (!name || !response) return message.reply("⚠️ Uso correcto: `/addcmd nombre respuesta`");
      serverCmds.push({ name, description: response, response });
      saveServerJSON(guildId, "cmd.json", serverCmds);
      await message.reply(`✨ Comando **/${name}** agregado kawaii 💖`);
      return;
    }

    // Agregar comportamiento IA
    if (args[0] === "/addai") {
      const trigger = args[1];
      const response = args.slice(2).join(" ");
      if (!trigger || !response) return message.reply("⚠️ Uso: `/addai palabra respuesta`");
      serverBehaviors[trigger.toLowerCase()] = response;
      saveServerJSON(guildId, "aiBehaviors.json", serverBehaviors);
      await message.reply(`🧠 Comportamiento IA **${trigger}** agregado kawaii 💖`);
      return;
    }
  }

  // ===== CANAL CHAT-BOT =====
  const chatBotChannel = message.guild?.channels.cache.find(ch => ch.name === "chat-bot");
  if (chatBotChannel && message.channel.id === chatBotChannel.id) {
    const serverCmds = loadServerJSON(guildId, "cmd.json", []);
    if (message.content.toLowerCase().includes("softi")) {
      let lista = "🌸 Comandos kawaii disponibles:\n";
      serverCmds.forEach(c => lista += `• ${c.name} — ${c.description}\n`);
      await message.reply(lista);
      return;
    }

    if (message.mentions.has(client.user)) await handleAIResponse(message, guildId);
  }

  // ===== MENCIÓN DIRECTA O DM =====
  if (!message.guild || message.mentions.has(client.user)) await handleAIResponse(message, guildId);

  // ===== Imágenes =====
  if (message.attachments.size > 0) {
    const imgs = Array.from(message.attachments.values())
      .filter(a => a.contentType?.startsWith("image/"))
      .map(a => a.url);
    if (imgs.length > 0 && (message.mentions.has(client.user) || message.content.toLowerCase().includes("softi"))) {
      await message.react("🌸").catch(() => {});
      await message.react("💞").catch(() => {});
      await handleAIResponse(message, guildId, imgs);
    }
  }
});

// ===== RESPUESTA IA =====
async function handleAIResponse(message, guildId, imgs = []) {
  try {
    const serverBehaviors = guildId ? loadServerJSON(guildId, "aiBehaviors.json", {}) : {};
    let prompt = "Eres Softi, una IA kawaii, dulce y alegre. Usa emojis suaves y habla con ternura.";

    // Comportamientos IA por palabra
    for (const [trigger, response] of Object.entries(serverBehaviors)) {
      if (message.content.toLowerCase().includes(trigger)) {
        await message.reply(response);
        return;
      }
    }

    if (imgs.length > 0) prompt += ` Describe o comenta las imágenes kawaii: ${imgs.join(", ")} 💕`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: message.content }
      ],
      temperature: 0.8
    });

    const reply = completion.choices[0]?.message?.content || "Nya~ 💖 no sé qué decir pero te quiero 💞";
    await message.reply(reply);
  } catch (err) {
    console.error("Error IA:", err);
    await message.reply("💔 Softi tuvo un problemita procesando eso~");
  }
}

// ===== LOGIN =====
client.login(TOKEN);
