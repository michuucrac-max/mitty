// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";
import fetch from "node-fetch";

// =====================
// MEMORY
// =====================
const memory = new Map();

// =====================
// ENV
// =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const LONGCAT_API = process.env.LONGCAT_API;

// Canal donde se envían logs de Info servidores
const LOG_CHANNEL = "1430331682749419640";

// =====================
// Cliente
// =====================
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

const res = await fetch("https://api.longcat.chat/openai/v1/chat/completions", {
method: "POST",
headers: {
"Authorization": `Bearer ${LONGCAT_API}`,
"Content-Type": "application/json"
},
body: JSON.stringify({
model: "LongCat-Flash-Chat",
messages: [
{ role: "system", content: "Eres Softi kawaii…" },
...history
]
})
});

const data = await res.json();
const respuesta = data?.choices?.[0]?.message?.content ?? "UwU";

history.push({ role: "assistant", content: respuesta });
memory.set(userId, history.slice(-10));

return respuesta;
}

// =====================
// rotación estados
// =====================
let estados = [];
try { estados = JSON.parse(fs.readFileSync("estados.json", "utf8")); }
catch { estados = ["💞 Softi uwu"] }

setInterval(() => {
const texto = estados[Math.floor(Math.random() * estados.length)];
client.user?.setPresence({
activities: [{ name: texto, type: 3 }],
status: "online"
});
}, 120000);

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
console.log(`✨ Logged as ${client.user.tag}`);

await registerSlashCommands();

client.user.setPresence({
activities: [{ name: "Softi Tales ✨", type: 3 }],
status: "idle"
});

setTimeout(() => {
infoSofti();
enviarEstadisticasCompletas();
}, 6000);
});

// =====================
// slash commands
// =====================
client.on(Events.InteractionCreate, async (interaction) => {
if (!interaction.isChatInputCommand()) return;

const cmd = client.commands.get(interaction.commandName);
if (!cmd) return;

const player = interaction.user;
const target = interaction.options.getUser("target");

const response = cmd.response
.replaceAll("{user}", `<@${player.id}>`)
.replaceAll("{target}", `<@${target?.id}>`);

interaction.reply(response);
});

// =====================
// mensajes (IA)
// =====================
let mensajesServidor = 0;
let mensajesMD = 0;

client.on("messageCreate", async (msg) => {
if (msg.author.bot) return;

if (msg.channel.type === 1) mensajesMD++;
else mensajesServidor++;

// ========== TOS DM ==========
if (msg.channel.type === 1) {
  if (!memory.get(msg.author.id)) {
    memory.set(msg.author.id, []); // marca

    try {
      await msg.reply(
        "Hola uwu 💗 antes de seguir quiero que sepas que al hablarme aceptas mis **Términos de Servicio**:\n\n" +
        "🔗 https://terminosycondicionesdeserv.jimdofree.com/\n\n" +
        "Gracias por usarme uwu 💞"
      );
    } catch {}

    return;
  }
}

// SOLO servidores deben decir softi
if (msg.channel.type !== 1) {
  if (!msg.content.toLowerCase().includes("softi")) return;
}

const ai = await longcatAI(msg.content, msg.author.id);
msg.reply(ai);
});

// =====================
// servidor render 24/7
// =====================
const http = await import("http");
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
res.end("Softi activa 24/7");
}).listen(PORT);

// =====================
// INFO SERVIDORES
// =====================
async function infoSofti() {
try {
const canal = await client.channels.fetch(LOG_CHANNEL);
if (!canal) return;

let text = `🌸 Softi — Información actual 🌸\n\n`;  
text += `🧸 Estoy en: ${client.guilds.cache.size} servidores\n\n`;  

for (const guild of client.guilds.cache.values()) {  

  // 🔥 link permanente del server
  const guildLink = `https://discord.com/channels/${guild.id}`;

  let invite = "Sin permiso";
  try {
    if (guild.systemChannelId) {
      const inv = await guild.invites.create(guild.systemChannelId, {reason:"stats"});
      invite = inv.url;
    }
  } catch {}

  text += `✨ ${guild.name}
ID: ${guild.id}
Miembros: ${guild.memberCount}
Servidor: ${guildLink}
${invite}

`;  
}  

await canal.send(text);

} catch {}
}
setInterval(infoSofti, 300000);

// =====================
// ESTADÍSTICAS COMPLETAS
// =====================
async function enviarEstadisticasCompletas() {
try {
const canal = await client.channels.fetch(LOG_CHANNEL);
if (!canal) return;

const setUsuarios = new Set();  
client.guilds.cache.forEach(g => {  
  g.members.cache.forEach(m => {  
    if (!m.user.bot) setUsuarios.add(m.user.id);  
  });  
});  

await canal.send({  
  embeds: [{  
    title: "📊 Info completa Softi",  
    color: 0xffa4e0,  
    fields: [  
      { name: "Usuarios únicos", value: `${setUsuarios.size}` },  
      { name: "Mensajes Servidores", value: `${mensajesServidor}` },  
      { name: "Mensajes MD", value: `${mensajesMD}` },
      { name: "Ver Usuarios", value: Array.from(setUsuarios).slice(0,20).map(u=>`https://discord.com/users/${u}`).join("\n") || "vacío" }
    ]  
  }]  
});

} catch {}
}
setInterval(enviarEstadisticasCompletas, 300000);

// =====================
client.login(TOKEN);
