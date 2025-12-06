// -------------------------
//      SOFTI TALES
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";
import fetch from "node-fetch";

// MEMORY
const memory = new Map();

// ============================
// ENV
// ============================

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const LONGCAT_API = process.env.LONGCAT_API;

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
// Cargar cmds
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
// Registros
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
// IA + MEMORIA
// ============================

async function longcatAI(message, userId) {

    let chatHistory = memory.get(userId) || [];

    chatHistory.push({ role: "user", content: message });

    const systemPrompt = `
Eres Softi, una IA kawaii, furry, femenina.
Puedes responder preguntas generales usando tu conocimiento, tales como:
- quién es alguien
- qué es un juego
- qué significa algo
- qué día es hoy
- personajes famosos
- videojuegos
- animes
- fechas, historia, etc

Usa siempre tu propio conocimiento (no digas que buscas en internet).
Responde de forma tierna, clara y amigable.
Recuerda la conversación con cada usuario.
No reveles memoria interna.
    `;

    const body = {
        model: "LongCat-Flash-Chat",
        messages: [
            { role: "system", content: systemPrompt },
            ...chatHistory
        ],
        max_tokens: 1000,
        temperature: 0.7
    };

    try {
        const res = await fetch("https://api.longcat.chat/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${LONGCAT_API}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        let respuesta = data?.choices?.[0]?.message?.content || "Softi no entendió uwu";

        chatHistory.push({ role: "assistant", content: respuesta });

        memory.set(userId, chatHistory.slice(-10)); // guarda solo los últimos 10 msgs

        return respuesta;

    } catch {
        return "Ay… algo salió mal uwu 💗";
    }
}


// ============================
// READY
// ============================

client.once(Events.ClientReady, async () => {
    console.log(`✨ Softi Tales encendida como: ${client.user.tag}`);
    await registerSlashCommands();

    client.user.setPresence({
        activities: [{ name: "Softi Tales 24/7 ✨", type: 3 }],
        status: "online"
    });
});


// ============================
// Slash
// ============================

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    const player = interaction.user;
    const target = interaction.options.getUser("target");

    let response = cmd.response
        .replaceAll("{user}", `<@${player.id}>`)
        .replaceAll("{player}", `<@${player.id}>`)
        .replaceAll("{target}", `<@${target.id}>`);

    await interaction.reply(response);
});


// ============================
// Mensajes IA
// ============================

client.on("messageCreate", async msg => {
    if (msg.author.bot) return;

    const mentionRegex = new RegExp(`<@!?${client.user.id}>|\\bsofti[!:]?\\b`, "i");

    const triggered =
        mentionRegex.test(msg.content) ||
        msg.channel.type === 1;

    if (!triggered) return;

    const answer = await longcatAI(msg.content, msg.author.id);

    try {
        await msg.reply(answer);
    } catch {}
});


// ============================
// HTTP
// ============================

const http = await import("http");
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Softi funcionando");
}).listen(PORT, () => {
    console.log(`🌐 Servidor real funcionando en puerto ${PORT}`);
});


// ============================
// LOGIN
// ============================

client.login(TOKEN);
console.log("🔑 Iniciando sesión...\n");
