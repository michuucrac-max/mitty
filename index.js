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

import {
    handleCommand,
    handleButton
} from "./logic.js";

/* =========================================================
   RUTAS
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   VARIABLES DE ENTORNO
========================================================= */

const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT || 3000;
const OWNER_ID = process.env.OWNER_ID;
const GIF_TOKEN = process.env.GIF_TOKEN;

const PREFIX = "m;";

/* =========================================================
   COMPROBACIONES
========================================================= */

if (!TOKEN) {
    console.error("[MITTY] ❌ Falta la variable TOKEN.");
    process.exit(1);
}

if (!GIF_TOKEN) {
    console.error("[MITTY] ❌ Falta la variable GIF_TOKEN.");
    process.exit(1);
}

/* =========================================================
   CARGAR JSON
========================================================= */

function loadJSON(fileName, fallback = {}) {
    const filePath = path.join(__dirname, fileName);

    try {
        if (!fs.existsSync(filePath)) {
            console.warn(
                `[MITTY] ⚠️ ${fileName} no existe. Usando valor predeterminado.`
            );

            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(filePath, "utf8")
        );

    } catch (error) {
        console.error(
            `[MITTY] ❌ Error leyendo ${fileName}:`,
            error
        );

        return fallback;
    }
}

/* =========================================================
   ARCHIVOS
========================================================= */

const commands = loadJSON("cmd.json", {});
const config = loadJSON("config.json", {});

let status = loadJSON("status.json", {
    statuses: [
        "🌸 Explorando el Abismo",
        "🐾 Jugando con Nanachi",
        "💗 Ayudando a mis amigos"
    ],
    thinking: [
        "💭 ¿Qué habrá por aquí?",
        "💭 Me pregunto qué estarán haciendo...",
        "💭 ¡Tengo una idea!"
    ]
});

/* =========================================================
   ESTADOS
========================================================= */

let statusIndex = 0;
let thinkingIndex = 0;

function getNextStatus() {
    if (
        !Array.isArray(status.statuses) ||
        status.statuses.length === 0
    ) {
        return "🌸 Explorando el Abismo";
    }

    const value = status.statuses[statusIndex];

    statusIndex =
        (statusIndex + 1) %
        status.statuses.length;

    return value;
}

function getNextThinking() {
    if (
        !Array.isArray(status.thinking) ||
        status.thinking.length === 0
    ) {
        return "💭 ¿Qué habrá por aquí?";
    }

    const value = status.thinking[thinkingIndex];

    thinkingIndex =
        (thinkingIndex + 1) %
        status.thinking.length;

    return value;
}

/* =========================================================
   RECARGAR STATUS
========================================================= */

function reloadStatus() {
    const newStatus = loadJSON(
        "status.json",
        {
            statuses: [],
            thinking: []
        }
    );

    status = newStatus;

    statusIndex = 0;
    thinkingIndex = 0;

    console.log(
        "[MITTY] 🔄 status.json recargado."
    );
}

/* =========================================================
   CLIENTE DISCORD
========================================================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* =========================================================
   BOT LISTO
========================================================= */

client.once(
    Events.ClientReady,
    readyClient => {

        console.log(
            `[MITTY] ✅ Conectada como ${readyClient.user.tag}`
        );

        readyClient.user.setPresence({
            activities: [
                {
                    name: getNextStatus(),
                    type: ActivityType.Custom
                }
            ],
            status: "online"
        });

        /* Cambiar estado cada 30 segundos */

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
    }
);

/* =========================================================
   MENSAJES / COMANDOS
========================================================= */

client.on(
    Events.MessageCreate,
    async message => {

        /* Ignorar otros bots */

        if (message.author.bot) {
            return;
        }

        /* =================================================
           PREFIJO
           Ahora acepta:
           m;help
           M;help
           m;HELP
           M;HELP
        ================================================= */

        const contentLower =
            message.content.toLowerCase();

        if (!contentLower.startsWith(PREFIX)) {
            return;
        }

        const content =
            message.content
                .slice(PREFIX.length)
                .trim();

        if (!content) {
            return;
        }

        const parts =
            content.split(/\s+/);

        const commandName =
            parts
                .shift()
                .toLowerCase();

        const args = parts;

        try {

            await handleCommand({
                message,
                commandName,
                args,
                commands,
                config,
                prefix: PREFIX,
                ownerId: OWNER_ID,
                getNextStatus,
                getNextThinking,
                reloadStatus
            });

        } catch (error) {

            console.error(
                "[MITTY] ❌ Error en MessageCreate:",
                error
            );

            await message.reply(
                "🐾 ¡Ay! Algo salió mal mientras intentaba hacer eso."
            ).catch(() => {});
        }
    }
);

/* =========================================================
   BOTONES
========================================================= */

client.on(
    Events.InteractionCreate,
    async interaction => {

        if (!interaction.isButton()) {
            return;
        }

        try {

            await handleButton(interaction);

        } catch (error) {

            console.error(
                "[MITTY] ❌ Error manejando botón:",
                error
            );

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {

                await interaction.reply({
                    content:
                        "❌ Ocurrió un error con este botón.",
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
);

/* =========================================================
   SERVIDOR WEB
========================================================= */

const app = express();

app.get("/", (req, res) => {
    res.send("🐾 Mitty está en línea.");
});

app.listen(PORT, () => {

    console.log(
        `[MITTY] 🌐 Servidor activo en el puerto ${PORT}.`
    );
});

/* =========================================================
   KEEP ALIVE
   Mantiene activo el servidor HTTP de Mitty
========================================================= */

const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000; // 5 minutos

setInterval(async () => {
    try {
        const response = await fetch(
            `http://127.0.0.1:${PORT}/`
        );

        if (response.ok) {
            console.log(
                "[MITTY] 💓 Keep-alive: servidor activo."
            );
        } else {
            console.warn(
                `[MITTY] ⚠️ Keep-alive respondió ${response.status}.`
            );
        }

    } catch (error) {
        console.error(
            "[MITTY] ❌ Error en keep-alive:",
            error.message
        );
    }

}, KEEP_ALIVE_INTERVAL);

/* =========================================================
   LOGIN
========================================================= */

client.login(TOKEN);
