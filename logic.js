const {
    EmbedBuilder
} = require("discord.js");

// ============================================================
// MITTY — LOGIC
// Todas las funciones y comandos del bot viven aquí.
// ============================================================


// ============================================================
// PING
// ============================================================

async function ping(message) {
    const sent = await message.reply("🐾 Calculando mi latencia...");

    const latency = sent.createdTimestamp - message.createdTimestamp;
    const websocket = message.client.ws.ping;

    await sent.edit(
        `🏓 ¡Pong!\n\n` +
        `🐾 Latencia: **${latency}ms**\n` +
        `🌐 WebSocket: **${websocket}ms**`
    );
}


// ============================================================
// HELP
// ============================================================

async function help(message, commands, prefix) {

    const embed = new EmbedBuilder()
        .setTitle("🐾 Mitty — Ayuda")
        .setDescription(
            "¡Hola! Soy Mitty. 💗\n\n" +
            `Puedes utilizar mis comandos escribiendo \`${prefix}comando\`.\n\n` +
            "Estos son mis comandos básicos:"
        )
        .addFields(
            {
                name: "🌸 General",
                value:
                    `\`${prefix}help\` — Muestra esta ayuda.\n` +
                    `\`${prefix}ping\` — Comprueba mi latencia.`
            }
        )
        .setFooter({
            text: "¡Espero poder ayudarte! — Mitty"
        });

    return message.reply({
        embeds: [embed]
    });
}


// ============================================================
// BUSCADOR DE COMANDOS
// ============================================================
//
// Aquí podremos añadir comandos sin llenar index.js.
// ============================================================

const commandHandlers = {

    ping,

    help
};


// ============================================================
// EJECUTOR PRINCIPAL
// ============================================================

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

    const command = commandHandlers[commandName];

    // --------------------------------------------------------
    // COMANDO NO EXISTENTE
    // --------------------------------------------------------

    if (!command) {

        return message.reply(
            `🐾 No conozco \`${prefix}${commandName}\`.\n` +
            `Prueba \`${prefix}help\` para ver mis comandos.`
        );
    }

    // --------------------------------------------------------
    // EJECUTAR COMANDO
    // --------------------------------------------------------

    try {

        return await command(
            message,
            args,
            {
                commands,
                gifs,
                config,
                prefix,
                ownerId,
                getNextStatus,
                getNextThinking,
                reloadStatus
            }
        );

    } catch (error) {

        console.error(
            `❌ Error en el comando ${commandName}:`,
            error
        );

        return message.reply(
            "🐾 ¡Ay! Algo salió mal mientras intentaba hacer eso. 💦"
        ).catch(() => {});
    }
}


// ============================================================
// EXPORTACIONES
// ============================================================

export {
    handleCommand,
    handleHelp,
    ping,
    help
};
