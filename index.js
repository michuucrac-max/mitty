// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";
import fetch from "node-fetch"; // para llamadas HTTP a Longcat

// ============================
// Carga de environment
// ============================
import { config } from "dotenv";
config({ path: "./environments" }); // como pediste

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const LONGCAT_API = process.env.LONGCAT_API; // <-- LONGCAT API desde environments

// ============================
// Cliente de Discord
// ============================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();

// ============================
// Cargar comandos desde cmd.json
// ============================
const rawCmds = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
const slashCommands = [];

// Formato tipo array (lo que usas)
for (const cmd of rawCmds) {
    const slash = {
        name: cmd.name,
        description: cmd.description,
        options: [
            {
                name: "target",
                description: "Menciona a alguien",
                type: 6, // USER
                required: true
            }
        ]
    };

    slashCommands.push(slash);
    client.commands.set(cmd.name, cmd);
}

// ============================
// Registrar comandos en Discord
// ============================
async function registerSlashCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log("Registrando slash commands…");

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: slashCommands }
        );

        console.log("Comandos registrados correctamente ✔");
    } catch (error) {
        console.error("Error registrando comandos:", error);
    }
}

// ============================
// Evento: CLIENTREADY
// ============================
client.once(Events.ClientReady, async () => {
    console.log(`✨ Softi Tales está encendido como ${client.user.tag}`);

    await registerSlashCommands();

    // Estado kawaii
    client.user.setPresence({
        activities: [
            { name: "Softi Tales 24/7 ✨", type: 3 }
        ],
        status: "idle"
    });
});

// ============================
// Ejecutar slash commands
// ============================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    const player = interaction.user;
    const target = interaction.options.getUser("target");

    // Reemplazo de variables
    let response = cmd.response
        .replaceAll("{user}", `<@${player.id}>`)
        .replaceAll("{player}", `<@${player.id}>`)
        .replaceAll("{target}", `<@${target.id}>`);

    try {
        await interaction.reply(response);
    } catch (error) {
        console.error("Error ejecutando un comando:", error);
        interaction.reply({ content: "❌ Hubo un error ejecutando este comando.", ephemeral: true });
    }
});

// ============================
// Login
// ============================
client.login(TOKEN);

// ==================================================
//  AÑADIDO: integración Longcat + estilo kawaii/baby
//  (no toca nada de lo anterior, solo lo complementa)
// ==================================================

// Validación mínima
if (!LONGCAT_API) {
    console.warn("⚠️ LONGCAT_API no encontrada en environments. Añade LONGCAT_API en Render.");
}

// Construye el prompt para Longcat con 40% baby furry
function buildSystemPrompt(isBaby) {
    if (isBaby) {
        return "Eres Softi, una IA completamente femenina, kawaii y adorable. Habla como una bebé furry: voz suave, palabras infantiles, usa 'uwu', 'owO', diminutivos y sonidos lindos, pero mantén coherencia y responde en español.";
    }
    return "Eres Softi, una IA femenina, kawaii/furry/uwu: dulce, amable y cariñosa. Responde en español manteniendo claridad y ternura.";
}

// Llamada a Longcat
async function askLongcat(userMessage) {
    try {
        const isBaby = Math.random() < 0.40; // 40% probabilidad
        const systemPrompt = buildSystemPrompt(isBaby);

        const body = {
            model: "longcat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature: 0.8
        };

        const res = await fetch("https://api.longcat.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LONGCAT_API}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        // Manejo robusto de la respuesta
        if (!data) return "Lo siento… no pude generar una respuesta ahora mismo.";
        // varias APIs retornan distintas estructuras, chequeamos defensivamente
        const text =
            data.choices?.[0]?.message?.content ||
            data.choices?.[0]?.text ||
            data.output?.[0]?.content?.[0]?.text ||
            null;

        if (!text) return "Lo siento… no pude generar una respuesta ahora mismo.";

        return String(text);
    } catch (err) {
        console.error("Error llamando a Longcat:", err);
        // En lugar de mensajes raros, devolvemos una respuesta amable de fallback
        return "Ups… tuve un problemita pensando. Pero dime otra cosa y lo intento de nuevo 💖";
    }
}

// Evita interferir con slash commands o comandos textuales que empiecen con '/'
// Responde solo a menciones o prefijos "softi", "softi!", "softi:" en servidores o en DMs
client.on(Events.MessageCreate, async (message) => {
    try {
        if (message.author?.bot) return;

        const content = (message.content || "").trim();
        if (!content) return;

        // No queremos interferir con slash commands ni con mensajes que empiezan con '/'
        if (content.startsWith("/")) return;

        // Prefijos por los que Softi debe responder
        const lowered = content.toLowerCase();
        const prefixes = ["softi", "softi:", "softi!", "softi?"];

        const isPrefixed = prefixes.some(p => lowered.startsWith(p));
        const isMentioned = message.mentions?.has?.(client.user?.id);

        // Si no es DM ni servidor y no se cumple ninguna condición, salimos
        const isDM = !message.guild;

        if (!isPrefixed && !isMentioned && !isDM) return;

        // Extraer texto limpio (quitar mención si existe)
        let prompt = content.replace(new RegExp(`<@!?${client.user?.id}>`, "g"), "").trim();

        // Si quedó vacío (p. ej. solo mencionaron al bot), usar saludo base
        if (!prompt) prompt = "Hola Softi, ¿cómo estás?";

        const reply = await askLongcat(prompt);

        // responder (si el canal permite envío)
        await message.reply(reply);
    } catch (err) {
        console.error("Error en MessageCreate handler:", err);
    }
});
