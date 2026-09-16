// =========================================================
// 🐾 MITTY • ARCHIVO PRINCIPAL
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
    handleButton
} from "./logic.js";


// =========================================================
// ⚙️ CONFIGURACIÓN
// =========================================================

const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT || 3000;
const OWNER_ID = process.env.OWNER_ID;
const GIF_TOKEN = process.env.GIF_TOKEN;

const PREFIX = "m;";


// =========================================================
// 📁 RUTAS
// =========================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// =========================================================
// 📄 CARGAR STATUS.JSON
// =========================================================

function loadStatus() {
    const filePath = path.join(__dirname, "status.json");

    try {
        if (!fs.existsSync(filePath)) {
            console.warn("[MITTY] ⚠️ No existe status.json.");
            return {
                interval: 30000,
                statuses: []
            };
        }

        const data = fs.readFileSync(filePath, "utf8");
        const status = JSON.parse(data);

        if (!Array.isArray(status.statuses)) {
            console.warn("[MITTY] ⚠️ status.json no contiene una lista de estados.");
            return {
                interval: 30000,
                statuses: []
            };
        }

        return status;

    } catch (error) {
        console.error("[MITTY] ❌ Error leyendo status.json:", error);

        return {
            interval: 30000,
            statuses: []
        };
    }
}

const statusConfig = loadStatus();


// =========================================================
// 🔐 COMPROBAR TOKEN
// =========================================================

if (!TOKEN) {
    console.error("[MITTY] ❌ Falta TOKEN.");
    process.exit(1);
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
    console.log(`[MITTY] 🌐 Servidor activo en puerto ${PORT}`);
});


// =========================================================
// 🟢 BOT LISTO
// =========================================================

client.once(Events.ClientReady, readyClient => {

    console.log(
        `[MITTY] 🐾 Conectado como ${readyClient.user.tag}`
    );

    startStatusRotation(readyClient);
});


// =========================================================
// 🔄 ESTADOS ROTATIVOS
// =========================================================

function startStatusRotation(readyClient) {

    const statuses = statusConfig.statuses;

    if (!statuses.length) {
        console.warn("[MITTY] ⚠️ No hay estados para rotar.");
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

        readyClient.user.setActivity(status.text, {
            type: activityType
        });

        console.log(
            `[MITTY] 🔄 Estado: ${status.type} ${status.text}`
        );

        currentIndex++;

        if (currentIndex >= statuses.length) {
            currentIndex = 0;
        }
    }

    updateStatus();

    const interval =
        Number(statusConfig.interval) || 30000;

    setInterval(updateStatus, interval);
}


// =========================================================
// 💬 MENSAJES
// =========================================================

client.on(Events.MessageCreate, async message => {

    if (message.author.bot) return;

    if (!message.content.toLowerCase().startsWith(PREFIX)) {
        return;
    }

    const content = message.content
        .slice(PREFIX.length)
        .trim();

    if (!content) return;

    const parts = content.split(/\s+/);

    const commandName = parts
        .shift()
        .toLowerCase();

    const args = parts;

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
});


// =========================================================
// 🔘 BOTONES
// =========================================================

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isButton()) return;

    try {

        await handleButton(interaction);

    } catch (error) {

        console.error(
            "[MITTY] ❌ Error manejando botón:",
            error
        );

        try {

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction.followUp({
                    content: "❌ Ocurrió un error.",
                    ephemeral: true
                });

            } else {

                await interaction.reply({
                    content: "❌ Ocurrió un error.",
                    ephemeral: true
                });

            }

        } catch {}
    }
});


// =========================================================
// 🚀 INICIAR MITTY
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
