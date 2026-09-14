import { EmbedBuilder } from "discord.js";

// ==========================================
// UTILIDADES
// ==========================================

function getRandomGif(gifs, category) {
    const group = gifs?.[category];

    if (!group) return null;

    const urls = Object.values(group).filter(
        value => typeof value === "string" && value.length > 0
    );

    if (!urls.length) return null;

    return urls[Math.floor(Math.random() * urls.length)];
}

// ==========================================
// PING
// ==========================================

async function ping(message) {
    const sent = await message.reply("🐾 Calculando mi latencia...");

    const messageLatency = sent.createdTimestamp - message.createdTimestamp;
    const websocketLatency = message.client.ws.ping;

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
            "También tengo algunas sorpresas que puedes descubrir..."
        )
        .setColor(0xffb6d9);

    const entries = Object.entries(commands);

    if (entries.length) {
        for (const [name, data] of entries) {
            embed.addFields({
                name: `${prefix}${name}`,
                value: data.description || "Sin descripción.",
                inline: false
            });
        }
    }

    embed.addFields({
        name: "🐾 Interacciones",
        value:
            `${prefix}hug\n` +
            `${prefix}pat\n` +
            `${prefix}boop\n` +
            `${prefix}cuddle\n` +
            `${prefix}poke\n` +
            `${prefix}meow`,
        inline: false
    });

    embed.setFooter({
        text: "🌸 ¡Quiero descubrirlas todas contigo!"
    });

    await message.reply({
        embeds: [embed]
    });
}

// ==========================================
// INTERACCIONES
// ==========================================

async function interaction(message, category, text, gifs) {
    const gif = getRandomGif(gifs, category);

    if (gif) {
        await message.reply({
            content: text,
            files: [gif]
        });

        return;
    }

    await message.reply(text);
}

async function hug(message, args, gifs) {
    const target = args.length
        ? args.join(" ")
        : "alguien";

    await interaction(
        message,
        "Hug",
        `🌸💖 ¡Un abracito para ${target}! 🐾💕`,
        gifs
    );
}

async function pat(message, args, gifs) {
    const target = args.length
        ? args.join(" ")
        : "alguien";

    await interaction(
        message,
        "Pat",
        `🐾💕 ¡Pat pat para ${target}! ¡Jeje! 🌸`,
        gifs
    );
}

async function boop(message, args, gifs) {
    const target = args.length
        ? args.join(" ")
        : "alguien";

    await interaction(
        message,
        "Boop",
        `👉🐾 ¡Boop para ${target}! ✨`,
        gifs
    );
}

async function cuddle(message, args, gifs) {
    const target = args.length
        ? args.join(" ")
        : "alguien";

    await interaction(
        message,
        "Cuddle",
        `🥰🐾 ¡Quiero acurrucarme con ${target}! 💕`,
        gifs
    );
}

async function poke(message, args, gifs) {
    const target = args.length
        ? args.join(" ")
        : "alguien";

    await interaction(
        message,
        "Poke",
        `👉👀 ¡Poke poke, ${target}! 🐾`,
        gifs
    );
}

async function meow(message, args, gifs) {
    await interaction(
        message,
        "Meow",
        "🐾🌸 ¡Miau! ¿Has escuchado eso? ¡Jeje! 💕",
        gifs
    );
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
    const handler = commandHandlers[commandName];

    if (!handler) {
        return message.reply(
            `🐾 ¡Mmm! No conozco el comando \`${prefix}${commandName}\`.\n` +
            `🌸 Prueba \`${prefix}help\` para ver lo que puedo hacer.`
        );
    }

    if (commandName === "ping") {
        return handler(message);
    }

    if (commandName === "help") {
        return handler(message, commands, prefix);
    }

    return handler(message, args, gifs, config);
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
