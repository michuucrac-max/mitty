import { Client, GatewayIntentBits, Partials } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// ----------------------
// CONFIG
// ----------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

const LONGCAT_API_KEY = process.env.LONGCAT_API;

// Probabilidad de hablar como bebé furry (55%)
const BABY_FURRY_CHANCE = 0.55;

// ----------------------
// FUNCIÓN: estilo kawaii/furry/bebé
// ----------------------
function softiStyle(text) {
    const furryBaby = Math.random() < BABY_FURRY_CHANCE;

    if (!furryBaby) return text; // no se transforma

    // Transformación UwU bebé furry
    return text
        .replace(/r/g, "w")
        .replace(/l/g, "w")
        .replace(/R/g, "W")
        .replace(/L/g, "W")
        .replace(/n([aeiou])/gi, "ny$1")
        + " owo ✨💗";
}

// ----------------------
// FUNCIÓN: pedir respuesta a Longcat
// ----------------------
async function askLongcat(prompt, player) {
    try {
        const body = {
            messages: [
                {
                    role: "system",
                    content:
                        `Eres Softi, una IA kawaii, femenina, afelpada y dulce. ` +
                        `A veces hablas como una bebé furry (pero NO digas que estás dañada ni que tu cerebrito falló). ` +
                        `Trata al usuario con cariño y siempre mantente alegre. ` +
                        `El usuario se llama: ${player}.`
                },
                { role: "user", content: prompt }
            ]
        };

        const response = await fetch("https://api.longcat.ai/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LONGCAT_API_KEY}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!data.choices || !data.choices[0]) {
            return "Ay… no pude generar una respuesta ahora mismo >.< 💗";
        }

        let output = data.choices[0].message.content;
        return softiStyle(output);

    } catch (e) {
        console.error("Error Longcat:", e);
        return "Ups… algo falló, pero aquí sigo contigo 💗✨";
    }
}

// ----------------------
// EVENTO: LISTO
// ----------------------
client.on("ready", () => {
    console.log(`Softi está despierta como gatita kawaii >w< 💗 — Logueada como ${client.user.tag}`);
});

// ----------------------
// RESPONDER MENSAJES EN SERVIDORES + DMs
// ----------------------
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const player = message.author.username;
    const content = message.content;

    // Responde si la mencionan o si le hablan por DM
    const isDM = message.channel.type === 1; // DMs
    const mentioned = message.mentions.has(client.user);

    if (!isDM && !mentioned) return;

    // Eliminar mención del texto
    const text = content.replace(`<@${client.user.id}>`, "").trim();

    const reply = await askLongcat(text || "Hola Softi 💗", player);

    message.reply(reply).catch(() => {});
});

// ----------------------
// INICIAR BOT
// ----------------------
client.login(process.env.TOKEN);
