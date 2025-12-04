// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";
import fetch from "node-fetch";

// ============================
// Carga de environment
// ============================
import { config } from "dotenv";
config();

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
// Cargar comandos desde cmd.json
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
// Registrar comandos
// ============================
async function registerSlashCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log("🚀 Registrando slash commands en Discord...");
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: slashCommands }
        );
        console.log("✔ Slash commands registrados correctamente.");
    } catch (error) {
        console.error("❌ Error registrando comandos:", error);
    }
}

// ============================
// IA LongCat
// ============================
async function longcatAI(message) {
    try {
        console.log("🧠 IA LongCat activada para mensaje:", message);

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
// IA por mensajes (ARREGLADO PARA MULTI-SERVIDOR)
// ============================
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    // Softi responde si la mencionan o dicen su nombre
    const mentionRegex = new RegExp(`<@!?${client.user.id}>|\\bsofti\\b`, "i");
    const triggered = mentionRegex.test(msg.content);

    // Si NO la mencionaron y NO es DM, no responde
    if (!triggered && msg.channel.type !== 1) return;

    const aiResponse = await longcatAI(msg.content);

    try {
        await msg.reply(aiResponse);
    } catch (err) {
        console.error("❌ Error respondiendo con IA:", err);
    }
});

// ============================
// SERVIDOR con PÁGINA REAL
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
