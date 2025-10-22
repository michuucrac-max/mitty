// 🌸 Softi-Tales Bot 🌸
// Totalmente estable para Render + Node 22 + discord.js v14
// Incluye IA, detección de imágenes, menciones y cmds.json 💖

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import OpenAI from "openai";
import fs from "fs";

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

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const rest = new REST({ version: "10" }).setToken(TOKEN);
client.commands = new Collection();

// ===== CARGA CMD.JSON =====
let cmds = [];
try {
  cmds = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
  cmds.forEach(cmd => client.commands.set(cmd.name, cmd));
} catch (err) {
  console.warn("⚠️ cmd.json no encontrado o vacío. Se creará uno nuevo.");
  fs.writeFileSync("./cmd.json", "[]");
}

// ===== REGISTRO COMANDOS =====
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
  } catch (e) {
    console.error("Error al registrar comandos:", e);
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
});

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
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const lower = message.content.toLowerCase();
  const mentioned = message.mentions.has(client.user) || lower.includes("softi");

  // ===== Canal de configuración =====
  const configChannel = message.guild?.channels.cache.find(ch => ch.name === "softitales-config");
  if (configChannel && message.channel.id === configChannel.id) {
    const ownerRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
    if (ownerRole && message.member.roles.cache.has(ownerRole.id)) {

      // Panel /help
      if (message.content.startsWith("/help")) {
        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("💫 Panel de Configuración de Softi")
              .setDescription("Configura a Softi desde aquí 💕\n\n**Comandos disponibles:**\n🌸 `/help` → muestra este panel\n🌸 `/addcmd nombre descripción respuesta` → agrega un comando kawaii\n🌸 `/toggle-automod` → activa/desactiva automod\n\nSolo `owner` puede usar esto.")
              .setColor(0xffb6c1)
          ]
        });
      }

      // Crear nuevo comando
      else if (message.content.startsWith("/addcmd")) {
        const args = message.content.match(/^\/addcmd\s+(\S+)\s+"([^"]+)"\s+"([^"]+)"$/);
        if (!args) return message.reply("❌ Formato incorrecto. Usa: `/addcmd nombre \"desc\" \"respuesta\"`");

        const [, name, description, response] = args;
        if (cmds.some(c => c.name === name)) return message.reply("⚠️ Ese comando ya existe.");

        const newCmd = { name, description, response };
        cmds.push(newCmd);
        fs.writeFileSync("./cmd.json", JSON.stringify(cmds, null, 2), "utf8");
        client.commands.set(name, newCmd);
        await registerCommands();

        await message.reply(`✨ Nuevo comando \`/${name}\` agregado 💖`);
      }
    } else {
      await message.delete().catch(() => {});
      await message.author.send("❌ Solo el rol `owner` puede usar ese canal, nya~");
      return;
    }
  }

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

    if (imgs.length > 0 && (mentioned || lower.includes("softi"))) {
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
