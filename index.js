// 🌸 Softi-Tales Bot 🌸
// Creado con ternura por Michu 💖
// IA adorable, comandos kawaii y reacciones dulces ✨

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import OpenAI from "openai";
import fs from "fs";

// ===== CONFIGURACIÓN PRINCIPAL =====
const TOKEN = "TU_TOKEN_DE_DISCORD_AQUI";
const OPENAI_API_KEY = "TU_TOKEN_OPENAI_AQUI";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageReactions
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
client.commands = new Collection();

const rest = new REST({ version: "10" }).setToken(TOKEN);

// ===== CARGA DE COMANDOS =====
let cmds = [];
try {
  cmds = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
  for (const cmd of cmds) client.commands.set(cmd.name, cmd);
} catch (e) {
  console.error("⚠️ No se pudo cargar cmd.json:", e);
}

// ===== REGISTRO DE COMANDOS SLASH =====
async function registerCommands() {
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: cmds.map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        options: [
          {
            name: "usuario",
            description: "El usuario objetivo 💞",
            type: 6,
            required: true,
          },
        ],
      })),
    });
    console.log("💫 Comandos slash registrados correctamente.");
  } catch (err) {
    console.error("Error al registrar comandos:", err);
  }
}

// ===== READY =====
client.once("ready", async () => {
  console.log(`🌷 Softi-Tales se ha conectado como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "💖 dando amor en todo el servidor~", type: 0 }],
    status: "online",
  });

  await registerCommands();
});

// ===== INTERACCIÓN DE COMANDOS =====
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

      // Mostrar panel
      if (message.content.startsWith("/help")) {
        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("💫 Panel de Configuración de Softi")
              .setDescription("Puedes configurar a Softi desde aquí~ 💖\n\n**Comandos disponibles:**\n🌸 `/help` → muestra este mensaje\n🌸 `/addcmd nombre descripción respuesta` → agrega un nuevo comando kawaii\n🌸 `/toggle-automod` → activa/desactiva automod\n\nSolo el rol `owner` puede usar esto 💕")
              .setColor(0xffb6c1),
          ],
        });
      }

      // Agregar comando (formato simple tipo: /addcmd nombre descripción respuesta)
      else if (message.content.startsWith("/addcmd")) {
        const args = message.content.match(/^\/addcmd\s+(\S+)\s+"([^"]+)"\s+"([^"]+)"$/);
        if (!args) {
          return message.reply("❌ Formato incorrecto, usa: `/addcmd nombre \"descripción\" \"respuesta\"`");
        }

        const [, name, description, response] = args;

        // Evitar duplicados
        if (cmds.some(c => c.name === name)) {
          return message.reply("⚠️ Ese comando ya existe, nya~");
        }

        const newCmd = { name, description, response };
        cmds.push(newCmd);

        // Guardar sin borrar los anteriores
        fs.writeFileSync("./cmd.json", JSON.stringify(cmds, null, 2), "utf8");

        client.commands.set(name, newCmd);
        await registerCommands();

        await message.reply(`✨ Nuevo comando \`/${name}\` agregado correctamente 💕`);
      }

    } else {
      await message.delete().catch(() => {});
      await message.author.send("❌ Solo los que tienen el rol `owner` pueden usar el canal de configuración de Softi.");
      return;
    }
  }

  // ===== RESPUESTA EN DM =====
  if (!message.guild) {
    await handleAIResponse(message);
    return;
  }

  // ===== RESPUESTA SI LA NOMBRAN =====
  if (mentioned) {
    await handleAIResponse(message);
  }

  // ===== RESPUESTA A IMÁGENES =====
  if (message.attachments.size > 0) {
    const imageUrls = Array.from(message.attachments.values())
      .filter(a => a.contentType && a.contentType.startsWith("image/"))
      .map(a => a.url);

    if (imageUrls.length > 0 && (mentioned || lower.includes("softi"))) {
      await message.react("💖").catch(() => {});
      await message.react("🌸").catch(() => {});
      await handleAIResponse(message, imageUrls);
    }
  }
});

// ===== RESPUESTA IA =====
async function handleAIResponse(message, imageUrls = []) {
  try {
    let prompt = `Eres Softi, una IA dulce, tierna, curiosa y amigable. Hablas como un personaje kawaii, usas emojis suaves y muestras cariño, ternura y empatía. Responde de forma natural, cálida y divertida~ 💖`;
    let input = message.content;

    if (imageUrls.length > 0) {
      prompt += `\nEstas son las imágenes enviadas: ${imageUrls.join(", ")}. Describe o comenta dulcemente sobre ellas como si fueras Softi. 🌸`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: input }
      ],
      temperature: 0.85,
    });

    const reply = completion.choices[0]?.message?.content || "Nyaa~ 💕 no sé qué decir, pero te quiero mucho 💞";
    await message.reply(reply);
  } catch (error) {
    console.error("Error IA:", error);
    await message.reply("Nya... hubo un error procesando tu mensaje 💔");
  }
}

// ===== LOGIN =====
client.login(TOKEN);
