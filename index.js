// =========================================================
// 🐾 MITTY — INDEX.JS
// =========================================================

import {
    Client,
    GatewayIntentBits,
    ActivityType,
    Events
} from "discord.js";

import express from "express";

import {
    handleCommand,
    handleButton
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
// 🚨 COMPROBAR TOKEN
// =========================================================

if (!TOKEN) {

    console.error(
        "[MITTY] ❌ Falta TOKEN."
    );

    process.exit(1);
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
// 🌐 SERVIDOR WEB
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

        if (
            message.author.bot
        ) {
            return;
        }


        const PREFIX =
            "m;";


        if (
            !message.content
                .toLowerCase()
                .startsWith(PREFIX)
        ) {

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


        const args =
            parts;


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
// 🔘 BOTONES
// =========================================================

client.on(
    Events.InteractionCreate,
    async interaction => {

        if (
            !interaction.isButton()
        ) {
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


            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.followUp({

                        content:
                            "❌ Ocurrió un error.",

                        ephemeral:
                            true

                    });

                } else {

                    await interaction.reply({

                        content:
                            "❌ Ocurrió un error.",

                        ephemeral:
                            true

                    });

                }

            } catch {}

        }

    }
);


// =========================================================
// 🔑 CONECTAR MITTY
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
