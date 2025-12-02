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
config({ path: "./environments" }); // como pediste

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const LONGCAT_API = process.env.LONGCAT_API; // API KEY añadida

// ============================
// Cliente de Discord
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
const rawCmds = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
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

// ============================
// Registrar Slash Commands
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
// Evento: CLIENTREADY
// ============================
client.once(Events.ClientReady, async () => {
    console.log(`✨ Softi Tales está encendido como ${client.user.tag}`);

    await registerSlashCommands();

    client.user.setPresence({
        activities: [{ name: "Softi Tales 24/7 ✨", type: 3 }],
        status: "idle"
    });
});

// ======================================
// 🔮 FUNCIÓN PARA LLAMAR A LONGCAT AI
// ======================================
async function generarRespuestaIA(mensajeUsuario) {
    try {
        // Probabilidad del 55% modo bebé furry
        const modoBebe = Math.random() < 0.55;

        const estilo = modoBebe
            ? "Responde como una bebé furry, muy adorable, habla como bebita, con tono suave, inocente y tierno. Eres Softi, una gatita kawaii femenina."
            : "Responde como una IA kawaii furry femenina, dulce, amable, con expresiones uwu pero sin exagerar.";

        const body = {
            model: "longcat",
            messages: [
                { role: "system", content: estilo },
                { role: "user", content: mensajeUsuario }
            ]
        };

        const response = await axios.post(
            "https://api.longcat.ai/v1/chat/completions",
            body,
            {
                headers: {
                    "Authorization": `Bearer ${LONGCAT_API}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error Longcat:", error.response?.data || error);
        return "Lo siento nya~ tuve un errorkito técnico ;;w;; 💔";
    }
}

// ======================================
// 💬 RESPUESTA A MENSAJES NORMALES
// ======================================

client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;

    const contenido = msg.content.toLowerCase();

    const nombrada =
        contenido.includes("softi") ||
        contenido.includes("softi!") ||
        contenido.includes("softi:") ||
        msg.mentions.has(client.user.id);

    // Si la nombran, responde con IA
    if (nombrada) {
        const respuestaIA = await generarRespuestaIA(msg.content);
        return msg.reply(respuestaIA);
    }

    // Responder a DMs con IA
    if (msg.channel.type === 1) {
        const respuestaIA = await generarRespuestaIA(msg.content);
        return msg.reply(respuestaIA);
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
