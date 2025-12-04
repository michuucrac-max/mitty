// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fetch from "node-fetch";
import { config } from "dotenv";
config();

// ============================
// VARIABLES DE ENTORNO
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
// COMANDOS DEFINIDOS AQUÍ MISMO
// ============================
const rawCmds = [
    {
        name: "besar",
        description: "Softi hace que le des un beso a alguien",
        response: "{player} besa suavemente a {target} 💋💞"
    },
    {
        name: "abrazo",
        description: "Softi te ayuda a abrazar a alguien",
        response: "{player} le da un abrazo tierno a {target} 🤗💗"
    }
];

const slashCommands = rawCmds.map(cmd => ({
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
}));

for (const cmd of rawCmds) {
    client.commands.set(cmd.name, cmd);
}

console.log(`✔ Comandos cargados: ${rawCmds.length}`);

// ============================
// REGISTRO DE COMANDOS
// ============================
async function registerSlashCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log("🚀 Registrando slash commands…");
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: slashCommands }
        );
        console.log("✔ Slash commands registrados.");
    } catch (err) {
        console.error("❌ Error registrando comandos:", err);
    }
}

// ============================
// IA LONGCAT
// ============================
async function longcatAI(message) {
    try {
        const systemPrompt = `
Eres Softi, una IA kawaii, femenina, dulce, suave y tierna.
Habla con estilo uwu ligero, sin exagerarlo.
Nada de lenguaje infantil extremo.
        `;

        const body = {
            model: "LongCat-Flash-Chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 700,
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

        return data?.choices?.[0]?.message?.content ||
            "Softi no entendió, pero te manda un abracito uwu 💞";

    } catch (err) {
        return "Ay… algo salió mal, vuelve a intentarlo uwu 💗";
    }
}

// ============================
// READY
// ============================
client.once(Events.ClientReady, async () => {
    console.log(`✨ Softi encendida como: ${client.user.tag}`);

    await registerSlashCommands();

    client.user.setPresence({
        activities: [{ name: "Softi Tales 24/7 ✨", type: 3 }],
        status: "idle"
    });

    console.log("💫 Softi está lista con IA.\n");
});

// ============================
// MANEJO DE SLASH COMMANDS
// ============================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    const player = interaction.user;
    const target = interaction.options.getUser("target");

    let response = cmd.response
        .replaceAll("{player}", `<@${player.id}>`)
        .replaceAll("{user}", `<@${player.id}>`)
        .replaceAll("{target}", `<@${target.id}>`);

    await interaction.reply(response);
});

// ============================
// IA EN MENSAJES
// ============================
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    const mentionRegex = new RegExp(`<@!?${client.user.id}>|\\bsofti\\b`, "i");
    const triggered = mentionRegex.test(msg.content);

    if (!triggered && msg.channel.type !== 1) return;

    const aiResponse = await longcatAI(msg.content);
    await msg.reply(aiResponse);
});

// ============================
// SERVIDOR PARA RENDER
// ============================
import http from "http";

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Softi está activa 24/7 💞");
}).listen(PORT, () =>
    console.log(`🌐 Servidor activo en puerto ${PORT}`)
);

// ============================
// LOGIN
// ============================
client.login(TOKEN);
console.log("🔑 Iniciando sesión...\n");
