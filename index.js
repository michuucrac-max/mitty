// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  Events,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} from "discord.js";

import fs from "fs";
import fetch from "node-fetch";

// =====================
// MEMORY
// =====================
const memory = new Map();

// ====== MEMORIA DE TOS POR SERVIDOR
let tosServers = [];
try {
  tosServers = JSON.parse(fs.readFileSync("tos.json", "utf8"));
} catch {
  tosServers = [];
}

// =====================
// ENV
// =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const LONGCAT_API = process.env.LONGCAT_API;

// Canal donde se envían logs
const LOG_CHANNEL = "1430331682749419640";

// =====================
// Cliente
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();

// =====================
// cargar comandos
// =====================
const rawCmds = JSON.parse(fs.readFileSync("cmd.json", "utf8"));
const slashCommands = [];

for (const cmd of rawCmds) {
  const slash = {
    name: cmd.name,
    description: cmd.description,
    options: [
      {
        name: "target",
        description: "Menciona a alguien",
        type: 6,
        required: true
      }
    ]
  };

  slashCommands.push(slash);
  client.commands.set(cmd.name, cmd);
}

// =====================
// registrar slash
// =====================
async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: slashCommands }
  );
}

// =====================
// LongCat AI
// =====================
async function longcatAI(message, userId) {
  const history = memory.get(userId) ?? [];

  history.push({ role: "user", content: message });

  const res = await fetch(
    "https://api.longcat.chat/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LONGCAT_API}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "LongCat-Flash-Chat",
        messages: [
          {
            role: "system",
            content:
              "Eres Softi, una IA kawaii y amable. Hablas de forma dulce y tierna, usando algunos 'uwu', 'owo' y expresiones suaves. No uses demasiados emojis, no exageres, no escribas con tipografías raras, ni repitas caracteres. Mantén tu estilo adorable sin excederte."
          },
          ...history
        ]
      })
    }
  );

  const data = await res.json();
  let respuesta = data?.choices?.[0]?.message?.content ?? "Entendido.";

  // limpiar asteriscos
  respuesta = respuesta.replace(/\*/g, "");

  history.push({ role: "assistant", content: respuesta });
  memory.set(userId, history.slice(-10));

  return respuesta;
}

// =====================
// rotación estados
// =====================
let estados = [];
try {
  estados = JSON.parse(fs.readFileSync("estados.json", "utf8"));
} catch {
  estados = ["Softi activa"];
}

setInterval(() => {
  const texto = estados[Math.floor(Math.random() * estados.length)];
  client.user?.setPresence({
    activities: [{ name: texto, type: 3 }],
    status: "online"
  });
}, 120000);

// ===============================================================
// TOS PARA SERVIDOR
// ===============================================================
async function sendTOS(guild) {
  if (tosServers.includes(guild.id)) return;

  const channel =
    guild.systemChannel ||
    guild.channels.cache.find(c => c.isTextBased());

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#ffb3d9")
    .setTitle("Términos de servicio obligatorios")
    .setDescription(
      "Para utilizar a Softi en este servidor debes aceptar los términos.\n\n" +
      "Enlace: https://terminosycondicionesdeserv.jimdofree.com/"
    )
    .setFooter({ text: "Softi Tales" });

  const boton = new ButtonBuilder()
    .setCustomId("aceptoTOS")
    .setStyle(ButtonStyle.Success)
    .setLabel("Aceptar");

  const row = new ActionRowBuilder().addComponents(boton);

  await channel.send({ embeds: [embed], components: [row] });
}

client.on("interactionCreate", async i => {
  if (!i.isButton()) return;
  if (i.customId !== "aceptoTOS") return;

  if (!tosServers.includes(i.guild.id)) {
    tosServers.push(i.guild.id);
    fs.writeFileSync("tos.json", JSON.stringify(tosServers));
  }

  i.reply({ content: "TOS aceptado.", ephemeral: true });
});

client.on("guildCreate", guild => {
  setTimeout(() => sendTOS(guild), 4000);
});

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`Logged as ${client.user.tag}`);

  await registerSlashCommands();

  client.user.setPresence({
    activities: [{ name: "Softi Tales", type: 3 }],
    status: "idle"
  });
});

// =====================
// slash commands
// =====================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  const response = cmd.response
    .replaceAll("{user}", `<@${interaction.user.id}>`)
    .replaceAll(
      "{target}",
      `<@${interaction.options.getUser("target")?.id}>`
    )
    .replace(/\*/g, "");

  interaction.reply(response);
});

// =====================
// mensajes (IA)
// =====================
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  if (msg.channel.isDMBased()) {
    if (!memory.get(msg.author.id)) {
      memory.set(msg.author.id, []);
      await msg.reply(
        "Antes de continuar debes aceptar los Términos de Servicio.\n\n" +
        "https://terminosycondicionesdeserv.jimdofree.com/"
      );
      return;
    }

    const ai = await longcatAI(msg.content, msg.author.id);
    return msg.reply(ai);
  }

  if (!msg.content.toLowerCase().includes("softi")) return;

  const ai = await longcatAI(msg.content, msg.author.id);
  msg.reply(ai);
});

// =====================
client.login(TOKEN);
