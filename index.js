// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";
import fetch from "node-fetch";

// ============================
// VARIABLES DESDE ENVIRONMENTS (Render)
// ============================

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const LONGCAT_API = process.env.LONGCAT_API;

// LOGS
console.log("=======================================");
console.log("   SOFTI TALES — LOGS ACTIVADOS ✔");
console.log("=======================================");
console.log("TOKEN:", TOKEN ? "✔ Cargado" : "❌ Faltante");
console.log("CLIENT_ID:", CLIENT_ID ? "✔ Cargado" : "❌ Faltante");
console.log("OWNER_ID:", OWNER_ID ? "✔ Cargado" : "❌ Faltante");
console.log("LONGCAT_API:", LONGCAT_API ? "✔ Cargada" : "❌ Faltante");
console.log("=======================================\n");

// ============================
// Cliente
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
// Cargar comandos desde cmd.json (archivo directo)
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
// Registrar comandos (GLOBAL)
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
// IA LongCat
// ============================
async function longcatAI(message) {
try {
console.log("🧠 IA LongCat procesando:", message);

const systemPrompt = `

Eres Softi, una IA kawaii, furry, femenina, dulce y adorable.
Respondes con ternura, estilo suave, ligero modo uwu, pero SIN hablar como bebé.
No uses lenguaje infantil extremo.
No menciones errores técnicos ni del sistema.
`;

const body = {  
        model: "LongCat-Flash-Chat",  
        messages: [  
            { role: "system", content: systemPrompt },  
            { role: "user", content: message }  
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

    if (!data.choices || !data.choices[0]?.message?.content)  
        return "Softi no entendió, pero te manda un abracito uwu 💞";  

    return data.choices[0].message.content;  

} catch {  
    return "Ay… algo salió mal, vuelve a intentarlo uwu 💗";  
}

}

// ============================
// 🚀 AGREGADO — ROTACIÓN DE ESTADOS (NO TOCÓ NADA EXISTENTE)
// ============================

let estados = [];

try {
    estados = JSON.parse(fs.readFileSync("estados.json", "utf8"));
} catch {
    console.log("⚠ No se encontró estados.json, usando estado por defecto.");
    estados = ["💞 Softi está contigo uwu"];
}

if (!Array.isArray(estados) || estados.length === 0) {
    estados = ["💞 Softi siempre contigo"];
}

function cambiarEstadoAuto() {
    const texto = estados[Math.floor(Math.random() * estados.length)];

    client.user.setPresence({
        activities: [{ name: texto, type: 3 }],
        status: "online"
    });

    console.log("🔄 Estado cambiado a:", texto);
}

// Cambiar estado cada 2 minutos
setInterval(cambiarEstadoAuto, 120000);

// ============================
// READY
// ============================
client.once(Events.ClientReady, async () => {
console.log(`✨ Softi Tales encendida como: ${client.user.tag}`);

await registerSlashCommands();  

client.user.setPresence({  
    activities: [  
        { name: "Softi Tales 24/7 ✨", type: 3 }  
    ],  
    status: "idle"  
});  

console.log("💫 Softi está lista con IA LongCat.\n");

});

// ============================
// Slash command handler
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
    .replaceAll("{target}", `<@${target.id}>`);  

try {  
    await interaction.reply(response);  
} catch {  
    interaction.reply({ content: "⚠ No pude ejecutar el comando…", ephemeral: true });  
}

});

// ============================
// IA por mensajes
// ============================
client.on("messageCreate", async (msg) => {
if (msg.author.bot) return;

const mentionRegex = new RegExp(`<@!?${client.user.id}>|\\bsofti[!:]?\\b`, "i");  
const triggered =  
    mentionRegex.test(msg.content) ||  
    msg.channel.type === 1;  

if (!triggered) return;  

const aiResponse = await longcatAI(msg.content);  

try {  
    await msg.reply(aiResponse);  
} catch {}

});

// ============================
// SERVIDOR PARA MANTENER 24/7 EN RENDER
// ============================
const http = await import("http");

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
fetch("https://example.com")
.then(r => r.text())
.then(html => {
res.writeHead(200, { "Content-Type": "text/html" });
res.end(html);
})
.catch(() => {
res.writeHead(200, { "Content-Type": "text/plain" });
res.end("Softi está activa 24/7 💞 (pero Example falló)");
});
}).listen(PORT, () => {
console.log(`🌐 Servidor real funcionando en puerto ${PORT}`);
});

// ============================
// LOGIN
// ============================
client.login(TOKEN);
console.log("🔑 Iniciando sesión con TOKEN...\n");
// ============================
//  AGREGADO — INFO DE SERVIDORES
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
                if (invites.size > 0) {
                    invite = invites.first().url;
                }
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

        texto += `👥 Usuarios totales que pueden usarme: **${usuarios.size}**\n\n`;

        texto += usuarios.size > 0
            ? "👤 **Usuarios:**\n" + [...usuarios].slice(0, 30).join(", ") + (usuarios.size > 30 ? "..." : "")
            : "No hay usuarios registrados";

        await canal.send(texto);

    } catch (err) {
        console.log("Error enviando estado", err);
    }
}

// Ejecutar cada 5 min
setInterval(infoSofti, 300000);

// Ejecutar cuando inicia
client.once(Events.ClientReady, () => {
    setTimeout(infoSofti, 5000);
});
