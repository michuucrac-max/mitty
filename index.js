// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";
import axios from "axios";

// ============================
// Carga de environment
// ============================
import { config } from "dotenv";
config(); // SIN CARPETAS — Render usa variables globales

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const LONGCAT_API = process.env.LONGCAT_API;

// ============================
// Cliente de Discord
// ============================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();

// ============================
// Cargar comandos desde cmd.json
// ============================
const rawCmds = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
const slashCommands = [];

// Formato tipo array (lo que usas)
for (const cmd of rawCmds) {
    const slash = {
        name: cmd.name,
        description: cmd.description,
        options: [
            {
                name: "target",
                description: "Menciona a alguien",
                type: 6, // USER
                required: true
            }
        ]
    };

    slashCommands.push(slash);
    client.commands.set(cmd.name, cmd);
}

// ============================
// Registrar comandos en Discord
// ============================
async function registerSlashCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log("Registrando slash commands…");

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: slashCommands }
        );

        console.log("Comandos registrados correctamente ✔");
    } catch (error) {
        console.error("Error registrando comandos:", error);
    }
}

// ============================
// IA de Longcat (Softi AI)
// ============================
async function softiAI(prompt, username) {
    try {
        let estilo = "actúa de forma kawaii, cariñosa y femenina";

        // 40% de probabilidad de modo bebé furry
        if (Math.random() < 0.40) {
            estilo = "habla como una bebé furry, usando uwu, onii-chan, vocecita tierna y actuando como si fuera pequeña";
        }

        const body = {
            messages: [
                {
                    role: "system",
                    content: `Eres Softi, una IA femenina. ${estilo}.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        };

        const response = await axios.post(
            "https://api.longcat.chat/v1/chat/completions",
            body,
            {
                headers: {
                    "Authorization": `Bearer ${LONGCAT_API}`,
                    "Content-Type": "application/json"
                }
            }
        );

        let text = response.data?.choices?.[0]?.message?.content || "awww creo que no entendí uwu";

        text = text.replaceAll("{player}", `<@${username}>`);

        return text;
    } catch (err) {
        console.error("Error Longcat:", err.response?.data || err);
        return "owww… mi cerebrito felino falló >~<";
    }
}

// ============================
// Detectar si mensaje coincide con cmd.json
// ============================
function esComandoDeTexto(content) {
    const texto = content.toLowerCase();
    for (const cmd of rawCmds) {
        if (texto.startsWith(cmd.name.toLowerCase())) return true;
    }
    return false;
}

// ============================
// Evento: CLIENT READY
// ============================
client.once(Events.ClientReady, async () => {
    console.log(`✨ Softi Tales está encendido como ${client.user.tag}`);

    await registerSlashCommands();

    client.user.setPresence({
        activities: [
            { name: "Softi Tales 24/7 ✨", type: 3 }
        ],
        status: "idle"
    });
});

// ============================
// IA responde mensajes normales
// ============================
client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;

    const contenido = msg.content.toLowerCase();

    const mencionada =
        msg.mentions.has(client.user.id) ||
        contenido.startsWith("softi") ||
        contenido.includes("softi!") ||
        contenido.includes("softi:") ||
        contenido.includes("softi?");

    // Evita conflicto con comandos de texto
    if (esComandoDeTexto(contenido)) return;

    if (mencionada) {
        const respuesta = await softiAI(msg.content, msg.author.id);
        return msg.reply(respuesta);
    }
});

// ============================
// Ejecutar slash commands
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
    } catch (error) {
        console.error("Error ejecutando un comando:", error);
        interaction.reply({ content: "❌ Hubo un error ejecutando este comando.", ephemeral: true });
    }
});

// ============================
// Login
// ============================
client.login(TOKEN);
