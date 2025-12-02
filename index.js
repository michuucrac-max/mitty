// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";

// ============================
// Carga de environment
// ============================
import { config } from "dotenv";
config({ path: "./environments" }); // como pediste

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const LONGCAT_API = process.env.LONGCAT_API; // 🔥 agregado

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
// Evento: CLIENTREADY
// ============================
client.once(Events.ClientReady, async () => {
    console.log(`✨ Softi Tales está encendido como ${client.user.tag}`);

    await registerSlashCommands();

    // Estado kawaii
    client.user.setPresence({
        activities: [
            { name: "Softi Tales 24/7 ✨", type: 3 }
        ],
        status: "idle"
    });
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

    // Reemplazo de variables
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


// ========================================================
//  🔥 NUEVO — SOFTI RESPONDE MENSAJES + LONGCAT + BEBÉ FURRY
// ========================================================

// Probabilidad 40% de hablar como bebé furry
function softiBebeFurry(text) {
    if (Math.random() > 0.4) return text;

    return text
        .replace(/r/g, "w")
        .replace(/l/g, "w")
        .replace(/na/g, "nya")
        .replace(/no/g, "nyo")
        .replace(/ne/g, "nye")
        .replace(/ni/g, "nyi")
        + " uwu✨🐾";
}

// Generar respuesta con Longcat
async function softiLongcat(prompt) {
    try {
        const res = await fetch("https://api.longcat.ai/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${LONGCAT_API}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "longcat",
                messages: [
                    {
                        role: "user",
                        content: `Respóndeme como Softi, femenina y tierna. Mensaje: ${prompt}`
                    }
                ],
                temperature: 0.8
            })
        });

        const data = await res.json();
        if (!data?.choices) return "Softi no sabe qué decir qwq…";

        let respuesta = data.choices[0].message.content;
        return softiBebeFurry(respuesta);

    } catch (err) {
        console.error("Error Longcat:", err);
        return "Softi tuvo un errorcito… qwq 💔";
    }
}

// Evento: Softi responde mensajes normales o cuando la mencionan
client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;

    const mencionada = msg.mentions.has(client.user.id);

    // Si hablan normal en chat general o la mencionan
    if (mencionada || !msg.guild) {
        const prompt = msg.content;
        const respuesta = await softiLongcat(prompt);
        msg.reply(respuesta);
    }
});

// ============================
// Login
// ============================
client.login(TOKEN);
