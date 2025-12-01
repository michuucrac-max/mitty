// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";

// ============================
// Carga de environment
// ============================
import { config } from "dotenv";
config({ path: "./environments" });

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;

// ============================
// Configuración (Softitales)
// ============================
import { handleGuildConfigMessage } from "./softitales-config.js";

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

    client.user.setPresence({
        activities: [
            { name: "Softi Tales 24/7 ✨", type: 3 }
        ],
        status: "idle"
    });
});

// ============================
// Soporte para Softitales-config
// ============================
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    // Procesa comandos como /automod, /addcmd, /addai, etc
    const usedConfig = await handleGuildConfigMessage(message.guild.id, message);

    // Si fue un comando de configuración, no continuar
    if (usedConfig) return;
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
