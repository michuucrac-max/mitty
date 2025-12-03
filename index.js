// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fetch from "node-fetch";

// ============================
// Carga de environment
// ============================
import { config } from "dotenv";
config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const LONGCAT_API = process.env.LONGCAT_API;

// LOGS
console.log("=======================================");
console.log("   SOFTI TALES — LOGS ACTIVADOS ✔");
console.log("=======================================");
console.log("TOKEN:", TOKEN ? "✔ Cargado" : "❌ Faltante");
console.log("CLIENT_ID:", CLIENT_ID ? "✔ Cargado" : "❌ Faltante");
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
// Comandos embebidos SIN carpetas
// ============================

const rawCmds = [
    {
        name: "hug",
        description: "Softi da un abrazo kawaii",
        response: "<@{player}> abraza a <@{target}> uwu 💞"
    },
    {
        name: "mimi",
        description: "Softi hace mimi uwu",
        response: "Softi se acurruca con <@{player}> para hacer mimi 💗🐾"
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

rawCmds.forEach(c => client.commands.set(c.name, c));

console.log(`✔ Comandos cargados: ${rawCmds.length}`);

// ============================
// Registrar comandos
// ============================
async function registerSlashCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log("🚀 Registrando slash commands...");
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: slashCommands }
        );
        console.log("✔ Slash commands registrados.");
    } catch (error) {
        console.error("❌ Error registrando comandos:", error);
    }
}

// ============================
// IA LongCat kawaii/furry/bebé
// ============================
async function longcatAI(message) {
    try {
        const baseStyle = `
Eres Softi, una IA kawaii, furry, femenina, dulce y muy cariñosa.
Siempre hablas con ternura, energía suave y estilo uwu.
A veces ronroneas y usas palabras: nyah~, uwu, owo, peludita, patitas, mimis, etc.

55% MODO BEBÉ:
- voz pequeñita
- confusita
- mimosa
- tierna en exceso
        `;

        const babyMode = Math.random() < 0.55;

        const systemPrompt = babyMode
            ? baseStyle + "\nEstás en MODO BEBÉ furry."
            : baseStyle;

        const body = {
            model: "LongCat-Flash-Chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 1200,
            temperature: 0.9
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

        return (
            data?.choices?.[0]?.message?.content ||
            "Softi se confundió uwu… vuelve a decírmelo 💗"
        );

    } catch {
        return "Auu… Softi está mareadita, inténtalo de nuevo uwu 💫";
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

    // Canal donde hablará
    const CHANNEL_ID = "1445624436354187444";
    const channel = client.channels.cache.get(CHANNEL_ID);

    if (!channel) {
        console.log("❌ Canal no encontrado");
        return;
    }

    console.log("⏰ Softi enviará tráfico cada 2 minutos");

    // AUTOCICLO CON IA
    setInterval(async () => {
        try {
            const baseMessage = "hola <@1428140008937750568>";
            const sent = await channel.send(baseMessage);

            const aiReply = await longcatAI(baseMessage);
            await sent.reply(aiReply);

            console.log("🤖 IA auto respondió.");
        } catch (err) {
            console.error("❌ Error en ciclo:", err);
        }
    }, 2 * 60 * 1000);
});

// ============================
// Slash commands
// ============================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    const player = interaction.user;
    const target = interaction.options.getUser("target");

    const response = cmd.response
        .replaceAll("{player}", player.id)
        .replaceAll("{target}", target.id);

    await interaction.reply(response);
});

// ============================
// IA por mensajes normales
// ============================
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    const triggered =
        msg.content.toLowerCase().includes("softi") ||
        msg.mentions.has(client.user.id);

    if (!triggered) return;

    const reply = await longcatAI(msg.content);
    msg.reply(reply);
});

// ============================
// LOGIN
// ============================
client.login(TOKEN);
console.log("🔑 Iniciando sesión...\n");
