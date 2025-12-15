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
import http from "http";

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
partials: [Partials.Channel]
});

client.commands = new Collection();

// =====================
// cargar comandos
// =====================
const rawCmds = JSON.parse(fs.readFileSync("cmd.json", "utf8"));
const slashCommands = [];

for (const cmd of rawCmds) {
slashCommands.push({
name: cmd.name,
description: cmd.description,
options: [{
name: "target",
description: "Menciona a alguien",
type: 6,
required: true
}]
});
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
"Eres Softi, una IA kawaii y amable. Hablas de forma dulce y tierna, sin exagerar."
},
...history
]
})
}
);

const data = await res.json();
let respuesta = data?.choices?.[0]?.message?.content ?? "Entendido.";

respuesta = respuesta.replace(/\*/g, "");

history.push({ role: "assistant", content: respuesta });
memory.set(userId, history.slice(-10));

return respuesta;
}

// =====================
// TOS SERVIDOR
// =====================
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
"Para usar Softi debes aceptar los términos:\n\n" +
"https://terminosycondicionesdeserv.jimdofree.com/"
);

const button = new ButtonBuilder()
.setCustomId("aceptoTOS")
.setLabel("Aceptar")
.setStyle(ButtonStyle.Success);

await channel.send({
embeds: [embed],
components: [new ActionRowBuilder().addComponents(button)]
});
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
});

// =====================
// MENSAJES
// =====================
client.on("messageCreate", async msg => {
if (msg.author.bot) return;

// ===== LOG GLOBAL (UNA SOLA VEZ)
try {
const log = await client.channels.fetch(LOG_CHANNEL);
if (log) {
log.send(
`Nuevo mensaje
Usuario: ${msg.author.tag} (${msg.author.id})
Origen: ${msg.guild?.name ?? "DM"}

Contenido:
${msg.content || "(sin texto)"}`
);
}
} catch {}

// ===== MD
if (msg.channel.isDMBased()) {
if (!memory.has(msg.author.id)) {
memory.set(msg.author.id, []);
await msg.reply(
"Al hablar conmigo aceptas mis Términos de Servicio:\n" +
"https://terminosycondicionesdeserv.jimdofree.com/"
);
return;
}

const ai = await longcatAI(msg.content, msg.author.id);
return msg.reply(ai);
}

// ===== SERVIDORES
if (!msg.content.toLowerCase().includes("softi")) return;

const ai = await longcatAI(msg.content, msg.author.id);
msg.reply(ai);
});

// =====================
// 24/7 Render
// =====================
http.createServer((_, res) => {
res.end("Softi activa");
}).listen(process.env.PORT || 3000);

// =====================
client.login(TOKEN);
