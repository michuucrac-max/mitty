// 🌸 Softi-Tales Bot COMPLETO 🌸
// Node 22 + Discord.js v14 + IA kawaii + AutoMod + configuración por servidor

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder } from "discord.js";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import keepAlive from "./server.js";
import { watchBotFiles } from "./autoupdate.js";
import { checkMessage } from "./automod.js";

// ===== CONFIG =====
const TOKEN = process.env.TOKEN || "TU_TOKEN_DISCORD_AQUI";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "TU_TOKEN_OPENAI_AQUI";

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

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const rest = new REST({ version: "10" }).setToken(TOKEN);
client.commands = new Collection();

// ===== UTILIDADES SERVIDOR =====
function getServerPath(guildId) {
  const dir = path.join("./servers", guildId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function loadServerJSON(guildId, fileName, defaultValue = {}) {
  const filePath = path.join(getServerPath(guildId), fileName);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveServerJSON(guildId, fileName, data) {
  const filePath = path.join(getServerPath(guildId), fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ===== CARGA CMD GLOBAL =====
let globalCmds = [];
try {
  globalCmds = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
  globalCmds.forEach(cmd => client.commands.set(cmd.name, cmd));
} catch {
  fs.writeFileSync("./cmd.json", "[]");
}

// ===== REGISTRO COMANDOS SLASH =====
async function registerCommands() {
  const allCmds = globalCmds.map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: [{
      name: "usuario",
      description: "El usuario objetivo 💞",
      type: 6,
      required: true
    }]
  }));
  allCmds.push({
    name: "softihelp",
    description: "Muestra todos los comandos kawaii"
  });
  allCmds.push({
    name: "softihelpmod",
    description: "Muestra comandos solo para owners"
  });

  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: allCmds });
    console.log("✅ Comandos slash registrados correctamente");
  } catch (e) {
    console.error("❌ Error registrando comandos:", e);
  }
}

// ===== READY =====
client.once("ready", async () => {
  console.log(`🌸 Softi está en línea como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "💖 dando amor en todo el servidor~", type: 0 }],
    status: "online"
  });
  await registerCommands();
  watchBotFiles(client);
  keepAlive();
});

// ===== INTERACCIONES =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const guildId = interaction.guildId || "dm";
  const serverCmds = loadServerJSON(guildId, "cmd.json", {});
  const name = interaction.commandName;

  // --- /softihelp ---
  if (name === "softihelp") {
    let desc = "**Comandos kawaii:**\n";
    Object.keys(serverCmds).forEach(c => desc += `🌸 /${c} → ${serverCmds[c]}\n`);
    globalCmds.forEach(c => desc += `🌸 /${c.name} → ${c.description}\n`);
    await interaction.reply({ content: desc, ephemeral: true });
    return;
  }

  // --- /softihelpmod ---
  if (name === "softihelpmod") {
    const ownerRole = interaction.guild?.roles.cache.find(r => r.name.toLowerCase() === "owner");
    if (!ownerRole || !interaction.member.roles.cache.has(ownerRole.id)) {
      await interaction.reply("❌ Solo owners pueden ver esto uwu");
      return;
    }
    let desc = "**Comandos de admin + cmd kawaii:**\n";
    Object.keys(serverCmds).forEach(c => desc += `🌸 /${c} → ${serverCmds[c]}\n`);
    globalCmds.forEach(c => desc += `🌸 /${c.name} → ${c.description}\n`);
    await interaction.reply({ content: desc, ephemeral: true });
    return;
  }

  // --- COMANDOS normales ---
  const cmd = serverCmds[name] || client.commands.get(name)?.response;
  if (cmd) {
    const target = interaction.options.getUser("usuario");
    const resp = cmd.replace?.("{user}", interaction.user.username).replace?.("{target}", target?.username || "");
    await interaction.reply(resp);
  }
});

// ===== MENSAJES =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const guildId = message.guildId || "dm";
  const serverCmds = loadServerJSON(guildId, "cmd.json", {});
  const serverMem = loadServerJSON(guildId, "memoria.json", {});
  const serverConfig = loadServerJSON(guildId, "config.json", { automodEnabled: true });

  const lower = message.content.toLowerCase();
  const mentioned = message.mentions.has(client.user) || lower.includes("softi");

  // ===== Canal softitales-config solo para owners =====
  const configChannel = message.guild?.channels.cache.find(ch => ch.name === "softitales-config");
  const ownerRole = message.guild?.roles.cache.find(r => r.name.toLowerCase() === "owner");
  const isOwner = ownerRole && message.member.roles.cache.has(ownerRole.id);

  if (configChannel && message.channel.id === configChannel.id) {
    if (!isOwner) {
      await message.delete().catch(() => {});
      await message.author.send("❌ Solo owners pueden usar este canal, nya~");
      return;
    }

    if (message.content.startsWith("/softihelpmod")) {
      let desc = "**Comandos de administración y comandos kawaii:**\n";
      Object.keys(serverCmds).forEach(c => desc += `🌸 /${c} → ${serverCmds[c]}\n`);
      globalCmds.forEach(c => desc += `🌸 /${c.name} → ${c.description}\n`);
      await message.reply(desc);
      return;
    }

    if (message.content.startsWith("/softiaddcmd")) {
      const args = message.content.match(/^\/softiaddcmd\s+(\S+)\s+"([^"]+)"$/);
      if (!args) return message.reply("❌ Uso: /softiaddcmd nombre \"respuesta\"");
      const [, name, resp] = args;
      serverCmds[name] = resp;
      saveServerJSON(guildId, "cmd.json", serverCmds);
      await registerCommands();
      await message.reply(`✨ Comando \`/${name}\` agregado 💖`);
      return;
    }

    if (message.content.startsWith("/automod")) {
      const args = message.content.split(" ");
      if (args[1] === "on") serverConfig.automodEnabled = true;
      if (args[1] === "off") serverConfig.automodEnabled = false;
      saveServerJSON(guildId, "config.json", serverConfig);
      await message.reply(`✅ AutoMod ${serverConfig.automodEnabled ? "activado" : "desactivado"} para este servidor`);
      return;
    }
  }

  // ===== Revisión AutoMod =====
  if (serverConfig.automodEnabled && await checkMessage(message)) return;

  // ===== DMs o menciones =====
  if (!message.guild || mentioned) {
    await handleAIResponse(message);
    return;
  }

  // ===== Imágenes =====
  if (message.attachments.size > 0) {
    const imgs = Array.from(message.attachments.values())
      .filter(a => a.contentType?.startsWith("image/"))
      .map(a => a.url);

    if (imgs.length > 0 && mentioned) {
      await message.react("🌸").catch(() => {});
      await message.react("💞").catch(() => {});
      await handleAIResponse(message, imgs);
    }
  }
});

// ===== RESPUESTA IA =====
async function handleAIResponse(message, imgs = []) {
  try {
    let prompt = "Eres Softi, una IA kawaii, dulce y alegre. Usa emojis suaves y habla con ternura.";
    if (imgs.length > 0) prompt += ` Describe o comenta las imágenes con dulzura: ${imgs.join(", ")} 💕`;

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
