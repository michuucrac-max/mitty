const {
    Client,
    GatewayIntentBits,
    ActivityType,
    Events
} = require("discord.js");

const express = require("express");
const fs = require("fs");
const path = require("path");

// ============================================================
// CONFIGURACIÓN
// ============================================================

const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT || 3000;
const OWNER_ID = process.env.OWNER_ID;

const PREFIX = "m;";

if (!TOKEN) {
    console.error("❌ No se encontró la variable de entorno TOKEN.");
    process.exit(1);
}

// ============================================================
// ARCHIVOS
// ============================================================

const BASE_PATH = __dirname;

const CMD_PATH = path.join(BASE_PATH, "cmd.json");
const GIFS_PATH = path.join(BASE_PATH, "gifs.json");
const STATUS_PATH = path.join(BASE_PATH, "status.json");
const CONFIG_PATH = path.join(BASE_PATH, "config.json");

// ============================================================
// CARGADOR JSON
// ============================================================

function loadJSON(filePath, fallback = {}) {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(
                `⚠️ No se encontró ${path.basename(filePath)}`
            );

            return fallback;
        }

        const data = fs.readFileSync(filePath, "utf8");

        return JSON.parse(data);

    } catch (error) {
        console.error(
            `❌ Error leyendo ${path.basename(filePath)}:`,
            error.message
        );

        return fallback;
    }
}

// ============================================================
// DATOS
// ============================================================

const commands = loadJSON(CMD_PATH, {});
const gifs = loadJSON(GIFS_PATH, {});
const config = loadJSON(CONFIG_PATH, {});

let statusData = loadJSON(STATUS_PATH, {
    statuses: [
        "🐾 Mitty está dando vueltecitas..."
    ],

    thinking: [
        "¿En qué estás pensando?"
    ]
});

// ============================================================
// VALIDACIÓN DE STATUS.JSON
// ============================================================

if (!Array.isArray(statusData.statuses)) {
    console.warn(
        "⚠️ status.json no tiene una lista válida de 'statuses'."
    );

    statusData.statuses = [
        "🐾 Mitty está dando vueltecitas..."
    ];
}

if (!Array.isArray(statusData.thinking)) {
    console.warn(
        "⚠️ status.json no tiene una lista válida de 'thinking'."
    );

    statusData.thinking = [
        "¿En qué estás pensando?"
    ];
}

// ============================================================
// LOGIC
// ============================================================

let logic = {};

try {
    logic = require("./logic.js");

    console.log("✅ logic.js conectado.");
} catch (error) {
    console.warn("⚠️ logic.js todavía no está disponible.");
    console.warn(error.message);
}

// ============================================================
// CLIENTE DISCORD
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ============================================================
// ÍNDICES DE ROTACIÓN
// ============================================================

let statusIndex = 0;
let thinkingIndex = 0;

// ============================================================
// OBTENER ESTADO
// ============================================================

function getNextStatus() {
    if (statusData.statuses.length === 0) {
        return "🐾 Mitty está aquí...";
    }

    const status = statusData.statuses[statusIndex];

    statusIndex++;

    if (statusIndex >= statusData.statuses.length) {
        statusIndex = 0;
    }

    return status;
}

// ============================================================
// OBTENER "¿EN QUÉ ESTÁS PENSANDO?"
// ============================================================

function getNextThinking() {
    if (statusData.thinking.length === 0) {
        return "¿En qué estás pensando?";
    }

    const thinking = statusData.thinking[thinkingIndex];

    thinkingIndex++;

    if (thinkingIndex >= statusData.thinking.length) {
        thinkingIndex = 0;
    }

    return thinking;
}

// ============================================================
// ESTADO DE MITTY
// ============================================================

function updateStatus() {
    if (!client.user) return;

    const status = getNextStatus();

    client.user.setPresence({
        status: "online",

        activities: [
            {
                name: "Mitty",
                type: ActivityType.Custom,
                state: status
            }
        ]
    });

    console.log(`🐾 Estado: ${status}`);
}

// ============================================================
// RECARGAR STATUS.JSON
// ============================================================
//
// Esto permite modificar status.json mientras el bot está
// funcionando. No hace falta reiniciar Mitty.
//

function reloadStatus() {
    statusData = loadJSON(STATUS_PATH, {
        statuses: [
            "🐾 Mitty está aquí..."
        ],

        thinking: [
            "¿En qué estás pensando?"
        ]
    });

    if (!Array.isArray(statusData.statuses)) {
        statusData.statuses = [
            "🐾 Mitty está aquí..."
        ];
    }

    if (!Array.isArray(statusData.thinking)) {
        statusData.thinking = [
            "¿En qué estás pensando?"
        ];
    }

    console.log("🔄 status.json recargado.");
}

// ============================================================
// MENSAJES
// ============================================================

client.on(Events.MessageCreate, async (message) => {
    try {
        if (message.author.bot) return;

        const content = message.content.trim();

        // Mitty solamente procesa mensajes con m;
        if (!content.toLowerCase().startsWith(PREFIX)) {
            return;
        }

        const commandContent = content
            .slice(PREFIX.length)
            .trim();

        if (!commandContent) return;

        const args = commandContent.split(/\s+/);

        const commandName = args
            .shift()
            .toLowerCase();

        console.log(
            `🐾 ${message.author.tag} → ${PREFIX}${commandName}`
        );

        // ====================================================
        // HELP
        // ====================================================

        if (commandName === "help") {

            if (typeof logic.handleHelp === "function") {

                return await logic.handleHelp(
                    message,
                    commands,
                    PREFIX
                );
            }

            return message.reply(
                "🐾 Mi sistema de ayuda todavía está despertando... 💗"
            );
        }

        // ====================================================
        // RELOAD STATUS
        // ====================================================

        // Solo para el dueño del bot.
        if (
            commandName === "reloadstatus" &&
            message.author.id === OWNER_ID
        ) {

            reloadStatus();

            return message.reply(
                "✨ ¡Listo! Recargué `status.json`."
            );
        }

        // ====================================================
        // LOGIC.JS
        // ====================================================

        if (typeof logic.handleCommand === "function") {

            return await logic.handleCommand({
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
        }

        // ====================================================
        // COMANDO DESCONOCIDO
        // ====================================================

        return message.reply(
            `🐾 No conozco \`${PREFIX}${commandName}\`... ` +
            `Prueba \`${PREFIX}help\`. ✨`
        );

    } catch (error) {

        console.error(
            "❌ Error procesando mensaje:",
            error
        );

        if (!message.replied && !message.deferred) {

            await message.reply(
                "🐾 A-ah... algo salió mal. Dame un momentito... 💦"
            ).catch(() => {});
        }
    }
});

// ============================================================
// BOT LISTO
// ============================================================

client.once(
    Events.ClientReady,
    (readyClient) => {

        console.log("");
        console.log("========================================");
        console.log("🐾 MITTY ESTÁ DESPIERTO");
        console.log("========================================");

        console.log(
            `💗 Usuario: ${readyClient.user.tag}`
        );

        console.log(
            `🌸 Servidores: ${readyClient.guilds.cache.size}`
        );

        console.log(
            `✨ Prefix: ${PREFIX}`
        );

        console.log(
            `📝 Estados cargados: ${statusData.statuses.length}`
        );

        console.log(
            `💭 Pensamientos cargados: ${statusData.thinking.length}`
        );

        console.log("========================================");
        console.log("");

        // Estado inicial
        updateStatus();

        // Cambiar estado cada 30 segundos
        setInterval(
            updateStatus,
            30 * 1000
        );
    }
);

// ============================================================
// SERVIDOR WEB
// ============================================================

const app = express();

app.get("/", (req, res) => {

    res.send(
        "🐾 Mitty está despierto y haciendo cositas. 💗"
    );
});

app.listen(PORT, () => {

    console.log(
        `🌐 Servidor web activo en el puerto ${PORT}`
    );
});

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
