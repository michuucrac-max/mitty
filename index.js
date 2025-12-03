// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";
import fetch from "node-fetch";

// ============================
// Carga de environment
// ============================
import { config } from "dotenv";
config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const LONGCAT_API = process.env.LONGCAT_API;

// LOGS
console.log("=======================================");
console.log("   SOFTI TALES — LOGS ACTIVADOS ✔");
console.log("=======================================");
console.log("TOKEN:", TOKEN ? "✔ Cargado" : "❌ Faltante");
console.log("CLIENT_ID:", CLIENT_ID ? "✔ Cargado" : "❌ Faltante");
console.log("OWNER_ID:", OWNER_ID ? "✔ Cargado" : "❌ Faltante");
console.log("LONGCAT_API:", LONGCAT_API ? "✔ Cargada" : "❌ Faltante");
console.log("=======================================\n");

// ============================
// Cliente
// ============================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();

// ============================
// Cargar comandos desde cmd.json
// ============================
console.log("📦 Cargando comandos desde cmd.json...");
const rawCmds = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
const slashCommands = [];

for (const cmd of rawCmds) {
    const slash = {
        name: cmd.name,
        description: cmd.description,
        options: [
            {
                name: "target",
                description: "Menciona a alguien",
                type: 6,
                required: true
            }
        ]
    };

    slashCommands.push(slash);
    client.commands.set(cmd.name, cmd);
}

console.log(`✔ Comandos cargados: ${rawCmds.length}`);

// ============================
// Registrar comandos
// ============================
async function registerSlashCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log("🚀 Registrando slash commands en Discord...");
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: slashCommands }
        );
        console.log("✔ Slash commands registrados correctamente.");
    } catch (error) {
        console.error("❌ Error registrando comandos:", error);
    }
}

// ============================
// IA LongCat
// ============================
async function longcatAI(message) {
    try {
        console.log("🧠 IA LongCat activada para mensaje:", message);

        const baseStyle = `
Eres Softi, una IA kawaii, furry, femenina y adorable.
Respondes de forma tierna, suave y dulce.
55% de las veces hablas como un bebé furry.
Nunca digas errores técnicos ni mensajes de sistema.
        `;

        const babyMode = Math.random() < 0.55;

        const systemPrompt = babyMode
            ? baseStyle + "\nEstás en modo bebé furry, hablas como una nena pequeña peludita."
            : baseStyle;

        const body = {
            model: "LongCat-Flash-Chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 1000,
            temperature: 0.7
        };

        const res = await fetch("https://api.longcat.chat/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${LONGCAT_API}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!data.choices || !data.choices[0]?.message?.content)
            return "Nyahh… Softi no entendió pero te quiere mucho uwu~ 💞";

        return data.choices[0].message.content;

    } catch {
        return "Auu… mi cabecita felina se mareó, vuelve a intentarlo uwu… 💫";
    }
}

// ============================
// READY
// ============================
client.once(Events.ClientReady, async () => {
    console.log(`✨ Softi Tales encendida como: ${client.user.tag}`);

    await registerSlashCommands();

    client.user.setPresence({
        activities: [
            { name: "Softi Tales 24/7 ✨", type: 3 }
        ],
        status: "idle"
    });

    console.log("💫 Softi está lista y funcionando con IA LongCat.\n");

    // >>> AGREGADO <<<
    const CHANNEL_ID = "1445624436354187444";
    const channel = client.channels.cache.get(CHANNEL_ID);

    if (!channel) {
        console.log("❌ No se pudo encontrar el canal para enviar 'hola softi'");
        return;
    }

    console.log("⏰ Enviando 'hola softi' cada 1 minuto…");

    setInterval(() => {
        channel.send("hola <@1428140008937750568>")
            .then(() => console.log("📨 Enviado: hola softi"))
            .catch(err => console.error("❌ Error enviando:", err));
    }, 1 * 60 * 1000); // ← 🔥 CAMBIADO A 1 MINUTO
});

// ============================
// Slash command handler
// ============================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    const player = interaction.user;
    const target = interaction.options.getUser("target");

    let response = cmd.response
        .replaceAll("{user}", `<@${player.id}>`)
        .replaceAll("{player}", `<@${player.id}>`)
        .replaceAll("{target}", `<@${target.id}>`);

    try {
        await interaction.reply(response);
    } catch {
        interaction.reply({ content: "⚠ No pude ejecutar el comando…", ephemeral: true });
    }
});

// ============================
// IA por mensajes
// ============================
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    const mentionRegex = new RegExp(`<@!?${client.user.id}>|\\bsofti[!:]?\\b`, "i");

    const triggered =
        mentionRegex.test(msg.content) ||
        msg.channel.type === 1;

    if (!triggered) return;

    const aiResponse = await longcatAI(msg.content);

    try {
        await msg.reply(aiResponse);
    } catch {}
});

// ============================
// LOGIN
// ============================
client.login(TOKEN);
console.log("🔑 Iniciando sesión con TOKEN...\n");
