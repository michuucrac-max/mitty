// =========================================================
// 🐾 MITTY — ARCHIVO PRINCIPAL
// =========================================================
//
// Este es el punto de entrada del bot.
//
// Ya NO utiliza:
// ❌ cmd.json
// ❌ comandos antiguos
// ❌ sistemas de comandos del index anterior
//
// Todo pasa por:
//
// index.js
//      ↓
// logic.js
//      ↓
// JSON correspondiente
// =========================================================


import {
    Client,
    GatewayIntentBits,
    ActivityType,
    Events
} from "discord.js";

import express from "express";

import {
    handleCommand
} from "./logic.js";


// =========================================================
// 🔐 VARIABLES DE ENTORNO
// =========================================================

const TOKEN =
    process.env.TOKEN;

const PORT =
    process.env.PORT || 3000;

const OWNER_ID =
    process.env.OWNER_ID;

const GIF_TOKEN =
    process.env.GIF_TOKEN;


// =========================================================
// 🚨 COMPROBAR CONFIGURACIÓN
// =========================================================

if (!TOKEN) {

    console.error(
        "[MITTY] ❌ Falta TOKEN."
    );

    process.exit(1);
}


if (!GIF_TOKEN) {

    console.warn(
        "[MITTY] ⚠️ Falta GIF_TOKEN."
    );

}


// =========================================================
// 🤖 CLIENTE DE DISCORD
// =========================================================

const client =
    new Client({

        intents: [

            GatewayIntentBits.Guilds,

            GatewayIntentBits.GuildMembers,

            GatewayIntentBits.GuildMessages,

            GatewayIntentBits.MessageContent

        ]

    });


// =========================================================
// 🌐 EXPRESS
// =========================================================

const app =
    express();


app.get(
    "/",
    (req, res) => {

        res.send(
            "🐾 Mitty está online."
        );

    }
);


app.listen(
    PORT,
    () => {

        console.log(
            `[MITTY] 🌐 Servidor activo en puerto ${PORT}`
        );

    }
);


// =========================================================
// 🟢 BOT LISTO
// =========================================================

client.once(
    Events.ClientReady,
    readyClient => {

        console.log(
            `[MITTY] 🐾 Conectado como ${readyClient.user.tag}`
        );


        readyClient.user.setActivity(
            "m;help",
            {
                type:
                    ActivityType.Watching
            }
        );

    }
);


// =========================================================
// 💬 MENSAJES
// =========================================================

client.on(
    Events.MessageCreate,
    async message => {

        // -----------------------------------------------
        // IGNORAR BOTS
        // -----------------------------------------------

        if (message.author.bot) {
            return;
        }


        // -----------------------------------------------
        // PREFIJO
        // -----------------------------------------------

        const PREFIX =
            "m;";


        if (
            !message.content
                .toLowerCase()
                .startsWith(
                    PREFIX
                )
        ) {

            return;

        }


        // -----------------------------------------------
        // SEPARAR COMANDO Y ARGUMENTOS
        // -----------------------------------------------

        const content =
            message.content.slice(
                PREFIX.length
            ).trim();


        if (!content) {
            return;
        }


        const parts =
            content.split(/\s+/);


        const commandName =
            parts.shift()
                .toLowerCase();


        const args =
            parts;


        // -----------------------------------------------
        // EJECUTAR
        // -----------------------------------------------

        try {

            await handleCommand(
                message,
                commandName,
                args
            );

        } catch (error) {

            console.error(
                "[MITTY] ❌ Error procesando mensaje:",
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

        // -----------------------------------------------
        // Por ahora solo dejamos preparado el evento.
        //
        // Los botones de las interacciones antiguas
        // los volveremos a conectar cuando migremos
        // el sistema de interactions.json.
        // -----------------------------------------------

        if (
            !interaction.isButton()
        ) {

            return;

        }


        console.log(
            `[MITTY] 🔘 Botón: ${interaction.customId}`
        );

    }
);


// =========================================================
// 🔑 CONECTAR BOT
// =========================================================

client.login(
    TOKEN
);


// =========================================================
// 📤 EXPORTACIONES
// =========================================================

export {
    client,
    OWNER_ID,
    GIF_TOKEN
};
