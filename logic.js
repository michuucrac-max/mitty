import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";


// ============================================================
// OBTENER GIF ALEATORIO
// ============================================================

function getRandomGif(gifs, category) {
    const list = gifs?.[category];

    if (!Array.isArray(list) || list.length === 0) {
        console.error(
            `[MITTY] No hay GIFs configurados para: ${category}`
        );

        return null;
    }

    return list[
        Math.floor(Math.random() * list.length)
    ];
}


// ============================================================
// OBTENER USUARIO DEL MENSAJE RESPONDIDO
// ============================================================

async function getTargetFromReply(message) {
    try {
        if (!message.reference?.messageId) {
            return null;
        }

        const referencedMessage =
            await message.fetchReference();

        if (!referencedMessage?.author) {
            return null;
        }

        return referencedMessage.author;

    } catch (error) {
        console.error(
            "[MITTY] No pude obtener el mensaje respondido:",
            error
        );

        return null;
    }
}


// ============================================================
// PING
// ============================================================

async function ping(message) {
    const sent = await message.reply(
        "🏓 Calculando..."
    );

    const latency =
        sent.createdTimestamp -
        message.createdTimestamp;

    const websocket =
        message.client.ws.ping;

    await sent.edit(
        `🏓 **Pong!**\n` +
        `💗 Latencia: **${latency}ms**\n` +
        `📡 WebSocket: **${websocket}ms**`
    );
}


// ============================================================
// HELP
// ============================================================

async function help(message, commands) {
    const embed = new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle("🌸 Comandos de Mitty")
        .setDescription(
            "¡Holaaa! Estos son los comandos que puedes usar conmigo 💕"
        )
        .setFooter({
            text: "Mitty está aquí para ayudarte~"
        });

    for (
        const [name, info]
        of Object.entries(commands || {})
    ) {
        embed.addFields({
            name: `m;${name}`,
            value:
                `${info.description || "Sin descripción."}\n` +
                `Categoría: ${info.category || "general"}`,
            inline: false
        });
    }

    embed.addFields({
        name: "💗 Interacciones",
        value:
            "`m;hug` · `m;pat` · `m;boop`\n" +
            "`m;cuddle` · `m;poke` · `m;meow`\n\n" +
            "💡 Responde al mensaje de alguien y escribe el comando.",
        inline: false
    });

    await message.reply({
        embeds: [embed]
    });
}


// ============================================================
// EMOJIS DE LOS BOTONES
// ============================================================

function getButtonEmoji(category) {
    const emojis = {
        Hug: "🤗",
        Pat: "🫳",
        Boop: "👉",
        Cuddle: "🫂",
        Poke: "👉",
        Meow: "🐱"
    };

    return emojis[category] || "💗";
}


// ============================================================
// INTERACCIÓN GENERAL
// ============================================================

async function interaction({
    message,
    target,
    gifs,
    category,
    actionText
}) {

    // --------------------------------------------------------
    // NO PERMITIR INTERACTUAR CONSIGO MISMO
    // --------------------------------------------------------

    if (target.id === message.author.id) {
        await message.reply(
            "🌸 ¡No puedes hacerme eso a ti mismo! " +
            "Responde al mensaje de otra persona 💕"
        );

        return;
    }


    // --------------------------------------------------------
    // OBTENER GIF
    // --------------------------------------------------------

    const gif =
        getRandomGif(gifs, category);


    // --------------------------------------------------------
    // CREAR EMBED
    // --------------------------------------------------------

    const embed = new EmbedBuilder()
        .setColor(0xffb6d9)
        .setDescription(
            `💗 ${message.author} le hizo ` +
            `**${actionText}** a ${target}!`
        )
        .setFooter({
            text: "— Mitty 💕"
        })
        .setTimestamp();


    // --------------------------------------------------------
    // AÑADIR GIF
    // --------------------------------------------------------

    if (gif) {
        embed.setImage(gif);
    }


    // --------------------------------------------------------
    // BOTÓN
    // --------------------------------------------------------

    const button = new ButtonBuilder()
        .setCustomId(
            `mitty_return_${category}_${message.author.id}_${target.id}`
        )
        .setLabel(
            `Devolver ${actionText}`
        )
        .setEmoji(
            getButtonEmoji(category)
        )
        .setStyle(
            ButtonStyle.Secondary
        );


    const row = new ActionRowBuilder()
        .addComponents(button);


    // --------------------------------------------------------
    // ENVIAR
    // --------------------------------------------------------

    const sentMessage =
        await message.channel.send({
            embeds: [embed],
            components: [row],
            allowedMentions: {
                users: [
                    message.author.id,
                    target.id
                ]
            }
        });


    // --------------------------------------------------------
    // COLECTOR DEL BOTÓN
    // --------------------------------------------------------

    const collector =
        sentMessage.createMessageComponentCollector({
            time: 120000
        });


    collector.on(
        "collect",
        async (buttonInteraction) => {

            // ------------------------------------------------
            // SOLO EL DESTINATARIO PUEDE DEVOLVER
            // ------------------------------------------------

            if (
                buttonInteraction.user.id !==
                target.id
            ) {
                await buttonInteraction.reply({
                    content:
                        `💗 Este botón es para ${target}.`,
                    ephemeral: true
                });

                return;
            }


            // ------------------------------------------------
            // DETENER COLECTOR
            // ------------------------------------------------

            collector.stop("returned");


            // ------------------------------------------------
            // OBTENER OTRO GIF
            // ------------------------------------------------

            const returnGif =
                getRandomGif(
                    gifs,
                    category
                );


            // ------------------------------------------------
            // EMBED DE DEVOLUCIÓN
            // ------------------------------------------------

            const returnEmbed =
                new EmbedBuilder()
                    .setColor(0xffc1df)
                    .setDescription(
                        `💕 ${target} no dudó ni un segundo ` +
                        `en devolverle **${actionText}** ` +
                        `a ${message.author}!`
                    )
                    .setFooter({
                        text: "— Mitty 💕"
                    })
                    .setTimestamp();


            if (returnGif) {
                returnEmbed.setImage(returnGif);
            }


            // ------------------------------------------------
            // ACTUALIZAR MENSAJE
            // ------------------------------------------------

            try {

                await buttonInteraction.update({
                    embeds: [returnEmbed],
                    components: [],
                    allowedMentions: {
                        users: [
                            message.author.id,
                            target.id
                        ]
                    }
                });

            } catch (error) {

                console.error(
                    "[MITTY] Error actualizando interacción:",
                    error
                );
            }
        }
    );


    // --------------------------------------------------------
    // EXPIRACIÓN DEL BOTÓN
    // --------------------------------------------------------

    collector.on(
        "end",
        async (_, reason) => {

            if (reason === "returned") {
                return;
            }

            try {

                const disabledButton =
                    new ButtonBuilder()
                        .setCustomId(
                            `mitty_expired_${Date.now()}`
                        )
                        .setLabel(
                            `Devolver ${actionText}`
                        )
                        .setEmoji(
                            getButtonEmoji(category)
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                        .setDisabled(true);


                const disabledRow =
                    new ActionRowBuilder()
                        .addComponents(
                            disabledButton
                        );


                await sentMessage.edit({
                    components: [
                        disabledRow
                    ]
                });

            } catch (error) {

                console.error(
                    "[MITTY] No pude desactivar el botón:",
                    error
                );
            }
        }
    );
}

// ============================================================
// HUG
// ============================================================

async function hug(message, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        await message.reply(
            "🤗 Responde al mensaje de alguien y escribe " +
            "`m;hug` para darle un abrazo."
        );

        return;
    }

    await interaction({
        message,
        target,
        gifs,
        category: "Hug",
        actionText: "un abrazo"
    });
}


// ============================================================
// PAT
// ============================================================

async function pat(message, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        await message.reply(
            "🫳 Responde al mensaje de alguien y escribe " +
            "`m;pat` para darle unas palmaditas."
        );

        return;
    }

    await interaction({
        message,
        target,
        gifs,
        category: "Pat",
        actionText: "unas palmaditas"
    });
}


// ============================================================
// BOOP
// ============================================================

async function boop(message, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        await message.reply(
            "👉 Responde al mensaje de alguien y escribe " +
            "`m;boop` para darle un boop."
        );

        return;
    }

    await interaction({
        message,
        target,
        gifs,
        category: "Boop",
        actionText: "un boop"
    });
}


// ============================================================
// CUDDLE
// ============================================================

async function cuddle(message, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        await message.reply(
            "🫂 Responde al mensaje de alguien y escribe " +
            "`m;cuddle` para acurrucarte."
        );

        return;
    }

    await interaction({
        message,
        target,
        gifs,
        category: "Cuddle",
        actionText: "un acurrucón"
    });
}


// ============================================================
// POKE
// ============================================================

async function poke(message, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        await message.reply(
            "👉 Responde al mensaje de alguien y escribe " +
            "`m;poke` para darle un pequeño poke."
        );

        return;
    }

    await interaction({
        message,
        target,
        gifs,
        category: "Poke",
        actionText: "un poke"
    });
}


// ============================================================
// MEOW
// ============================================================

async function meow(message, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        await message.reply(
            "🐱 Responde al mensaje de alguien y escribe " +
            "`m;meow` para maullarle."
        );

        return;
    }

    await interaction({
        message,
        target,
        gifs,
        category: "Meow",
        actionText: "un maullido"
    });
}


// ============================================================
// HANDLERS
// ============================================================

const commandHandlers = {

    ping: async ({ message }) => {
        await ping(message);
    },

    help: async ({ message, commands }) => {
        await help(
            message,
            commands
        );
    },

    hug: async ({ message, gifs }) => {
        await hug(message, gifs);
    },

    pat: async ({ message, gifs }) => {
        await pat(message, gifs);
    },

    boop: async ({ message, gifs }) => {
        await boop(message, gifs);
    },

    cuddle: async ({ message, gifs }) => {
        await cuddle(message, gifs);
    },

    poke: async ({ message, gifs }) => {
        await poke(message, gifs);
    },

    meow: async ({ message, gifs }) => {
        await meow(message, gifs);
    }
};


// ============================================================
// EJECUTAR COMANDO
// ============================================================

export async function handleCommand({
    message,
    commandName,
    args,
    commands,
    gifs,
    config,
    prefix,
    ownerId,
    getNextStatus,
    getNextThinking,
    reloadStatus
}) {

    const handler =
        commandHandlers[commandName];

    if (!handler) {
        return false;
    }

    try {

        await handler({
            message,
            commandName,
            args,
            commands,
            gifs,
            config,
            prefix,
            ownerId,
            getNextStatus,
            getNextThinking,
            reloadStatus
        });

        return true;

    } catch (error) {

        console.error(
            `[MITTY] Error ejecutando m;${commandName}:`,
            error
        );

        try {

            await message.reply(
                "💔 Oops... algo salió mal. " +
                "Inténtalo de nuevo."
            );

        } catch (replyError) {

            console.error(
                "[MITTY] También falló el mensaje de error:",
                replyError
            );
        }

        return false;
    }
}


// ============================================================
// EXPORTACIONES
// ============================================================

export {
    ping,
    help,
    hug,
    pat,
    boop,
    cuddle,
    poke,
    meow,
    interaction,
    getRandomGif
};
