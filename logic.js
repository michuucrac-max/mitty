import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

// ============================================================
// CONFIGURACIÓN GIPHY
// ============================================================

const GIF_TOKEN = process.env.GIF_TOKEN;

const GIF_TAGS = {
    Hug: "anime hug",
    Pat: "anime pat",
    Boop: "anime boop",
    Cuddle: "anime cuddle",
    Poke: "anime poke",
    Meow: "anime meow"
};

const BUTTON_TIMEOUT = 120000;

// ============================================================
// OBTENER GIF DE GIPHY
// ============================================================

export async function getRandomGif(category) {
    try {
        if (!GIF_TOKEN) {
            console.error("[MITTY] ❌ Falta GIF_TOKEN.");
            return null;
        }

        const tag = GIF_TAGS[category];

        if (!tag) {
            console.error(
                `[MITTY] ❌ No existe búsqueda GIPHY para: ${category}`
            );
            return null;
        }

        const params = new URLSearchParams({
            api_key: GIF_TOKEN,
            tag,
            rating: "g"
        });

        const url =
            `https://api.giphy.com/v1/gifs/random?${params.toString()}`;

        console.log(`[MITTY] 🔎 Buscando GIF: ${tag}`);

        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000),
            headers: {
                "User-Agent": "Mitty Discord Bot/1.0"
            }
        });

        if (!response.ok) {
            throw new Error(
                `GIPHY respondió ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        const gifUrl =
            data?.data?.images?.original?.url;

        if (!gifUrl) {
            throw new Error(
                "GIPHY no devolvió una URL de GIF."
            );
        }

        console.log(
            `[MITTY] ✅ GIF encontrado para ${category}`
        );

        return gifUrl;

    } catch (error) {
        console.error(
            `[MITTY] ❌ Error obteniendo GIF (${category}):`,
            error
        );

        return null;
    }
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
            "[MITTY] ❌ No pude obtener el mensaje respondido:",
            error
        );

        return null;
    }
}

// ============================================================
// PING
// ============================================================

async function ping(message) {
    const sent = await message.reply("🏓 Calculando...");

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

    for (const [name, info] of Object.entries(commands || {})) {
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
// EMOJIS
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
    category,
    actionText
}) {
    if (target.id === message.author.id) {
        await message.reply(
            "🌸 ¡No puedes hacerme eso a ti mismo! " +
            "Responde al mensaje de otra persona 💕"
        );

        return;
    }

    const gif = await getRandomGif(category);

    const embed = new EmbedBuilder()
        .setColor(0xffb6d9)
        .setDescription(
            `💗 ${message.author} le hizo **${actionText}** a ${target}!`
        )
        .setFooter({
            text: "— Mitty 💕"
        })
        .setTimestamp();

    if (gif) {
        embed.setImage(gif);
    }

    const customId =
        `mitty_return_${category}_${message.author.id}_${target.id}`;

    const button = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(`Devolver ${actionText}`)
        .setEmoji(getButtonEmoji(category))
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()
        .addComponents(button);

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

    // Desactivar automáticamente después de 2 minutos.
    setTimeout(async () => {
        try {
            const disabledButton =
                new ButtonBuilder()
                    .setCustomId(
                        `mitty_expired_${Date.now()}`
                    )
                    .setLabel(`Devolver ${actionText}`)
                    .setEmoji(getButtonEmoji(category))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

            const disabledRow =
                new ActionRowBuilder()
                    .addComponents(disabledButton);

            await sentMessage.edit({
                components: [disabledRow]
            });

        } catch (error) {
            console.error(
                "[MITTY] ❌ No pude desactivar el botón:",
                error
            );
        }
    }, BUTTON_TIMEOUT);
}

// ============================================================
// HUG
// ============================================================

async function hug(message) {
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
        category: "Hug",
        actionText: "un abrazo"
    });
}

// ============================================================
// PAT
// ============================================================

async function pat(message) {
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
        category: "Pat",
        actionText: "unas palmaditas"
    });
}

// ============================================================
// BOOP
// ============================================================

async function boop(message) {
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
        category: "Boop",
        actionText: "un boop"
    });
}

// ============================================================
// CUDDLE
// ============================================================

async function cuddle(message) {
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
        category: "Cuddle",
        actionText: "un acurrucón"
    });
}

// ============================================================
// POKE
// ============================================================

async function poke(message) {
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
        category: "Poke",
        actionText: "un poke"
    });
}

// ============================================================
// MEOW
// ============================================================

async function meow(message) {
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
        category: "Meow",
        actionText: "un maullido"
    });
}

// ============================================================
// MANEJAR BOTONES
// ============================================================

export async function handleButton(buttonInteraction) {
    const id = buttonInteraction.customId;

    if (!id.startsWith("mitty_return_")) {
        return;
    }

    const parts = id.split("_");

    // mitty_return_CATEGORY_AUTHOR_ID_TARGET_ID
    if (parts.length < 5) {
        return;
    }

    const category = parts[2];
    const authorId = parts[3];
    const targetId = parts[4];

    // Solo la persona objetivo puede devolver la interacción.
    if (buttonInteraction.user.id !== targetId) {
        await buttonInteraction.reply({
            content:
                "💗 Este botón es solamente para la persona a quien se hizo la interacción.",
            ephemeral: true
        });

        return;
    }

    const gif =
        await getRandomGif(category);

    const actionNames = {
        Hug: "un abrazo",
        Pat: "unas palmaditas",
        Boop: "un boop",
        Cuddle: "un acurrucón",
        Poke: "un poke",
        Meow: "un maullido"
    };

    const actionText =
        actionNames[category] || "una interacción";

    const embed = new EmbedBuilder()
        .setColor(0xffc1df)
        .setDescription(
            `💕 ${buttonInteraction.user} no dudó ni un segundo en ` +
            `devolverle **${actionText}** a <@${authorId}>!`
        )
        .setFooter({
            text: "— Mitty 💕"
        })
        .setTimestamp();

    if (gif) {
        embed.setImage(gif);
    }

    await buttonInteraction.update({
        embeds: [embed],
        components: []
    });
}

// ============================================================
// COMANDOS
// ============================================================

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
    const command =
        String(commandName || "").toLowerCase();

    const handler =
        commandHandlers[command];

    if (!handler) {
        return false;
    }

    try {
        await handler(
            message,
            commands,
            args,
            {
                gifs,
                config,
                prefix,
                ownerId,
                getNextStatus,
                getNextThinking,
                reloadStatus
            }
        );

        return true;

    } catch (error) {
        console.error(
            `[MITTY] ❌ Error ejecutando m;${command}:`,
            error
        );

        try {
            await message.reply(
                "💔 Oops... algo salió mal. " +
                "Inténtalo de nuevo."
            );
        } catch (replyError) {
            console.error(
                "[MITTY] ❌ También falló el mensaje de error:",
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
    interaction
};
