import {
    Client,
    GatewayIntentBits,
    ActivityType,
    Events
} from "discord.js";

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { handleCommand } from "./logic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================
// CONFIGURACIÓN
// ==============================

const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT || 3000;
const OWNER_ID = process.env.OWNER_ID;

const PREFIX = "m;";

if (!TOKEN) {
    console.error("❌ Falta la variable de entorno TOKEN.");
    process.exit(1);
}

// ==============================
// ARCHIVOS
// ==============================

function loadJSON(fileName, fallback = {}) {
    const filePath = path.join(__dirname, fileName);

    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        console.error(`❌ No se pudo cargar ${fileName}:`, error);
        return fallback;
    }
}

const commands = loadJSON("cmd.json", {});
const gifs = loadJSON("gifs.json", {});
const config = loadJSON("config.json", {});
let statusData = loadJSON("status.json", {
    statuses: [],
    thinking: []
});

// ==============================
// ESTADOS
// ==============================

let statusIndex = 0;
let thinkingIndex = 0;

function getNextStatus() {
    if (!statusData.statuses?.length) {
        return "🌸 Explorando el Abismo";
    }

    const status = statusData.statuses[statusIndex];

    statusIndex = (statusIndex + 1) % statusData.statuses.length;

    return status;
}

function getNextThinking() {
    if (!statusData.thinking?.length) {
        return "💭 ¿Qué habrá por aquí?";
    }

    const thinking = statusData.thinking[thinkingIndex];

    thinkingIndex = (thinkingIndex + 1) % statusData.thinking.length;

    return thinking;
}

function reloadStatus() {
    statusData = loadJSON("status.json", {
        statuses: [],
        thinking: []
    });

    statusIndex = 0;
    thinkingIndex = 0;

    console.log("🔄 status.json recargado.");
}

// ==============================
// CLIENTE DE DISCORD
// ==============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ==============================
// BOT LISTO
// ==============================

client.once(Events.ClientReady, (readyClient) => {
    console.log(`🐾 ¡Mitty está lista como ${readyClient.user.tag}!`);

    readyClient.user.setPresence({
        activities: [
            {
                name: getNextStatus(),
                type: ActivityType.Custom
            }
        ],
        status: "online"
    });

    setInterval(() => {
        readyClient.user.setPresence({
            activities: [
                {
                    name: getNextStatus(),
                    type: ActivityType.Custom
                }
            ],
            status: "online"
        });
    }, 30000);
});

// ==============================
// MENSAJES
// ==============================

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (!message.content.toLowerCase().startsWith(PREFIX)) return;

    const content = message.content.slice(PREFIX.length).trim();

    if (!content) return;

    const args = content.split(/\s+/);
    const commandName = args.shift().toLowerCase();

    try {
        
        if (commandName === "reloadstatus") {
            if (message.author.id !== OWNER_ID) {
                return message.reply("❌ No tienes permiso para hacer eso.");
            }

            reloadStatus();

            return message.reply("🔄 He recargado mis estados.");
        }

        await handleCommand({
            message,
            commandName,
            args,
            commands,
            gifs,
            config,
            prefix: PREFIX,
            ownerId: OWNER_ID,
            getNextStatus,
            getNextThinking,
            reloadStatus
        });

    } catch (error) {
        console.error(`❌ Error ejecutando ${commandName}:`, error);

        if (!message.replied && !message.channel) return;

        await message.reply(
            "🐾 ¡Ay! Algo salió mal mientras intentaba hacer eso."
        ).catch(() => {});
    }
});

// ==============================
// SERVIDOR WEB
// ==============================

const app = express();

app.get("/", (req, res) => {
    res.send("🐾 Mitty está en línea.");
});

app.listen(PORT, () => {
    console.log(`🌐 Servidor activo en el puerto ${PORT}.`);
});

// ==============================
// LOGIN
// ==============================

client.login(TOKEN);
