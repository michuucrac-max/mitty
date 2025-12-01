// ------------------------------
//   SOFTI TALES — CONFIG / AUTOMOD
// ------------------------------

import fs from "fs";

// ===============================
// Cargar configuración del panel
// ===============================
let config = {
    antiBadWords: true,
    antiLinks: true,
    antiSpam: true,
    antiFlood: true,
    antiCaps: true,
    maxMentions: 4,

    badWords: ["puta", "marica", "gonorrea", "hp", "perra"],
    blockedLinks: ["porn", "sex", "xxx"],
    maxMessagesPer5s: 5,
    maxCapsPercent: 70
};

// Intentar cargar el panel si existe
try {
    if (fs.existsSync("./panel-config.json")) {
        const file = JSON.parse(fs.readFileSync("./panel-config.json", "utf8"));
        config = { ...config, ...file };
        console.log("🔧 Panel cargado correctamente.");
    } else {
        fs.writeFileSync("./panel-config.json", JSON.stringify(config, null, 4));
    }
} catch (err) {
    console.error("❌ Error cargando panel-config.json:", err);
}


// ==================================================
// SISTEMA DE MEMORIA PARA SPAM Y FLOOD
// ==================================================
const msgHistory = new Map(); // { userId: [timestamps...] }


// ==================================================
// FUNCIÓN PRINCIPAL DE AUTOMOD
// ==================================================
export function automodCheck(message) {
    const content = message.content.toLowerCase();

    // -----------------------------------------------------
    // 1. Palabras prohibidas
    // -----------------------------------------------------
    if (config.antiBadWords) {
        for (const bad of config.badWords) {
            if (content.includes(bad)) {
                return {
                    action: "delete",
                    reply: `🚫 <@${message.author.id}> esa palabra no está permitida.`
                };
            }
        }
    }

    // -----------------------------------------------------
    // 2. Enlaces bloqueados
    // -----------------------------------------------------
    if (config.antiLinks) {
        if (content.includes("http://") || content.includes("https://")) {
            for (const block of config.blockedLinks) {
                if (content.includes(block)) {
                    return {
                        action: "delete",
                        reply: `🔗 Ese enlace no está permitido aquí, <@${message.author.id}>.`
                    };
                }
            }
        }
    }

    // -----------------------------------------------------
    // 3. Caps excesivas
    // -----------------------------------------------------
    if (config.antiCaps) {
        const caps = content.replace(/[^A-Z]/g, "").length;
        const percent = (caps / content.length) * 100;

        if (percent >= config.maxCapsPercent && content.length > 8) {
            return {
                action: "delete",
                reply: `⚠️ Evita escribir TODO en mayúsculas, <@${message.author.id}>.`
            };
        }
    }

    // -----------------------------------------------------
    // 4. Menciones excesivas
    // -----------------------------------------------------
    if (message.mentions.users.size > config.maxMentions) {
        return {
            action: "delete",
            reply: `📛 No puedes mencionar tantas personas a la vez.`
        };
    }

    // -----------------------------------------------------
    // 5. Anti spam / flood
    // -----------------------------------------------------
    if (config.antiSpam || config.antiFlood) {
        const userId = message.author.id;
        const now = Date.now();

        if (!msgHistory.has(userId)) msgHistory.set(userId, []);

        const history = msgHistory.get(userId);

        // Guardar mensaje
        history.push(now);

        // Filtrar en 5 segundos
        const recent = history.filter(t => now - t < 5000);
        msgHistory.set(userId, recent);

        // Si supera el límite
        if (recent.length > config.maxMessagesPer5s) {
            return {
                action: "delete",
                reply: `⛔ Estás enviando mensajes muy rápido, <@${userId}>.`
            };
        }
    }

    // -----------------------------------------------------
    // Si no hizo nada malo
    // -----------------------------------------------------
    return { action: "none" };
}
