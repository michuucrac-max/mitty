import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";
import { fileURLToPath } from "url";


// =========================================================
// 📁 CONFIGURACIÓN
// =========================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INTERACTIONS_FILE = path.join(
    __dirname,
    "interactions.json"
);

const PROFILE_FILE = path.join(
    __dirname,
    "profile.json"
);

const GIF_TOKEN = process.env.GIF_TOKEN;


// =========================================================
// 📖 CARGAR INTERACCIONES
// =========================================================

function loadInteractions() {

    try {

        if (!fs.existsSync(INTERACTIONS_FILE)) {
            return {
                commands: {},
                settings: {}
            };
        }

        return JSON.parse(
            fs.readFileSync(
                INTERACTIONS_FILE,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            "[MITTY] Error leyendo interactions.json:",
            error
        );

        return {
            commands: {},
            settings: {}
        };
    }
}


// =========================================================
// 🔎 BUSCAR INTERACCIÓN
// =========================================================

function findInteraction(commandName) {

    const data = loadInteractions();

    const search = commandName
        .toLowerCase()
        .trim();

    for (
        const [name, command]
        of Object.entries(data.commands || {})
    ) {

        if (
            name.toLowerCase() === search
        ) {

            return {
                name,
                command,
                settings: data.settings || {}
            };
        }

        const aliases =
            command.aliases || [];

        if (
            aliases.some(
                alias =>
                    alias.toLowerCase().trim() === search
            )
        ) {

            return {
                name,
                command,
                settings: data.settings || {}
            };
        }
    }

    return null;
}


// =========================================================
// 🎯 OBTENER OBJETIVO
// =========================================================

async function getTargetFromReply(message) {

    if (
        !message.reference ||
        !message.reference.messageId
    ) {
        return null;
    }

    try {

        const repliedMessage =
            await message.channel.messages.fetch(
                message.reference.messageId
            );

        return repliedMessage?.author || null;

    } catch (error) {

        console.error(
            "[MITTY] Error obteniendo objetivo:",
            error
        );

        return null;
    }
}


// =========================================================
// 🖼️ BUSCAR GIF
// =========================================================

async function getGIF(search) {

    if (!GIF_TOKEN) {
        return null;
    }

    try {

        const url = new URL(
            "https://api.giphy.com/v1/gifs/search"
        );

        url.searchParams.set(
            "api_key",
            GIF_TOKEN
        );

        url.searchParams.set(
            "q",
            search
        );

        url.searchParams.set(
            "rating",
            "g"
        );

        url.searchParams.set(
            "limit",
            "20"
        );

        const response =
            await fetch(
                url,
                {
                    headers: {
                        "User-Agent":
                            "Mitty Discord Bot/1.0"
                    },

                    signal:
                        AbortSignal.timeout(10000)
                }
            );

        if (!response.ok) {
            return null;
        }

        const data =
            await response.json();

        if (
            !data.data ||
            data.data.length === 0
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
            gif.url ||
            null
        );

    } catch (error) {

        console.error(
            "[MITTY] Error buscando GIF:",
            error
        );

        return null;
    }
}


// =========================================================
// 👤 PERFIL POR DEFECTO
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
// 📖 CARGAR PERFILES
// =========================================================

function loadProfiles() {

    try {

        if (!fs.existsSync(PROFILE_FILE)) {

            return {
                users: {}
            };
        }

        return JSON.parse(
            fs.readFileSync(
                PROFILE_FILE,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            "[MITTY] Error leyendo profile.json:",
            error
        );

        return {
            users: {}
        };
    }
}


// =========================================================
// 💾 GUARDAR PERFILES
// =========================================================

function saveProfiles(data) {

    try {

        fs.writeFileSync(
            PROFILE_FILE,
            JSON.stringify(
                data,
                null,
                4
            ),
            "utf8"
        );

    } catch (error) {

        console.error(
            "[MITTY] Error guardando profile.json:",
            error
        );
    }
}


// =========================================================
// 👤 ASEGURAR PERFIL
// =========================================================

function ensureProfile(data, userId) {

    if (!data.users[userId]) {

        data.users[userId] =
            createDefaultProfile();
    }

    const profile =
        data.users[userId];

    if (!profile.social) {
        profile.social = {
            status: "Soltero/a"
        };
    }

    if (!profile.interactions) {
        profile.interactions = {};
    }

    if (!profile.interactions.given) {
        profile.interactions.given = {};
    }

    if (!profile.interactions.received) {
        profile.interactions.received = {};
    }

    if (!profile.gifs) {
        profile.gifs = {};
    }

    if (
        typeof profile.gifs.sent !== "number"
    ) {
        profile.gifs.sent = 0;
    }

    if (
        typeof profile.gifs.received !== "number"
    ) {
        profile.gifs.received = 0;
    }

    if (!profile.stats) {
        profile.stats = {};
    }

    return profile;
}


// =========================================================
// 💞 REGISTRAR INTERACCIÓN
// =========================================================

function registerInteraction(
    senderId,
    receiverId,
    interactionName
) {

    const data =
        loadProfiles();

    const sender =
        ensureProfile(
            data,
            senderId
        );

    const receiver =
        ensureProfile(
            data,
            receiverId
        );

    if (
        typeof sender.interactions.given[
            interactionName
        ] !== "number"
    ) {

        sender.interactions.given[
            interactionName
        ] = 0;
    }

    sender.interactions.given[
        interactionName
    ]++;

    if (
        typeof receiver.interactions.received[
            interactionName
        ] !== "number"
    ) {

        receiver.interactions.received[
            interactionName
        ] = 0;
    }

    receiver.interactions.received[
        interactionName
    ]++;

    sender.gifs.sent++;
    receiver.gifs.received++;

    saveProfiles(data);
}


// =========================================================
// 💞 EJECUTAR INTERACCIÓN
// =========================================================

async function executeInteraction(
    message,
    interactionName,
    config,
    settings
) {

    if (config.enabled === false) {
        return true;
    }

    let target = null;

    if (
        settings.requireReply !== false
    ) {

        target =
            await getTargetFromReply(
                message
            );

        if (!target) {

            await message.reply(
                "🐾 Debes responder al mensaje de alguien para usar esta interacción."
            );

            return true;
        }
    }

    if (
        target &&
        settings.allowSelf === false &&
        target.id === message.author.id
    ) {

        await message.reply(
            "🐾 No puedes usar esta interacción contigo mismo."
        );

        return true;
    }

    let gif =
        await getGIF(
            config.gif?.search ||
            interactionName
        );

    if (
        !gif &&
        config.gif?.fallback
    ) {

        gif =
            await getGIF(
                config.gif.fallback
            );
    }

    if (target) {

        registerInteraction(
            message.author.id,
            target.id,
            interactionName
        );
    }

    const createdAt =
        Date.now();

    const buttonId = [
        "mitty",
        "interaction",
        interactionName.toLowerCase(),
        message.author.id,
        target?.id || "none",
        createdAt
    ].join("_");

    const button =
        new ButtonBuilder()
            .setCustomId(buttonId)
            .setLabel(
                config.texts?.button ||
                "🔄 Devolver"
            )
            .setStyle(
                ButtonStyle.Secondary
            );

    const row =
        new ActionRowBuilder()
            .addComponents(button);

    const embed =
        new EmbedBuilder()
            .setColor(0xff9fcf)
            .setDescription(
                `${config.emoji || "🐾"} **${message.author}** ` +
                `${config.texts?.action || "interactuó con"} ` +
                `**${target || "alguien"}**`
            )
            .setFooter({
                text:
                    "🐾 Mitty • Interacciones"
            });

    if (gif) {
        embed.setImage(gif);
    }

    await message.reply({
        embeds: [embed],
        components: [row]
    });

    return true;
}

// =========================================================
// 🔘 MANEJAR BOTONES
// =========================================================

async function handleButton(interaction) {

    if (!interaction.isButton()) {
        return false;
    }

    const id =
        interaction.customId;

    if (
        !id.startsWith(
            "mitty_interaction_"
        )
    ) {
        return false;
    }

    const parts =
        id.split("_");

    if (parts.length < 6) {
        return false;
    }

    const interactionName =
        parts[2];

    const originalAuthorId =
        parts[3];

    const originalTargetId =
        parts[4];

    const createdAt =
        Number(parts[5]);

    const data =
        loadInteractions();

    const expiration =
        Number(
            data.settings?.buttonExpiration
        ) || 120000;

    if (
        Date.now() - createdAt >
        expiration
    ) {

        await interaction.reply({

            content:
                "⏱️ Este botón ya expiró.",

            ephemeral:
                true
        });

        return true;
    }

    if (
        interaction.user.id !==
        originalTargetId
    ) {

        await interaction.reply({

            content:
                "🐾 Este botón está destinado a la persona que recibió la interacción.",

            ephemeral:
                true
        });

        return true;
    }

    const result =
        findInteraction(
            interactionName
        );

    if (!result) {

        await interaction.reply({

            content:
                "❌ Esta interacción ya no existe.",

            ephemeral:
                true
        });

        return true;
    }

    const config =
        result.command;

    let gif =
        await getGIF(
            config.gif?.search ||
            interactionName
        );

    if (
        !gif &&
        config.gif?.fallback
    ) {

        gif =
            await getGIF(
                config.gif.fallback
            );
    }

    registerInteraction(
        interaction.user.id,
        originalAuthorId,
        interactionName
    );

    const embed =
        new EmbedBuilder()
            .setColor(0xff9fcf)
            .setDescription(
                `${config.emoji || "🐾"} ` +
                `**${interaction.user}** ` +
                `${config.texts?.return || "devolvió la interacción a"} ` +
                `**<@${originalAuthorId}>**`
            )
            .setFooter({
                text:
                    "🐾 Mitty • Interacciones"
            });

    if (gif) {
        embed.setImage(gif);
    }

    const disabledButton =
        new ButtonBuilder()
            .setCustomId(id)
            .setLabel(
                config.texts?.button ||
                "🔄 Devolver"
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

    await interaction.update({

        embeds: [embed],

        components: [
            disabledRow
        ]
    });

    return true;
}


// =========================================================
// 💬 EJECUTAR COMANDO
// =========================================================

async function handleCommand(
    message,
    commandName,
    args = []
) {

    const result =
        findInteraction(
            commandName
        );

    if (!result) {
        return false;
    }

    return await executeInteraction(
        message,
        result.name,
        result.command,
        result.settings
    );
}


// =========================================================
// 📤 EXPORTAR
// =========================================================

export {

    handleCommand,

    handleButton,

    findInteraction,

    loadInteractions,

    registerInteraction

};
