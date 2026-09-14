import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} from "discord.js";


// ============================================================
// OBTENER Y DESCARGAR IMAGEN
// ============================================================

async function getRandomGif(gifs, category) {
    try {
        const api = gifs?.[category]?.api;

        if (!api) {
            console.error(`[MITTY] No existe API para: ${category}`);
            return null;
        }

        console.log(`[MITTY] Consultando API: ${api}`);

        const apiResponse = await fetch(api, {
            signal: AbortSignal.timeout(10000),
            headers: {
                "User-Agent": "Mitty Discord Bot/1.0"
            }
        });

        if (!apiResponse.ok) {
            throw new Error(
                `API respondió ${apiResponse.status} ${apiResponse.statusText}`
            );
        }

        const data = await apiResponse.json();

        console.log("[MITTY] Respuesta de la API:", data);

        if (!data?.url) {
            throw new Error("La API no devolvió una URL.");
        }

        const imageResponse = await fetch(data.url, {
            signal: AbortSignal.timeout(15000),
            headers: {
                "User-Agent": "Mitty Discord Bot/1.0"
            }
        });

        if (!imageResponse.ok) {
            throw new Error(
                `No se pudo descargar la imagen: ${imageResponse.status}`
            );
        }

        const contentType =
            imageResponse.headers.get("content-type") || "image/gif";

        if (!contentType.startsWith("image/")) {
            throw new Error(
                `El recurso no es una imagen: ${contentType}`
            );
        }

        const buffer = Buffer.from(
            await imageResponse.arrayBuffer()
        );

        const MAX_SIZE = 15 * 1024 * 1024;

        if (buffer.length > MAX_SIZE) {
            throw new Error("La imagen supera el tamaño permitido.");
        }

        let extension = "gif";

        if (contentType.includes("png")) {
            extension = "png";
        } else if (
            contentType.includes("jpeg") ||
            contentType.includes("jpg")
        ) {
            extension = "jpg";
        } else if (contentType.includes("webp")) {
            extension = "webp";
        }

        const safeCategory = String(category)
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, "");

        const filename =
            `mitty-${safeCategory}-${Date.now()}.${extension}`;

        const attachment = new AttachmentBuilder(buffer, {
            name: filename
        });

        console.log(`[MITTY] Imagen descargada: ${filename}`);

        return {
            attachment,
            url: `attachment://${filename}`
        };

    } catch (error) {
        console.error(
            `[MITTY] Error obteniendo imagen (${category}):`,
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
    const sent = await message.reply("🏓 Calculando...");

    const latency =
        sent.createdTimestamp - message.createdTimestamp;

    const websocket = message.client.ws.ping;

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
    gifs,
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

    const media =
        await getRandomGif(gifs, category);

    const embed = new EmbedBuilder()
        .setColor(0xffb6d9)
        .setDescription(
            `💗 ${message.author} le hizo **${actionText}** a ${target}!`
        )
        .setFooter({
            text: "— Mitty 💕"
        })
        .setTimestamp();

    if (media) {
        embed.setImage(media.url);
    }

    const button = new ButtonBuilder()
        .setCustomId(
            `mitty_return_${category}_${message.author.id}_${target.id}`
        )
        .setLabel(`Devolver ${actionText}`)
        .setEmoji(getButtonEmoji(category))
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()
        .addComponents(button);

    const payload = {
        embeds: [embed],
        components: [row],
        allowedMentions: {
            users: [
                message.author.id,
                target.id
            ]
        }
    };

    if (media) {
        payload.files = [media.attachment];
    }

    const sentMessage =
        await message.channel.send(payload);

    const collector =
        sentMessage.createMessageComponentCollector({
            time: 120000
        });

    collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== target.id) {
            await buttonInteraction.reply({
                content:
                    `💗 Este botón es para ${target}.`,
                ephemeral: true
            });

            return;
        }

        collector.stop("returned");

        const returnMedia =
            await getRandomGif(gifs, category);

        const returnEmbed = new EmbedBuilder()
            .setColor(0xffc1df)
            .setDescription(
                `💕 ${target} no dudó ni un segundo en ` +
                `devolverle **${actionText}** a ${message.author}!`
            )
            .setFooter({
                text: "— Mitty 💕"
            })
            .setTimestamp();

        if (returnMedia) {
            returnEmbed.setImage(returnMedia.url);
        }

        const updatePayload = {
            embeds: [returnEmbed],
            components: [],
            allowedMentions: {
                users: [
                    message.author.id,
                    target.id
                ]
            }
        };

        if (returnMedia) {
            updatePayload.files = [
                returnMedia.attachment
            ];
        }

        try {
            await buttonInteraction.update(updatePayload);
        } catch (error) {
            console.error(
                "[MITTY] Error actualizando interacción:",
                error
            );
        }
    });

    collector.on("end", async (_, reason) => {
        if (reason === "returned") {
            return;
        }

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
                "[MITTY] No pude desactivar el botón:",
                error
            );
        }
    });
}

// ============================================================
// HUG
// ============================================================

async function hug(message, gifs) {
    const target = await getTargetFromReply(message);

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
    const target = await getTargetFromReply(message);

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
    const target = await getTargetFromReply(message);

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
    const target = await getTargetFromReply(message);

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
    const target = await getTargetFromReply(message);

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
    const target = await getTargetFromReply(message);

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

export async function handleCommand(
    message,
    command,
    args,
    context
) {
    const handler =
        commandHandlers[command];

    if (!handler) {
        return false;
    }

    try {
        await handler(
            message,
            context?.gifs,
            context?.commands,
            args
        );

        return true;

    } catch (error) {
        console.error(
            `[MITTY] Error ejecutando m;${command}:`,
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
