// =========================================================
// 🐾 MITTY • INDEX.JS
// =========================================================

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
    handleButton,
    initializeProfiles
} from "./logic.js";


// =========================================================
// 🔐 VARIABLES DE ENTORNO
// =========================================================

const TOKEN = process.env.TOKEN;
const PORT = Number(process.env.PORT) || 3000;
const OWNER_ID = process.env.OWNER_ID;
const GIF_TOKEN = process.env.GIF_TOKEN;


// =========================================================
// ❌ COMPROBACIÓN DEL TOKEN
// =========================================================

if (!TOKEN) {
    console.error("[MITTY] ❌ Falta la variable de entorno TOKEN.");
    process.exit(1);
}


// =========================================================
// 📁 RUTAS DEL PROYECTO
// =========================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// =========================================================
// 📊 STATUS.JSON
// =========================================================

const STATUS_PATH = path.join(__dirname, "status.json");

function loadStatus() {
    try {
        if (!fs.existsSync(STATUS_PATH)) {
            console.warn("[MITTY] ⚠️ No existe status.json.");

            return {
                interval: 30000,
                statuses: []
            };
        }

        const data = fs.readFileSync(
            STATUS_PATH,
            "utf8"
        );

        const status = JSON.parse(data);

        if (!Array.isArray(status.statuses)) {
            console.warn(
                "[MITTY] ⚠️ status.json no contiene una lista válida de estados."
            );

            return {
                interval: 30000,
                statuses: []
            };
        }

        return status;

    } catch (error) {

        console.error(
            "[MITTY] ❌ Error leyendo status.json:",
            error
        );

        return {
            interval: 30000,
            statuses: []
        };
    }
}

const statusConfig = loadStatus();


// =========================================================
// 🔄 ROTACIÓN DE ESTADOS
// =========================================================

function startStatusRotation(client) {

    const statuses = statusConfig.statuses;

    if (!statuses.length) {
        console.warn(
            "[MITTY] ⚠️ No hay estados configurados."
        );

        return;
    }

    let currentIndex = 0;

    function updateStatus() {

        const status = statuses[currentIndex];

        if (!status || !status.text) {
            currentIndex++;

            if (currentIndex >= statuses.length) {
                currentIndex = 0;
            }

            return;
        }

        const activityType =
            ActivityType[status.type] ??
            ActivityType.Watching;

        client.user.setActivity(
            status.text,
            {
                type: activityType
            }
        );

        console.log(
            `[MITTY] 🔄 Estado: ${status.type} ${status.text}`
        );

        currentIndex++;

        if (currentIndex >= statuses.length) {
            currentIndex = 0;
        }
    }

    // Mostrar el primer estado inmediatamente
    updateStatus();

    const interval =
        Number(statusConfig.interval) || 30000;

    setInterval(
        updateStatus,
        interval
    );
}


// =========================================================
// 🤖 CLIENTE DE DISCORD
// =========================================================

const client = new Client({

    intents: [

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMembers,

        GatewayIntentBits.GuildMessages,

        GatewayIntentBits.MessageContent

    ]

});


// =========================================================
// 🌐 SERVIDOR EXPRESS
// =========================================================

const app = express();

app.get("/", (req, res) => {

    res.send("🐾 Mitty está online.");

});

app.listen(PORT, () => {

    console.log(
        `[MITTY] 🌐 Servidor activo en puerto ${PORT}`
    );

});


// =========================================================
// 🟢 BOT LISTO
// =========================================================

client.once(
    Events.ClientReady,
    async readyClient => {

        console.log(
            `[MITTY] 🐾 Conectado como ${readyClient.user.tag}`
        );

        // =====================================================
        // 💾 CARGAR PERFILES
        // =====================================================

        try {

            await initializeProfiles();

            console.log(
                "[MITTY] 💾 Perfiles inicializados correctamente."
            );

        } catch (error) {

            console.error(
                "[MITTY] ❌ Error inicializando perfiles:",
                error
            );

        }

        // =====================================================
        // 🔄 INICIAR ESTADOS
        // =====================================================

        startStatusRotation(readyClient);

    }
);


// =========================================================
// 💬 MENSAJES CON PREFIJO
// =========================================================

client.on(
    Events.MessageCreate,
    async message => {

        // Ignorar otros bots
        if (message.author.bot) return;

        const PREFIX = "m;";

        // Comprobar prefijo
        if (
            !message.content
                .toLowerCase()
                .startsWith(PREFIX)
        ) {
            return;
        }

        // =====================================================
        // ✂️ SEPARAR COMANDO Y ARGUMENTOS
        // =====================================================

        const content =
            message.content
                .slice(PREFIX.length)
                .trim();

        if (!content) return;

        const parts =
            content.split(/\s+/);

        const commandName =
            parts.shift()?.toLowerCase();

        const args = parts;

        if (!commandName) return;

        // =====================================================
        // ⚙️ EJECUTAR COMANDO
        // =====================================================

        try {

            await handleCommand(
                message,
                commandName,
                args
            );

        } catch (error) {

            console.error(
                "[MITTY] ❌ Error ejecutando comando:",
                error
            );

        }

    }
);


// =========================================================
// 🔘 INTERACCIONES DE DISCORD
// =========================================================

client.on(
    Events.InteractionCreate,
    async interaction => {

        // Por ahora nuestro sistema utiliza botones.
        if (!interaction.isButton()) {
            return;
        }

        try {

            await handleButton(
                interaction
            );

        } catch (error) {

            console.error(
                "[MITTY] ❌ Error manejando botón:",
                error
            );

            // =================================================
            // 🛡️ RESPUESTA DE SEGURIDAD
            // =================================================

            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.followUp({

                        content:
                            "❌ Ocurrió un error al procesar el botón.",

                        ephemeral: true

                    });

                } else {

                    await interaction.reply({

                        content:
                            "❌ Ocurrió un error al procesar el botón.",

                        ephemeral: true

                    });

                }

            } catch {
                // Discord ya pudo haber cerrado la interacción.
            }

        }

    }
);


// =========================================================
// 🔐 INICIAR SESIÓN
// =========================================================

client.login(TOKEN);


// =========================================================
// 📤 EXPORTACIONES
// =========================================================

export {
    client,
    OWNER_ID,
    GIF_TOKEN
};
