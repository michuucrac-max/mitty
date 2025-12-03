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
config(); // Render usa variables de entorno directamente

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const LONGCAT_API = process.env.LONGCAT_API;

// LOGS DE INICIO
console.log("=======================================");
console.log("   SOFTI TALES — LOGS ACTIVADOS ✔");
console.log("=======================================");
console.log("TOKEN:", TOKEN ? "✔ Cargado" : "❌ Faltante");
console.log("CLIENT_ID:", CLIENT_ID ? "✔ Cargado" : "❌ Faltante");
console.log("OWNER_ID:", OWNER_ID ? "✔ Cargado" : "❌ Faltante");
console.log("LONGCAT_API:", LONGCAT_API ? "✔ Cargada" : "❌ Faltante");
console.log("=======================================\n");

// ============================
// Cliente de Discord
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
// IA — LongCat con fallback
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
        console.log("🎀 ¿Modo bebé furry?:", babyMode ? "SÍ 🍼" : "NO ❌");

        const systemPrompt = babyMode
            ? baseStyle + "\nEstás en modo bebé furry, hablas como una nena pequeña peludita."
            : baseStyle;

        const body = {
            model: "longcat-lite",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ]
        };

        console.log("📤 Enviando a LongCat:", JSON.stringify(body, null, 2));

        const res = await fetch("https://api.longcat.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${LONGCAT_API}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        console.log("📥 Respuesta cruda LongCat:", data);

        if (!data.choices || !data.choices[0]?.message?.content) {
            console.log("⚠ LongCat no devolvió mensaje válido. Usando fallback local.");
            return "Nyahh… Softi no entendió pero te quiere mucho uwu~ 💞";
        }

        const finalText = data.choices[0].message.content;
        console.log("✅ Respuesta procesada:", finalText);

        return finalText;

    } catch (err) {
        console.log("❌ ERROR usando LongCat:", err);
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
});

// ============================
// Slash command handler
// ============================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    console.log(`📀 Slash command ejecutado: /${interaction.commandName}`);

    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) {
        console.log("❌ Comando no encontrado en cmd.json");
        return;
    }

    const player = interaction.user;
    const target = interaction.options.getUser("target");

    let response = cmd.response
        .replaceAll("{user}", `<@${player.id}>`)
        .replaceAll("{player}", `<@${player.id}>`)
        .replaceAll("{target}", `<@${target.id}>`);

    console.log("💬 Respuesta generada:", response);

    try {
        await interaction.reply(response);
    } catch (error) {
        console.error("❌ Error ejecutando comando:", error);
        interaction.reply({ content: "⚠ No pude ejecutar el comando…", ephemeral: true });
    }
});

// ============================
// IA activada por mensajes + DMs
// ============================
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    console.log(`📨 Mensaje recibido: "${msg.content}" en ${msg.guild ? "Servidor" : "DM"}`);

    const mentionRegex = new RegExp(`<@!?${client.user.id}>|\\bsofti[!:]?\\b`, "i");

    const triggered =
        mentionRegex.test(msg.content) ||
        msg.channel.type === 1;

    if (!triggered) {
        console.log("🔹 No se activó IA (no hubo mención, no es DM).");
        return;
    }

    console.log("🚀 IA activada por mensaje!");

    const aiResponse = await longcatAI(msg.content);

    try {
        await msg.reply(aiResponse);
        console.log("✅ Mensaje enviado por Softi.");
    } catch (err) {
        console.error("❌ No se pudo enviar la respuesta de Softi:", err);
    }
});

// ============================
// LOGIN
// ============================
client.login(TOKEN);
console.log("🔑 Iniciando sesión con TOKEN...\n");
