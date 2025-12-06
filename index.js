// -------------------------
//  SOFTI TALES — INDEX.JS
// -------------------------

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } from "discord.js";
import fs from "fs";
import fetch from "node-fetch";

// ============================
// VARIABLES DESDE ENVIRONMENTS (Render)
// ============================

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

console.log("📦 Cargando comandos desde cmd.json...");
const rawCmds = JSON.parse(fs.readFileSync("cmd.json", "utf8"));
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

async function registerSlashCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {  
        console.log("🚀 Registrando slash commands globales...");  
        await rest.put(  
            Routes.applicationCommands(CLIENT_ID),  
            { body: slashCommands }  
        );  
        console.log("✔ Slash commands globales registrados.");  
    } catch (error) {  
        console.error("❌ Error registrando comandos:", error);  
    }
}

// ============================
// IA LongCat
// ============================
async function longcatAI(message) {
    try {
        console.log("🧠 IA LongCat procesando:", message);

        const systemPrompt = `
Eres Softi, una IA kawaii, furry, femenina, dulce y adorable.
Respondes con ternura, estilo suave, ligero modo uwu, pero SIN hablar como bebé.
No uses lenguaje infantil extremo.
No menciones errores técnicos ni del sistema.
`;

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
            return "Softi no entendió, pero te manda un abracito uwu 💞";  

        return data.choices[0].message.content;  

    } catch {  
        return "Ay… algo salió mal, vuelve a intentarlo uwu 💗";  
    }
}

// -------------------------------------------------------------------
// AQUÍ VA EL CAMBIO IMPORTANTE (y elimina tu bloque “MI PAPA ES...”)
// -------------------------------------------------------------------

client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    const mentionRegex = new RegExp(`<@!?${client.user.id}>|\\bsofti[!:]?\\b`, "i");  
    const triggered = mentionRegex.test(msg.content) || msg.channel.type === 1;  

    if (!triggered) return;  

    let promptUser = msg.content;

    // 🧡 Si eres tú, agrego al prompt
    if (msg.author.id === "1427297946151551148") {
        promptUser = `Mi papi dice: ${msg.content}`;
    }

    const aiResponse = await longcatAI(promptUser);

    let finalResp = aiResponse;

    if (msg.author.id === "1427297946151551148") {
        finalResp += "\n\nAww papi 💗 siempre es un gusto hablar contigo~";
    }

    try {  
        await msg.reply(finalResp);  
    } catch {}
});
