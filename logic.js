import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

/* =========================================================
   GIPHY
========================================================= */

const GIF_TOKEN = process.env.GIF_TOKEN;

const GIF_SEARCHES = {

    Hug: "anime hug",
    Pat: "anime pat",
    Boop: "anime boop",
    Cuddle: "anime cuddle",
    Poke: "anime poke",
    Meow: "anime meow"

};

/* =========================================================
   OBTENER GIF DE GIPHY
========================================================= */

export async function getRandomGif(category) {

    if (!GIF_TOKEN) {

        console.error(
            "[MITTY] ❌ Falta GIF_TOKEN."
        );

        return null;
    }

    const query =
        GIF_SEARCHES[category];

    if (!query) {

        console.error(
            `[MITTY] ❌ Categoría desconocida: ${category}`
        );

        return null;
    }

    try {

        const params =
            new URLSearchParams({

                api_key: GIF_TOKEN,

                q: query,

                limit: "20",

                rating: "g"

            });

        const response =
            await fetch(
                `https://api.giphy.com/v1/gifs/search?${params.toString()}`,
                {
                    signal:
                        AbortSignal.timeout(10000),

                    headers: {
                        "User-Agent":
                            "Mitty Discord Bot/1.0"
                    }
                }
            );

        if (!response.ok) {

            console.error(
                `[MITTY] ❌ GIPHY respondió ${response.status}: ${response.statusText}`
            );

            return null;
        }

        const data =
            await response.json();

        const gifs =
            (data.data || [])
                .map(
                    gif =>
                        gif?.images?.original?.url
                )
                .filter(Boolean);

        if (gifs.length === 0) {

            console.error(
                `[MITTY] ❌ GIPHY no encontró GIFs para "${query}".`
            );

            return null;
        }

        const randomIndex =
            Math.floor(
                Math.random() * gifs.length
            );

        return gifs[randomIndex];

    } catch (error) {

        console.error(
            "[MITTY] ❌ Error consultando GIPHY:",
            error
        );

        return null;
    }
}

/* =========================================================
   BUSCAR OBJETIVO DEL REPLY
========================================================= */

async function getTargetFromReply(message) {

    if (!message.reference?.messageId) {
        return null;
    }

    try {

        const referenced =
            await message.fetchReference();

        return referenced.author;

    } catch (error) {

        console.error(
            "[MITTY] ❌ No pude obtener el mensaje respondido.",
            error
        );

        return null;
    }
}

/* =========================================================
   EMOJIS
========================================================= */

function getButtonEmoji(category) {

    const emojis = {

        Hug: "🤗",
        Pat: "🥰",
        Boop: "👉",
        Cuddle: "🫂",
        Poke: "👉",
        Meow: "🐱"

    };

    return emojis[category] || "💗";
}

/* =========================================================
   INTERACCIÓN
========================================================= */

async function sendInteraction({

    message,
    category,
    actionText,
    buttonText

}) {

    const target =
        await getTargetFromReply(message);

    /* -----------------------------------------------
       No respondió a nadie
    ------------------------------------------------ */

    if (!target) {

        await message.reply(
            "💗 Debes responder al mensaje de alguien para usar este comando."
        );

        return;
    }

    /* -----------------------------------------------
       No permitirse a sí mismo
    ------------------------------------------------ */

    if (target.id === message.author.id) {

        await message.reply(
            "💗 No puedes hacerte esta interacción a ti mismo. ¡Responde al mensaje de otra persona!"
        );

        return;
    }

    /* -----------------------------------------------
       GIF
    ------------------------------------------------ */

    const gif =
        await getRandomGif(category);

    if (!gif) {

        await message.reply(
            "😿 No pude conseguir un GIF en este momento. Inténtalo de nuevo."
        );

        return;
    }

    /* -----------------------------------------------
       EMBED
    ------------------------------------------------ */

    const embed =
        new EmbedBuilder()
            .setColor(0xff9fcf)
            .setDescription(
                `${message.author} ${actionText} ${target}!`
            )
            .setImage(gif)
            .setFooter({
                text: "— Mitty 💗"
            })
            .setTimestamp();

    /* -----------------------------------------------
       ID DEL BOTÓN

       Guardamos:
       categoría
       autor
       objetivo
       tiempo de creación

       Así sabemos exactamente quién puede devolverlo.
    ------------------------------------------------ */

    const createdAt =
        Date.now();

    const customId =
        `mitty_${category.toLowerCase()}_${message.author.id}_${target.id}_${createdAt}`;

    const button =
        new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(buttonText)
            .setEmoji(
                getButtonEmoji(category)
            )
            .setStyle(ButtonStyle.Primary);

    const row =
        new ActionRowBuilder()
            .addComponents(button);

    /* -----------------------------------------------
       ENVIAR
    ------------------------------------------------ */

    const sentMessage =
        await message.reply({

            embeds: [embed],

            components: [row]

        });

    /* -----------------------------------------------
       EXPIRACIÓN: 2 MINUTOS
    ------------------------------------------------ */

    setTimeout(
        async () => {

            try {

                const expiredButton =
                    new ButtonBuilder()
                        .setCustomId(
                            `mitty_expired_${createdAt}`
                        )
                        .setLabel(
                            buttonText
                        )
                        .setEmoji(
                            getButtonEmoji(category)
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                        .setDisabled(true);

                const expiredRow =
                    new ActionRowBuilder()
                        .addComponents(
                            expiredButton
                        );

                await sentMessage.edit({
                    components: [
                        expiredRow
                    ]
                });

            } catch (error) {

                console.error(
                    "[MITTY] ❌ No pude desactivar el botón:",
                    error
                );
            }

        },
        120000
    );
}

/* =========================================================
   COMANDOS BÁSICOS
========================================================= */

async function ping(message) {

    const ping =
        message.client.ws.ping;

    await message.reply(
        `🏓 **Pong!** ${ping}ms`
    );
}

async function help(
    message,
    commands,
    prefix
) {

    const embed =
        new EmbedBuilder()
            .setColor(0xff9fcf)
            .setTitle("📖 Ayuda de Mitty")
            .setDescription(
                `Usa \`${prefix}comando\` para ejecutar un comando.`
            );

    if (
        Array.isArray(commands) &&
        commands.length
    ) {

        embed.addFields({
            name: "🐾 Comandos",
            value:
                commands
                    .map(
                        command =>
                            `\`${prefix}${command}\``
                    )
                    .join(", ")
                    .slice(0, 1024)
        });

    } else if (
        commands &&
        typeof commands === "object"
    ) {

        const names =
            Object.keys(commands);

        if (names.length) {

            embed.addFields({
                name: "🐾 Comandos",
                value:
                    names
                        .map(
                            command =>
                                `\`${prefix}${command}\``
                        )
                        .join(", ")
                        .slice(0, 1024)
            });
        }
    }

    embed.addFields({

        name: "💗 Interacciones",

        value:
            "`m;hug` · `m;pat` · `m;boop`\n" +
            "`m;cuddle` · `m;poke` · `m;meow`\n\n" +
            "💡 Responde al mensaje de alguien para usar una interacción."

    });

    await message.reply({
        embeds: [embed]
    });
}

/* =========================================================
   INTERACCIONES
========================================================= */

async function hug(message) {

    await sendInteraction({

        message,

        category: "Hug",

        actionText:
            "le dio un abrazo a",

        buttonText:
            "Devolver un abrazo"

    });
}

async function pat(message) {

    await sendInteraction({

        message,

        category: "Pat",

        actionText:
            "le dio palmaditas a",

        buttonText:
            "Devolver palmaditas"

    });
}

async function boop(message) {

    await sendInteraction({

        message,

        category: "Boop",

        actionText:
            "le hizo boop a",

        buttonText:
            "Devolver boop"

    });
}

async function cuddle(message) {

    await sendInteraction({

        message,

        category: "Cuddle",

        actionText:
            "se acurrucó con",

        buttonText:
            "Devolver acurrucón"

    });
}

async function poke(message) {

    await sendInteraction({

        message,

        category: "Poke",

        actionText:
            "le hizo poke a",

        buttonText:
            "Devolver poke"

    });
}

async function meow(message) {

    await sendInteraction({

        message,

        category: "Meow",

        actionText:
            "le maulló a",

        buttonText:
            "Devolver maullido"

    });
}

/* =========================================================
   BOTONES
========================================================= */

export async function handleButton(interaction) {

    if (!interaction.isButton()) {
        return false;
    }

    const id =
        interaction.customId;

    if (!id.startsWith("mitty_")) {
        return false;
    }

    /* -----------------------------------------------
       BOTÓN EXPIRADO
    ------------------------------------------------ */

    if (id.startsWith("mitty_expired_")) {

        await interaction.reply({

            content:
                "⏰ Este botón ya expiró.",

            ephemeral: true

        });

        return true;
    }

    /* -----------------------------------------------
       FORMATO:

       mitty_categoria_autor_objetivo_timestamp
    ------------------------------------------------ */

    const parts =
        id.split("_");

    if (parts.length !== 5) {

        await interaction.reply({

            content:
                "❌ Este botón no es válido.",

            ephemeral: true

        });

        return true;
    }

    const category =
        parts[1];

    const authorId =
        parts[2];

    const targetId =
        parts[3];

    const createdAt =
        Number(parts[4]);

    /* -----------------------------------------------
       COMPROBAR EXPIRACIÓN
    ------------------------------------------------ */

    if (
        !Number.isFinite(createdAt) ||
        Date.now() - createdAt >= 120000
    ) {

        await interaction.reply({

            content:
                "⏰ Este botón ya expiró.",

            ephemeral: true

        });

        return true;
    }

    /* -----------------------------------------------
       SOLO EL OBJETIVO PUEDE DEVOLVER
    ------------------------------------------------ */

    if (
        interaction.user.id !== targetId
    ) {

        await interaction.reply({

            content:
                "💗 Este botón es solamente para la persona que recibió la interacción.",

            ephemeral: true

        });

        return true;
    }

    /* -----------------------------------------------
       CATEGORÍA
    ------------------------------------------------ */

    const categoryMap = {

        hug: "Hug",
        pat: "Pat",
        boop: "Boop",
        cuddle: "Cuddle",
        poke: "Poke",
        meow: "Meow"

    };

    const realCategory =
        categoryMap[category];

    if (!realCategory) {

        await interaction.reply({

            content:
                "❌ Interacción desconocida.",

            ephemeral: true

        });

        return true;
    }

    /* -----------------------------------------------
       NUEVO GIF
    ------------------------------------------------ */

    const gif =
        await getRandomGif(
            realCategory
        );

    if (!gif) {

        await interaction.reply({

            content:
                "😿 No pude conseguir otro GIF ahora mismo.",

            ephemeral: true

        });

        return true;
    }

    /* -----------------------------------------------
       TEXTO
    ------------------------------------------------ */

    const actionText = {

        Hug:
            "devolvió el abrazo a",

        Pat:
            "devolvió las palmaditas a",

        Boop:
            "devolvió el boop a",

        Cuddle:
            "devolvió el acurrucón a",

        Poke:
            "devolvió el poke a",

        Meow:
            "devolvió el maullido a"

    };

    /* -----------------------------------------------
       EMBED DE RESPUESTA
    ------------------------------------------------ */

    const embed =
        new EmbedBuilder()
            .setColor(0xffb6d9)
            .setDescription(
                `${interaction.user} ${actionText[realCategory]} <@${authorId}>!`
            )
            .setImage(gif)
            .setFooter({
                text: "— Mitty 💗"
            })
            .setTimestamp();

    /* -----------------------------------------------
       ACTUALIZAR MENSAJE
    ------------------------------------------------ */

    await interaction.update({

        embeds: [embed],

        components: []

    });

    return true;
}

/* =========================================================
   HANDLER PRINCIPAL
========================================================= */

export async function handleCommand({

    message,
    commandName,
    args,
    commands,
    config,
    prefix,
    ownerId,
    getNextStatus,
    getNextThinking,
    reloadStatus

}) {

    if (message.author.bot) {
        return false;
    }

    const command =
        String(commandName || "")
            .toLowerCase();

    try {

        switch (command) {

            /* -------------------------
               BÁSICOS
            ------------------------- */

            case "ping":
                await ping(message);
                return true;

            case "help":
            case "ayuda":
                await help(
                    message,
                    commands,
                    prefix
                );
                return true;

            /* -------------------------
               INTERACCIONES
            ------------------------- */

            case "hug":
            case "abrazo":
                await hug(message);
                return true;

            case "pat":
            case "palmaditas":
                await pat(message);
                return true;

            case "boop":
                await boop(message);
                return true;

            case "cuddle":
            case "acurrucon":
            case "acurrucón":
                await cuddle(message);
                return true;

            case "poke":
                await poke(message);
                return true;

            case "meow":
            case "miau":
                await meow(message);
                return true;

            /* -------------------------
               COMANDO DESCONOCIDO
            ------------------------- */

            default:
                return false;
        }

    } catch (error) {

        console.error(
            `[MITTY] ❌ Error ejecutando ${command}:`,
            error
        );

        await message.reply(
            "🐾 ¡Ay! Algo salió mal mientras intentaba hacer eso."
        ).catch(() => {});

        return false;
    }
}

/* =========================================================
   EXPORTACIONES
========================================================= */

export {
    hug,
    pat,
    boop,
    cuddle,
    poke,
    meow
};
