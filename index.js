// 🌸 Softi-Tales Bot COMPLETO 🌸
import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder } from "discord.js";
import OpenAI from "openai";
import fs from "fs";
import keepAlive from "./server.js";
import { checkMessage } from "./automod.js";

// ===== CONFIGURACIÓN =====
const TOKEN = process.env.TOKEN || process.env.TOKEN_DISCORD;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI;

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
const rest = new REST({ version: "10" }).setToken(TOKEN);

// ===== CARGA CMD.JSON =====
let cmds = [];
try {
  cmds = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
  cmds.forEach(cmd => client.commands.set(cmd.name, cmd));
} catch (err) {
  console.warn("⚠️ cmd.json no encontrado o vacío. Se creará uno nuevo.");
  fs.writeFileSync("./cmd.json", "[]");
}

// ===== ESTADOS KAWAII =====
let estados = [];
try { estados = JSON.parse(fs.readFileSync("./estados.json", "utf8")); } catch {}
function setRandomPresence() {
  if (estados.length === 0) return;
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setPresence({ activities: [{ name: estado, type: 0 }], status: "online" }).catch(() => {});
}
setInterval(setRandomPresence, 60000);

// ===== LOGIN READY =====
client.once("ready", async () => {
  console.log(`🌸 Softi está en línea como ${client.user.tag}`);
  setRandomPresence();
  await registerCommands();
});

// ===== REGISTRO COMANDOS GLOBALES =====
async function registerCommands() {
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: cmds.map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        options: [{
          name: "usuario",
          description: "El usuario objetivo 💞",
          type: 6,
          required: true
        }]
      }))
    });
    console.log("✅ Comandos slash registrados correctamente");
  } catch (e) { console.error("Error al registrar comandos:", e); }
}

// ===== CARGA DE SERVIDORES =====
function loadServerFile(guildId, file, def) {
  const dir = `./servers/${guildId}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fullPath = `${dir}/${file}`;
  if (!fs.existsSync(fullPath)) fs.writeFileSync(fullPath, JSON.stringify(def));
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function saveServerFile(guildId, file, data) {
  const dir = `./servers/${guildId}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/${file}`, JSON.stringify(data, null, 2));
}

// ===== INTERACCIONES =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  const target = interaction.options.getUser("usuario");
  const response = cmd.response
    .replace("{user}", interaction.user.username)
    .replace("{target}", target.username);

  await interaction.reply(response);
});

// ===== MENSAJES =====
const conversaciones = JSON.parse(fs.readFileSync("./conversaciones.json", "utf8") || "{}");
const memoria = JSON.parse(fs.readFileSync("./memoria.json", "utf8") || "{}");

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // --- 1) Automod ---
  if (message.guild) {
    const blocked = await checkMessage(message);
    if (blocked) return;
  }

  // --- 2) Canal Owners: softitales-config ---
  const configChannel = message.guild?.channels.cache.find(ch => ch.name === "softitales-config");
  const ownerRole = message.guild?.roles.cache.find(r => r.name.toLowerCase() === "owner");
  const isOwner = ownerRole && message.member.roles.cache.has(ownerRole.id);

  if (configChannel && message.channel.id === configChannel.id && isOwner) {
    // Softi ayuda admin
    if (message.content.startsWith("/softihelpmod")) {
      let embed = new EmbedBuilder()
        .setTitle("🌸 Comandos de Owner & Mods 🌸")
        .setDescription("Aquí están todos los comandos especiales para administradores y ajustes del servidor")
        .setColor(0xffb6c1);
      cmds.forEach(c => embed.addFields({ name: `/${c.name}`, value: c.description }));
      await message.reply({ embeds: [embed] });
      return;
    }

    // Agregar comando
    if (message.content.startsWith("/addcmd")) {
      const args = message.content.match(/^\/addcmd\s+(\S+)\s+"([^"]+)"\s+"([^"]+)"$/);
      if (!args) return message.reply("❌ Formato: `/addcmd nombre \"desc\" \"respuesta\"`");
      const [, name, description, response] = args;
      if (cmds.some(c => c.name === name)) return message.reply("⚠️ Ese comando ya existe.");
      const newCmd = { name, description, response };
      cmds.push(newCmd);
      fs.writeFileSync("./cmd.json", JSON.stringify(cmds, null, 2));
      client.commands.set(name, newCmd);
      await registerCommands();
      return message.reply(`✨ Nuevo comando \`/${name}\` agregado 💖`);
    }
  }

  // --- 3) Canal general o menciones ---
  const mentioned = message.mentions.has(client.user) || message.content.toLowerCase().includes("softi");

  if (!message.guild || mentioned) {
    // IA kawaii
    try {
      let prompt = "Eres Softi, una IA kawaii, dulce y alegre. Usa emojis suaves y habla con ternura.";
      if (message.attachments.size > 0) {
        const imgs = Array.from(message.attachments.values())
          .filter(a => a.contentType?.startsWith("image/"))
          .map(a => a.url);
        if (imgs.length > 0) prompt += ` Describe o comenta las imágenes: ${imgs.join(", ")} 💕`;
      }

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

      if (message.guild) {
        conversaciones[message.guild.id] = conversaciones[message.guild.id] || [];
        conversaciones[message.guild.id].push({ user: message.author.username, content: message.content, reply });
        fs.writeFileSync("./conversaciones.json", JSON.stringify(conversaciones, null, 2));
      }

    } catch (err) { console.error("Error IA kawaii:", err); }
  }
});

// ===== LOGIN =====
keepAlive();
client.login(TOKEN);
