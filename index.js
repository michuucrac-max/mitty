// -----------------------------------------------------
//  SOFTI TALES — INDEX.JS
// -----------------------------------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";
import fetch from "node-fetch";

// ============================
// MEMORY (Memoria por usuario)
// ============================
const memory = new Map(); // key: userId, value: [{role, content}, ...]

// ============================
// ENV
// ============================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const LONGCAT_API = process.env.LONGCAT_API;

// ============================
// LOGS
// ============================
console.log("=======================================");
console.log("   SOFTI TALES — LOGS ACTIVADOS ✔");
console.log("=======================================");
console.log("TOKEN:", TOKEN ? "✔ Cargado" : "❌ Faltante");
console.log("CLIENT_ID:", CLIENT_ID ? "✔ Cargado" : "❌ Faltante");
console.log("OWNER_ID:", OWNER_ID ? "✔ Cargado" : "❌ Faltante");
console.log("LONGCAT_API:", LONGCAT_API ? "✔ Cargada" : "❌ Faltante");
console.log("=======================================\n");

// ============================
// CLIENTE
// ============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();

// ============================
// CARGAR COMANDOS
// ============================
console.log("📦 Cargando comandos desde cmd.json...");
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
console.log(`✔ Comandos cargados: ${rawCmds.length}`);

// ============================
// REGISTRO SLASH
// ============================
async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("🚀 Registrando slash commands globales...");
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: slashCommands }
    );
    console.log("✔ Slash commands globales registrados.");
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
  }
}

// ============================
// IA LONGCAT
// ============================
async function longcatAI(message, userId) {
  try {
    const history = memory.get(userId) ?? [];
    history.push({ role: "user", content: message });

    const systemPrompt = `
Eres Softi, una IA kawaii, furry, femenina, dulce y adorable.
Respondes con ternura, estilo suave, ligero modo uwu, pero SIN hablar como bebé.
No menciones errores técnicos ni del sistema.
`;

    const body = {
      model: "LongCat-Flash-Chat",
      messages: [
        { role: "system", content: systemPrompt },
        ...history
      ],
      max_tokens: 1000,
      temperature: 0.7
    };

    const res = await fetch("https://api.longcat.chat/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LONGCAT_API}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    const assistantMsg = data?.choices?.[0]?.message?.content ?? "Softi no entendió uwu 💞";

    history.push({ role: "assistant", content: assistantMsg });
    memory.set(userId, history.slice(-10));

    return assistantMsg;
  } catch (err) {
    console.error("Error LongCat:", err?.message ?? err);
    return "Ay… algo salió mal uwu 💗";
  }
}

// ============================
// ROTACIÓN ESTADOS
// ============================
let estados = [];
try {
  estados = JSON.parse(fs.readFileSync("estados.json", "utf8"));
} catch {
  estados = ["💞 Softi está contigo uwu"];
}
if (!Array.isArray(estados) || estados.length === 0) {
  estados = ["💞 Softi siempre contigo"];
}

function cambiarEstadoAuto() {
  const texto = estados[Math.floor(Math.random() * estados.length)];
  try {
    client.user.setPresence({
      activities: [{ name: texto, type: 3 }],
      status: "online"
    });
  } catch {}
}
setInterval(cambiarEstadoAuto, 120000);

// ============================
// READY
// ============================
client.once(Events.ClientReady, async () => {
  console.log(`✨ Softi Tales encendida como: ${client.user.tag}`);
  await registerSlashCommands();

  client.user.setPresence({
    activities: [{ name: "Softi Tales 24/7 ✨", type: 3 }],
    status: "idle"
  });

  setTimeout(() => {
    try { infoSofti(); } catch {}
    try { enviarEstadisticasCompletas(); } catch {}
  }, 5000);

  console.log("💫 Softi lista con IA LongCat.\n");
});

// ============================
// SLASH COMMANDS
// ============================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  const player = interaction.user;
  const target = interaction.options.getUser("target");

  let response = cmd.response
    .replaceAll("{user}", `<@${player.id}>`)
    .replaceAll("{player}", `<@${player.id}>`)
    .replaceAll("{target}", `<@${target?.id ?? "unknown"}>`);

  try {
    await interaction.reply(response);
  } catch {
    try {
      await interaction.reply({ content: "⚠ No pude ejecutar el comando…", ephemeral: true });
    } catch {}
  }
});

// ============================
// MENSAJES
// ============================
let mensajesServidor = 0;
let mensajesMD = 0;

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.channel?.type === 1) mensajesMD++;
  else mensajesServidor++;

  const mentionRegex = new RegExp(`<@!?${client.user?.id}>|\\bsofti[!:]?\\b`, "i");
  const triggered = mentionRegex.test(msg.content) || msg.channel?.type === 1;
  if (!triggered) return;

  // TOS DM ONLY ONCE
  if (msg.channel?.type === 1) {
    const exists = memory.get(msg.author.id);
    if (!exists) {
      memory.set(msg.author.id, []);
      try {
        await msg.reply(
          "H-hola nyaaa~ 💞 antes de usarme aceptas mis Términos uwu 👉👈\n\n" +
          "🔗 https://terminosycondicionesdeserv.jimdofree.com/\n\n" +
          "Gracias por cuidarme y usarme con amor uwu 💖"
        );
      } catch {}
    }
  }

  const aiResponse = await longcatAI(msg.content, msg.author.id);
  try { await msg.reply(aiResponse); } catch {}
});

// ============================
// RENDER KEEP ALIVE
// ============================
const http = await import("http");
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Softi está activa 24/7 💞");
}).listen(PORT);

// ============================
// INFO SERVIDORES
// ============================
async function infoSofti() {
  try {
    const canal = await client.channels.fetch("1430331682749419640");
    if (!canal) return;

    let texto = "🌸 **Softi — Información actual** 🌸\n\n";
    texto += `🧸 **Estoy en:** ${client.guilds.cache.size} servidores\n\n`;

    for (const [id, guild] of client.guilds.cache) {
      let invite = "No disponible";
      try {
        const invites = await guild.invites.fetch();
        if (invites.size > 0) invite = invites.first().url;
      } catch {}
      texto += `✨ **${guild.name}**\n`;
      texto += `ID: \`${guild.id}\`\n`;
      texto += `Link: ${invite}\n`;
      texto += `Miembros: ${guild.memberCount}\n\n`;
    }

    let usuarios = new Set();
    client.guilds.cache.forEach(g => {
      g.members.cache.forEach(m => {
        if (!m.user.bot) usuarios.add(m.user.username);
      });
    });

    texto += `👥 Usuarios totales: **${usuarios.size}**\n\n`;
    texto += usuarios.size > 0
      ? "👤 **Usuarios:**\n" + [...usuarios].slice(0, 30).join(", ") + (usuarios.size > 30 ? "..." : "")
      : "Ninguno";

    await canal.send(texto);

  } catch {}
}
setInterval(infoSofti, 300000);

// ============================
// ESTADÍSTICAS
// ============================
async function enviarEstadisticasCompletas() {
  try {
    const channel = client.channels.cache.get("1430331682749419640");
    if (!channel) return;

    let setUsuarios = new Set();
    client.guilds.cache.forEach(guild => {
      guild.members.cache.forEach(m => {
        if (!m.user.bot) setUsuarios.add(m.user);
      });
    });

    const totalUsuarios = setUsuarios.size;
    const nombres = [...setUsuarios].map(u => u.username).join("\n") || "Ninguno";
    const ids = [...setUsuarios].map(u => u.id).join("\n") || "Ninguno";

    const embed = {
      title: "📊 Info completa de Softi",
      color: 0xffa4e0,
      description: "Información automática uwu",
      fields: [
        { name: "👥 Usuarios únicos", value: `${totalUsuarios}` },
        { name: "📛 Nombres", value: nombres.slice(0, 950) || "no users" },
        { name: "🆔 IDs", value: ids.slice(0, 950) || "no users" },
        { name: "✉ Mensajes en Servidores", value: `${mensajesServidor}` },
        { name: "📨 Mensajes en MD", value: `${mensajesMD}` }
      ],
      footer: { text: "Softi Tales ✨" }
    };

    await channel.send({ embeds: [embed] });

  } catch {}
}
setInterval(enviarEstadisticasCompletas, 300000);

// ============================
// LOGIN
// ============================
client.login(TOKEN);
console.log("🔑 Iniciando sesión con TOKEN...\n");
