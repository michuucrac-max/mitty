// =========================================================
// 📦 IMPORTACIONES
// =========================================================

import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

import fs from "fs";

import {
    loadProfileFromGitHub,
    markProfileDirty
} from "./githubStorage.js";

// =========================================================
// 📁 ARCHIVOS
// =========================================================

const INTERACTIONS_PATH = "./interactions.json";
const PROFILE_PATH = "./profile.json";
const UTILITY_PATH = "./utility.json";


// =========================================================
// 📄 CARGAR JSON
// =========================================================

function loadJSON(filePath, fallback = {}) {

    try {

        if (!fs.existsSync(filePath)) {
            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(
                filePath,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            `[MITTY] ❌ Error leyendo ${filePath}:`,
            error
        );

        return fallback;
    }
}


// =========================================================
// 💾 GUARDAR JSON
// =========================================================

function saveJSON(filePath, data) {

    try {

        fs.writeFileSync(
            filePath,
            JSON.stringify(
                data,
                null,
                4
            ),
            "utf8"
        );

        return true;

    } catch (error) {

        console.error(
            `[MITTY] ❌ Error guardando ${filePath}:`,
            error
        );

        return false;
    }
}


// =========================================================
// ⚙️ CONFIGURACIONES
// =========================================================

let interactionsConfig =
    loadJSON(
        INTERACTIONS_PATH,
        {
            commands: {},
            settings: {}
        }
    );


let utilityConfig =
    loadJSON(
        UTILITY_PATH,
        {
            commands: {},
            settings: {}
        }
    );


// =========================================================
// 👤 DATOS DE USUARIOS
// =========================================================

let profiles =
    loadJSON(
        PROFILE_PATH,
        {
            users: {}
        }
    );


// =========================================================
// 🧱 PERFIL PREDETERMINADO
// =========================================================

function createDefaultProfile() {

    return {

        stars: 0,

        social: {
            status: "Soltero/a"
        },

        interactions: {

            given: {},

            received: {}
        },

        gifs: {

            sent: 0,

            received: 0
        },

        stats: {

            messages: 0,

            commands: 0,

            summaries: 0
        }
    };
}


// =========================================================
// 🛡️ ASEGURAR PERFIL
// =========================================================

function ensureProfile(userId) {

    if (!profiles.users) {
        profiles.users = {};
    }


    if (!profiles.users[userId]) {

        profiles.users[userId] =
            createDefaultProfile();
    }


    const profile =
        profiles.users[userId];


    profile.stars ??= 0;


    profile.social ??= {};

    profile.social.status ??=
        "Soltero/a";


    profile.interactions ??= {};

    profile.interactions.given ??= {};

    profile.interactions.received ??= {};


    profile.gifs ??= {};

    profile.gifs.sent ??= 0;

    profile.gifs.received ??= 0;


    profile.stats ??= {};

    profile.stats.messages ??= 0;

    profile.stats.commands ??= 0;

    profile.stats.summaries ??= 0;


    return profile;
}


// =========================================================
// 💾 GUARDAR PERFILES
// =========================================================

function saveProfiles() {

    const saved =
        saveJSON(
            PROFILE_PATH,
            profiles
        );


    if (saved) {

        markProfileDirty();
    }


    return saved;
}


// =========================================================
// ☁️ RECUPERAR PERFILES DESDE GITHUB
// =========================================================

export async function initializeProfiles() {

    const remote =
        await loadProfileFromGitHub();


    if (!remote?.content) {

        console.log(
            "[MITTY] 💾 Usando profile.json local."
        );

        return;
    }


    try {

        const remoteProfiles =
            JSON.parse(
                remote.content
            );


        if (
            remoteProfiles &&
            typeof remoteProfiles === "object"
        ) {

            profiles =
                remoteProfiles;


            saveJSON(
                PROFILE_PATH,
                profiles
            );


            console.log(
                "[MITTY] ☁️ Perfil recuperado desde GitHub."
            );
        }

    } catch (error) {

        console.error(
            "[MITTY] ❌ profile.json remoto inválido:",
            error
        );
    }
}


// =========================================================
// 👤 OBTENER PERFIL
// =========================================================

export function getProfile(userId) {

    return ensureProfile(userId);
}


// =========================================================
// 🔍 BUSCAR INTERACCIÓN
// =========================================================

export function findInteraction(commandName) {

    const commands =
        interactionsConfig.commands || {};


    const normalized =
        commandName.toLowerCase();


    if (commands[normalized]) {

        return {

            name: normalized,

            config:
                commands[normalized]
        };
    }


    for (
        const [name, config]
        of Object.entries(commands)
    ) {

        const aliases =
            config.aliases || [];


        if (
            aliases
                .map(
                    alias =>
                        alias.toLowerCase()
                )
                .includes(normalized)
        ) {

            return {

                name,

                config
            };
        }
    }


    return null;
}


// =========================================================
// 🔄 RECARGAR INTERACTIONS.JSON
// =========================================================

export function loadInteractions() {

    interactionsConfig =
        loadJSON(
            INTERACTIONS_PATH,
            {
                commands: {},
                settings: {}
            }
        );


    return interactionsConfig;
}


// =========================================================
// ➕ REGISTRAR INTERACCIÓN
// =========================================================

export function registerInteraction(
    userId,
    interactionName,
    targetId
) {

    const userProfile =
        ensureProfile(userId);


    const targetProfile =
        ensureProfile(targetId);


    userProfile
        .interactions
        .given[interactionName] ??= 0;


    userProfile
        .interactions
        .given[interactionName]++;


    targetProfile
        .interactions
        .received[interactionName] ??= 0;


    targetProfile
        .interactions
        .received[interactionName]++;


    userProfile.gifs.sent++;

    targetProfile.gifs.received++;


    saveProfiles();
}

// =========================================================
// 🐾 MITTY • MOTOR UNIVERSAL
// PARTE 2/3
// =========================================================


// =========================================================
// 🎞️ OBTENER GIF DE GIPHY
// =========================================================

async function getGif(search) {

    const token =
        process.env.GIF_TOKEN;


    if (!token) {

        console.error(
            "[MITTY] ❌ Falta GIF_TOKEN."
        );

        return null;
    }


    const url =
        "https://api.giphy.com/v1/gifs/search" +
        `?api_key=${encodeURIComponent(token)}` +
        `&q=${encodeURIComponent(search)}` +
        "&rating=g" +
        "&limit=20";


    try {

        const controller =
            new AbortController();


        const timeout =
            setTimeout(
                () => controller.abort(),
                10000
            );


        const response =
            await fetch(
                url,
                {
                    method: "GET",

                    headers: {
                        "User-Agent":
                            "Mitty Discord Bot/1.0"
                    },

                    signal:
                        controller.signal
                }
            );


        clearTimeout(timeout);


        if (!response.ok) {

            throw new Error(
                `GIPHY ${response.status}`
            );
        }


        const data =
            await response.json();


        if (
            !data.data ||
            !data.data.length
        ) {

            return null;
        }


        const gif =
            data.data[
                Math.floor(
                    Math.random() *
                    data.data.length
                )
            ];


        return (
            gif.images?.original?.url ||
            gif.images?.downsized?.url ||
            null
        );

    } catch (error) {

        console.error(
            "[MITTY] ❌ Error obteniendo GIF:",
            error
        );

        return null;
    }
}


// =========================================================
// 🎯 OBTENER OBJETIVO DEL REPLY
// =========================================================

async function getTargetFromReply(message) {

    if (!message.reference?.messageId) {

        return null;
    }


    try {

        const replied =
            await message.channel.messages.fetch(
                message.reference.messageId
            );


        return replied.author;

    } catch {

        return null;
    }
}


// =========================================================
// 🧹 BORRAR MENSAJE DESPUÉS DE UN TIEMPO
// =========================================================

async function deleteAfter(
    message,
    time
) {

    if (!message) return;

    if (!time || time <= 0) return;


    setTimeout(
        async () => {

            try {

                await message.delete();

            } catch {}
        },
        time
    );
}


// =========================================================
// 📊 TOTAL DE INTERACCIONES
// =========================================================

function getInteractionTotal(data) {

    return Object.values(
        data || {}
    ).reduce(
        (total, value) =>
            total + Number(value || 0),
        0
    );
}


// =========================================================
// 📖 COMANDO HELP
// =========================================================

async function help(message) {

    const config =
        utilityConfig.commands?.help;


    if (
        !config ||
        !config.enabled
    ) {

        return;
    }


    const commands = [];


    // =====================================================
    // 🐾 INTERACCIONES
    // =====================================================

    for (
        const [name, command]
        of Object.entries(
            interactionsConfig.commands || {}
        )
    ) {

        if (!command.enabled) continue;


        commands.push(
            `${command.emoji || "🐾"} \`m;${name}\``
        );
    }


    // =====================================================
    // 📋 LISTA DE COMANDOS
    // =====================================================

    const embed =
        new EmbedBuilder()

            .setTitle(
                config.title ||
                "📖 Mitty • Centro de Ayuda"
            )

            .setDescription(
                `${config.description || ""}\n\n` +
                commands.join("\n")
            );


    const sent =
        await message.reply({
            embeds: [embed]
        });


    const deleteTime =
        config.deleteAfter ??
        utilityConfig.settings?.deleteAfter ??
        300000;


    deleteAfter(
        sent,
        deleteTime
    );


    deleteAfter(
        message,
        deleteTime
    );
}


// =========================================================
// 📊 COMANDO INTERACTIONS
// =========================================================

async function interactions(
    message,
    target
) {

    const config =
        utilityConfig.commands?.interactions;


    if (
        !config ||
        !config.enabled
    ) {

        return;
    }


    const user =
        target ||
        message.author;


    const profileData =
        ensureProfile(
            user.id
        );


    const given =
        profileData
            .interactions
            .given || {};


    const received =
        profileData
            .interactions
            .received || {};


    // =====================================================
    // 📤 INTERACCIONES DADAS
    // =====================================================

    const givenLines =
        Object.entries(given)

            .filter(
                ([, count]) =>
                    Number(count) > 0
            )

            .map(
                ([name, count]) =>
                    `🐾 **${count}** de **${name}**`
            );


    // =====================================================
    // 📥 INTERACCIONES RECIBIDAS
    // =====================================================

    const receivedLines =
        Object.entries(received)

            .filter(
                ([, count]) =>
                    Number(count) > 0
            )

            .map(
                ([name, count]) =>
                    `🐾 **${count}** de **${name}**`
            );


    const givenText =
        givenLines.length
            ? givenLines.join("\n")
            : "Ninguna todavía.";


    const receivedText =
        receivedLines.length
            ? receivedLines.join("\n")
            : "Ninguna todavía.";


    // =====================================================
    // 📊 EMBED
    // =====================================================

    const embed =
        new EmbedBuilder()

            .setTitle(
                `${config.title || "📊 Estadísticas de Interacciones"} • ${user.username}`
            )

            .setThumbnail(
                user.displayAvatarURL({
                    size: 256
                })
            )

            .addFields(

                {
                    name: "📤 Ha dado",

                    value:
                        givenText,

                    inline: true
                },

                {
                    name: "📥 Ha recibido",

                    value:
                        receivedText,

                    inline: true
                },

                {
                    name: "📤 Total dadas",

                    value:
                        `${getInteractionTotal(given)}`,

                    inline: true
                },

                {
                    name: "📥 Total recibidas",

                    value:
                        `${getInteractionTotal(received)}`,

                    inline: true
                }
            );


    const sent =
        await message.reply({
            embeds: [embed]
        });


    const deleteTime =
        config.deleteAfter ??
        utilityConfig.settings?.deleteAfter ??
        300000;


    deleteAfter(
        sent,
        deleteTime
    );


    deleteAfter(
        message,
        deleteTime
    );
}


// =========================================================
// 👤 COMANDO PROFILE
// =========================================================

async function profile(
    message,
    target
) {

    const user =
        target ||
        message.author;


    const data =
        ensureProfile(
            user.id
        );


    const givenTotal =
        getInteractionTotal(
            data.interactions.given
        );


    const receivedTotal =
        getInteractionTotal(
            data.interactions.received
        );


    // =====================================================
    // 🪪 PERFIL
    // =====================================================

    const embed =
        new EmbedBuilder()

            .setTitle(
                `🐾 Perfil de ${user.username}`
            )

            .setThumbnail(
                user.displayAvatarURL({
                    size: 512
                })
            )

            .addFields(

                {
                    name: "⭐ Stars",

                    value:
                        `${data.stars}`,

                    inline: true
                },

                {
                    name: "💭 Estado",

                    value:
                        data.social.status,

                    inline: true
                },

                {
                    name: "📤 Interacciones dadas",

                    value:
                        `${givenTotal}`,

                    inline: true
                },

                {
                    name: "📥 Interacciones recibidas",

                    value:
                        `${receivedTotal}`,

                    inline: true
                },

                {
                    name: "🎞️ GIF enviados",

                    value:
                        `${data.gifs.sent}`,

                    inline: true
                },

                {
                    name: "🎞️ GIF recibidos",

                    value:
                        `${data.gifs.received}`,

                    inline: true
                },

                {
                    name: "💬 Mensajes",

                    value:
                        `${data.stats.messages}`,

                    inline: true
                },

                {
                    name: "⚙️ Comandos",

                    value:
                        `${data.stats.commands}`,

                    inline: true
                },

                {
                    name: "📝 Resúmenes",

                    value:
                        `${data.stats.summaries}`,

                    inline: true
                }
            );


    const sent =
        await message.reply({
            embeds: [embed]
        });


    deleteAfter(
        sent,
        300000
    );


    deleteAfter(
        message,
        300000
    );
}

// =========================================================
// 🐾 MITTY • MOTOR UNIVERSAL
// PARTE 3/3
// =========================================================


// =========================================================
// 🐾 EJECUTAR INTERACCIÓN
// =========================================================

async function executeInteraction(
    message,
    interactionName,
    config,
    target
) {

    const settings =
        interactionsConfig.settings || {};


    if (!config.enabled) {
        return;
    }


    // =====================================================
    // 🎯 COMPROBAR REPLY
    // =====================================================

    if (
        settings.requireReply !== false &&
        !target
    ) {

        const reply =
            await message.reply(
                "🐾 Debes responder a un mensaje para usar esta interacción."
            );


        deleteAfter(
            reply,
            300000
        );

        return;
    }


    if (!target) {
        return;
    }


    // =====================================================
    // 🚫 EVITAR SELF
    // =====================================================

    if (
        settings.allowSelf === false &&
        target.id === message.author.id
    ) {

        const reply =
            await message.reply(
                "🐾 No puedes usar esta interacción contigo mismo."
            );


        deleteAfter(
            reply,
            300000
        );

        return;
    }


    // =====================================================
    // 🎞️ GIF
    // =====================================================

    const gif =
        await getGif(
            config.gif?.search ||
            `anime ${interactionName}`
        );


    if (!gif) {

        const reply =
            await message.reply(
                "🐾 No encontré un GIF para esta interacción."
            );


        deleteAfter(
            reply,
            300000
        );

        return;
    }


    // =====================================================
    // 📊 REGISTRAR ESTADÍSTICAS
    // =====================================================

    registerInteraction(
        message.author.id,
        interactionName,
        target.id
    );


    // =====================================================
    // 📝 TEXTO
    // =====================================================

    const actionText =
        config.texts?.action ||
        "interactuó con";


    const buttonText =
        config.texts?.button ||
        "🔄 Devolver";


    // =====================================================
    // 🖼️ EMBED
    // =====================================================

    const embed =
        new EmbedBuilder()

            .setDescription(
                `${config.emoji || "🐾"} **${message.author.username}** ${actionText} **${target.username}**`
            )

            .setImage(gif);


    // =====================================================
    // 🔘 BOTÓN DE RESPUESTA
    // =====================================================

    const button =
        new ButtonBuilder()

            .setCustomId(
                [
                    "mitty",
                    "interaction",
                    interactionName,
                    message.author.id,
                    target.id,
                    Date.now()
                ].join("_")
            )

            .setLabel(
                buttonText
            )

            .setStyle(
                ButtonStyle.Secondary
            );


    const row =
        new ActionRowBuilder()
            .addComponents(button);


    // =====================================================
    // 📤 ENVIAR
    // =====================================================

    const sent =
        await message.channel.send({

            embeds: [
                embed
            ],

            components: [
                row
            ]
        });


    // =====================================================
    // 🧹 BORRAR EN 5 MINUTOS
    // =====================================================

    deleteAfter(
        sent,
        300000
    );


    deleteAfter(
        message,
        300000
    );
}


// =========================================================
// ⚙️ EJECUTAR COMANDO
// =========================================================

export async function handleCommand(
    message,
    commandName,
    args = []
) {

    const normalized =
        commandName.toLowerCase();


    // =====================================================
    // 📊 CONTAR COMANDO
    // =====================================================

    const authorProfile =
        ensureProfile(
            message.author.id
        );


    authorProfile.stats.commands++;


    saveProfiles();


    // =====================================================
    // 📖 HELP
    // =====================================================

    if (
        normalized === "help" ||
        normalized === "ayuda"
    ) {

        await help(message);

        return;
    }


    // =====================================================
    // 👤 PROFILE
    // =====================================================

    if (
        normalized === "profile" ||
        normalized === "perfil"
    ) {

        await profile(
            message,
            message.mentions.users.first() || null
        );

        return;
    }


    // =====================================================
    // 📊 INTERACTIONS
    // =====================================================

    if (
        normalized === "interactions" ||
        normalized === "stats" ||
        normalized === "estadisticas" ||
        normalized === "estadísticas"
    ) {

        await interactions(
            message,
            message.mentions.users.first() || null
        );

        return;
    }


    // =====================================================
    // 🐾 BUSCAR INTERACCIÓN
    // =====================================================

    const interaction =
        findInteraction(
            normalized
        );


    if (!interaction) {
        return;
    }


    // =====================================================
    // 🎯 OBTENER OBJETIVO
    // =====================================================

    const target =
        await getTargetFromReply(
            message
        );


    // =====================================================
    // 🐾 EJECUTAR
    // =====================================================

    await executeInteraction(
        message,
        interaction.name,
        interaction.config,
        target
    );
}


// =========================================================
// 🔘 MANEJAR BOTONES
// =========================================================

export async function handleButton(
    interaction
) {

    const parts =
        interaction.customId.split("_");


    // =====================================================
    // 🔎 COMPROBAR BOTÓN MITTY
    // =====================================================

    if (
        parts[0] !== "mitty" ||
        parts[1] !== "interaction"
    ) {

        return;
    }


    const interactionName =
        parts[2];


    const authorId =
        parts[3];


    const targetId =
        parts[4];


    const timestamp =
        Number(parts[5]);


    // =====================================================
    // ⏱️ EXPIRACIÓN
    // =====================================================

    const expiration =
        Number(
            interactionsConfig
                .settings
                ?.buttonExpiration
        ) || 120000;


    if (
        Date.now() - timestamp >
        expiration
    ) {

        await interaction.reply({

            content:
                "⏱️ Este botón ya expiró.",

            ephemeral: true
        });

        return;
    }


    // =====================================================
    // 🎯 SOLO EL DESTINATARIO
    // =====================================================

    if (
        interaction.user.id !== targetId
    ) {

        await interaction.reply({

            content:
                "🐾 Este botón no es para ti.",

            ephemeral: true
        });

        return;
    }


    // =====================================================
    // ⚙️ CONFIGURACIÓN
    // =====================================================

    const config =
        interactionsConfig
            .commands
            ?.[interactionName];


    if (
        !config ||
        !config.enabled
    ) {

        await interaction.reply({

            content:
                "❌ Esta interacción ya no está disponible.",

            ephemeral: true
        });

        return;
    }


    // =====================================================
    // 🎞️ GIF DE RESPUESTA
    // =====================================================

    const gif =
        await getGif(
            config.gif?.search ||
            `anime ${interactionName}`
        );


    if (!gif) {

        await interaction.reply({

            content:
                "🐾 No encontré un GIF para responder.",

            ephemeral: true
        });

        return;
    }


    // =====================================================
    // 📊 REGISTRAR RESPUESTA
    // =====================================================

    registerInteraction(
        interaction.user.id,
        interactionName,
        authorId
    );


    // =====================================================
    // 📝 TEXTO DE RESPUESTA
    // =====================================================

    const returnText =
        config.texts?.return ||
        "respondió a";


    // =====================================================
    // 🖼️ NUEVO EMBED
    // =====================================================

    const embed =
        new EmbedBuilder()

            .setDescription(
                `${config.emoji || "🐾"} **${interaction.user.username}** ${returnText} **<@${authorId}>**`
            )

            .setImage(gif);


    // =====================================================
    // 🔒 BOTÓN DESACTIVADO
    // =====================================================

    const disabledButton =
        new ButtonBuilder()

            .setCustomId(
                interaction.customId
            )

            .setLabel(
                config.texts?.button ||
                "🔄 Responder"
            )

            .setStyle(
                ButtonStyle.Secondary
            )

            .setDisabled(true);


    const row =
        new ActionRowBuilder()
            .addComponents(
                disabledButton
            );


    // =====================================================
    // ✏️ ACTUALIZAR MENSAJE
    // =====================================================

    try {

        await interaction.update({

            embeds: [
                embed
            ],

            components: [
                row
            ]
        });

    } catch (error) {

        console.error(
            "[MITTY] ❌ Error actualizando interacción:",
            error
        );
    }
}


// =========================================================
// ☁️ GUARDADO AUTOMÁTICO
// =========================================================

const saveInterval =
    Number(
        process.env.SAVE_INTERVAL
    ) || 30000;


setInterval(
    async () => {

        try {

            const {
                flushProfileToGitHub
            } = await import(
                "./githubStorage.js"
            );


            await flushProfileToGitHub();

        } catch (error) {

            console.error(
                "[MITTY] ❌ Error en guardado automático:",
                error
            );
        }

    },
    saveInterval
);


// =========================================================
// 📤 EXPORTACIONES
// =========================================================

export {
    saveProfiles
};
