import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

// ==========================================
// OBTENER GIF DESDE LA API
// ==========================================

async function getRandomGif(gifs, category) {
    const api = gifs?.[category]?.api;

    if (!api) {
        console.warn(`⚠️ No existe API para la categoría ${category}.`);
        return null;
    }

    try {
        const response = await fetch(api, {
            headers: {
                "User-Agent": "Mitty Discord Bot"
            }
        });

        if (!response.ok) {
            throw new Error(
                `API respondió con HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (!data?.url) {
            throw new Error("La API no devolvió una URL.");
        }

        return data.url;

    } catch (error) {
        console.error(
            `❌ Error obteniendo GIF de ${category}:`,
            error
        );

        return null;
    }
}

// ==========================================
// OBTENER USUARIO DEL MENSAJE RESPONDIDO
// ==========================================

async function getTargetFromReply(message) {
    if (!message.reference?.messageId) {
        return null;
    }

    try {
        const repliedMessage = await message.fetchReference();

        return repliedMessage.author;
    } catch (error) {
        console.error(
            "❌ No se pudo obtener el mensaje respondido:",
            error
        );

        return null;
    }
}

// ==========================================
// PING
// ==========================================

async function ping(message) {
    const sent = await message.reply(
        "🐾 Calculando mi latencia..."
    );

    const messageLatency =
        sent.createdTimestamp -
        message.createdTimestamp;

    const websocketLatency =
        message.client.ws.ping;

    await sent.edit(
        `🐾 ¡Pong!\n` +
        `💌 Latencia: **${messageLatency}ms**\n` +
        `🌐 WebSocket: **${websocketLatency}ms**`
    );
}

// ==========================================
// HELP
// ==========================================

async function help(message, commands, prefix) {
    const embed = new EmbedBuilder()
        .setTitle("🌸 ¡Holii! Soy Mitty")
        .setDescription(
            "🐾 ¡Aquí están las cosas que puedo hacer!\n\n" +
            "También tengo algunas interacciones que puedes " +
            "usar respondiendo al mensaje de alguien."
        )
        .setColor(0xffb6d9);

    const entries = Object.entries(commands);

    if (entries.length) {
        for (const [name, data] of entries) {
            embed.addFields({
                name: `${prefix}${name}`,
                value:
                    data.description ||
                    "Sin descripción.",
                inline: false
            });
        }
    }

    embed.addFields({
        name: "🐾 Interacciones",
        value:
            `${prefix}hug — Abrazo\n` +
            `${prefix}pat — Pat pat\n` +
            `${prefix}boop — Boop\n` +
            `${prefix}cuddle — Acurrucarse\n` +
            `${prefix}poke — Poke\n` +
            `${prefix}meow — Miau`,
        inline: false
    });

    embed.setFooter({
        text: "🌸 Responde al mensaje de alguien para usar una interacción."
    });

    await message.reply({
        embeds: [embed]
    });
}

// ==========================================
// INTERACCIÓN GENÉRICA
// ==========================================

async function interaction({
    message,
    target,
    category,
    interactionName,
    returnName,
    emoji,
    gifs
}) {
    // Obtener GIF desde la API
    const gif = await getRandomGif(
        gifs,
        category
    );

    // ID único para el botón
    const buttonId =
        `return_${category.toLowerCase()}_${message.id}`;

    const button = new ButtonBuilder()
        .setCustomId(buttonId)
        .setLabel(
            `${emoji} Devolver ${returnName}`
        )
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
        .addComponents(button);

    // ==========================================
    // EMBED ORIGINAL
    // ==========================================

    const embed = new EmbedBuilder()
        .setColor(0xffb6d9)
        .setDescription(
            `${message.author} le hizo ` +
            `**${interactionName}** a ${target}! 🐾💕`
        )
        .setFooter({
            text:
                "🌸 ¡La otra persona puede devolver la interacción!"
        });

    if (gif) {
        embed.setImage(gif);
    }

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

    // ==========================================
    // BOTÓN
    // ==========================================

    const collector =
        sentMessage.createMessageComponentCollector({
            time: 5 * 60 * 1000
        });

    collector.on(
        "collect",
        async buttonInteraction => {

            // ======================================
            // SOLO EL DESTINATARIO PUEDE DEVOLVER
            // ======================================

            if (
                buttonInteraction.user.id !==
                target.id
            ) {
                return buttonInteraction.reply({
                    content:
                        `🐾 ¡E-eh! Este botón es para ${target}! 💕`,
                    ephemeral: true
                });
            }

            // ======================================
            // OBTENER OTRO GIF
            // ======================================

            const returnGif =
                await getRandomGif(
                    gifs,
                    category
                );

            // ======================================
            // EMBED DE DEVOLUCIÓN
            // ======================================

            const returnEmbed =
                new EmbedBuilder()
                    .setColor(0xffb6d9)
                    .setDescription(
                        `${target} no dudó ni un segundo ` +
                        `en devolverle **${returnName}** ` +
                        `a ${message.author}! 🐾💕`
                    )
                    .setFooter({
                        text:
                            "🌸 ¡Qué bonito!"
                    });

            if (returnGif) {
                returnEmbed.setImage(returnGif);
            }

            // ======================================
            // ACTUALIZAR MENSAJE
            // ======================================

            await buttonInteraction.update({
                embeds: [returnEmbed],
                components: []
            });

            collector.stop("returned");
        }
    );

    // ==========================================
    // CUANDO EXPIRA EL BOTÓN
    // ==========================================

    collector.on(
        "end",
        async (_, reason) => {

            if (reason === "returned") {
                return;
            }

            const disabledButton =
                new ButtonBuilder()
                    .setCustomId(buttonId)
                    .setLabel(
                        `${emoji} Devolver ${returnName}`
                    )
                    .setStyle(
                        ButtonStyle.Primary
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
            }).catch(() => {});
        }
    );
}

// ==========================================
// HUG
// ==========================================

async function hug(message, args, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        return message.reply(
            "🌸🐾 ¡A-ah! Para dar un abrazo tienes que responder al mensaje de la persona que quieres abrazar y escribir `m;hug`."
        );
    }

    if (
        target.id ===
        message.author.id
    ) {
        return message.reply(
            "🐾 ¿Eh? ¡No puedes hacerte un abrazo a ti mismo! 🤭💕"
        );
    }

    await interaction({
        message,
        target,
        category: "Hug",
        interactionName: "un abrazo",
        returnName: "abrazo",
        emoji: "🤗",
        gifs
    });
}

// ==========================================
// PAT
// ==========================================

async function pat(message, args, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        return message.reply(
            "🐾💕 ¡Para dar pat pat, responde al mensaje de alguien y escribe `m;pat`!"
        );
    }

    if (
        target.id ===
        message.author.id
    ) {
        return message.reply(
            "🐾 ¡Jeje! Creo que sería difícil hacerte pat pat a ti mismo. 🤭"
        );
    }

    await interaction({
        message,
        target,
        category: "Pat",
        interactionName: "pat pat",
        returnName: "pat pat",
        emoji: "🐾",
        gifs
    });
}

// ==========================================
// BOOP
// ==========================================

async function boop(message, args, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        return message.reply(
            "👉🐾 ¡Para hacer boop, responde al mensaje de alguien y escribe `m;boop`!"
        );
    }

    if (
        target.id ===
        message.author.id
    ) {
        return message.reply(
            "👉🐾 ¡Boop! Pero... espera, ¡ese eras tú! 🤭"
        );
    }

    await interaction({
        message,
        target,
        category: "Boop",
        interactionName: "un boop",
        returnName: "boop",
        emoji: "👉",
        gifs
    });
}

// ==========================================
// CUDDLE
// ==========================================

async function cuddle(message, args, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        return message.reply(
            "🥰🐾 ¡Para acurrucarte con alguien, responde a su mensaje y escribe `m;cuddle`!"
        );
    }

    if (
        target.id ===
        message.author.id
    ) {
        return message.reply(
            "🐾💕 ¡Jeje! Necesitamos a otro amigo para acurrucarnos."
        );
    }

    await interaction({
        message,
        target,
        category: "Cuddle",
        interactionName:
            "un abrazo acurrucado",
        returnName:
            "acurrucamiento",
        emoji: "🥰",
        gifs
    });
}

// ==========================================
// POKE
// ==========================================

async function poke(message, args, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        return message.reply(
            "👉🐾 ¡Para hacer poke, responde al mensaje de alguien y escribe `m;poke`!"
        );
    }

    if (
        target.id ===
        message.author.id
    ) {
        return message.reply(
            "👉🐾 ¡Poke! ...¡Pero te hiciste poke a ti mismo! 🤭"
        );
    }

    await interaction({
        message,
        target,
        category: "Poke",
        interactionName: "un poke",
        returnName: "poke",
        emoji: "👉",
        gifs
    });
}

// ==========================================
// MEOW
// ==========================================

async function meow(message, args, gifs) {
    const target =
        await getTargetFromReply(message);

    if (!target) {
        return message.reply(
            "🐾🌸 ¡Para decirle miau a alguien, responde a su mensaje y escribe `m;meow`!"
        );
    }

    if (
        target.id ===
        message.author.id
    ) {
        return message.reply(
            "🐾 ¡Miau! ...¿Me estaba hablando a mí misma? 🤔"
        );
    }

    await interaction({
        message,
        target,
        category: "Meow",
        interactionName: "un miau",
        returnName: "miau",
        emoji: "🐱",
        gifs
    });
}

// ==========================================
// COMANDOS
// ==========================================

const commandHandlers = {
    ping,
    help,

    hug,
    pat,
    boop,
    cuddle,
    poke,
    meow
};

// ==========================================
// MANEJADOR PRINCIPAL
// ==========================================

async function handleCommand({
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
        return message.reply(
            `🐾 ¡Mmm! No conozco el comando \`${prefix}${commandName}\`.\n` +
            `🌸 Prueba \`${prefix}help\` para ver lo que puedo hacer.`
        );
    }

    // ==============================
    // COMANDOS BÁSICOS
    // ==============================

    if (commandName === "ping") {
        return handler(message);
    }

    if (commandName === "help") {
        return handler(
            message,
            commands,
            prefix
        );
    }

    // ==============================
    // INTERACCIONES
    // ==============================

    return handler(
        message,
        args,
        gifs,
        config
    );
}

// ==========================================
// EXPORTACIONES
// ==========================================

export {
    handleCommand,
    ping,
    help,
    hug,
    pat,
    boop,
    cuddle,
    poke,
    meow
};
