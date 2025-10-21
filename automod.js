// ✅ automod.js — Auto Moderador kawaii de Softti Tales
import fs from 'fs';

// Configuración base
let config = {
  palabrasProhibidas: [],
  bloqueoLinks: true,
  antispam: {
    maxMensajes: 5,
    intervaloMs: 5000,
    timeoutSegundos: 3600,
    advertencia: "⚠️ ¡OwO cuidado {usuario}! estás enviando muchos mensajitos seguidos, nyan~ 💢"
  },
  mensajes: {
    bloqueo: "🚫 Nya~ ¡no puedes decir eso, {usuario}! 🐾",
    link: "🔗 Nya~ no puedes enviar enlaces externos, {usuario} uwu 💖"
  },
  warningsBeforeKick: 3,
  allowedLinksRoles: [] // <- agregado para evitar error si no existe
};

// Cargar configuración externa si existe
try {
  const raw = fs.readFileSync('./security_manager.json', 'utf8');
  const external = JSON.parse(raw);
  config = Object.assign(config, external);
  config.warningsBeforeKick = config.warningsBeforeKick || 3;
  console.log('✅ security_manager.json cargado en AutoMod');
} catch (err) {
  console.warn('⚠️ No se pudo leer security_manager.json — usando valores por defecto.');
}

// Mapas de control
const warnings = new Map();
const spamTrack = new Map();
const cooldowns = new Map();

// Inicialización
export function initAutoMod() {
  console.log('🌸 AutoMod de Softti Tales activado correctamente.');
}

// Reemplaza {usuario} en los mensajes
function format(template, message) {
  const mention = message.author?.toString?.() || message.author?.username || 'usuario';
  return template.replace(/\{usuario\}/g, mention);
}

/**
 * checkMessage(message)
 * Retorna true si el mensaje debe ser bloqueado (no procesado por la IA)
 */
export async function checkMessage(message) {
  try {
    if (!message?.content || message.author?.bot) return true;

    const userId = message.author.id;
    const now = Date.now();

    // --- 1) Cooldown antispam ---
    const cooldownExpiry = cooldowns.get(userId);
    if (cooldownExpiry && now < cooldownExpiry) {
      if (message.guild) await message.delete().catch(() => {});
      return true;
    } else if (cooldownExpiry && now >= cooldownExpiry) {
      cooldowns.delete(userId);
    }

    // --- 2) Antispam ---
    if (config.antispam?.maxMensajes) {
      const arr = spamTrack.get(userId) || [];
      arr.push(now);
      const recent = arr.filter(t => t > now - (config.antispam.intervaloMs || 5000));
      spamTrack.set(userId, recent);

      if (recent.length > config.antispam.maxMensajes) {
        if (message.guild) await message.delete().catch(() => {});
        try { await message.channel.send(format(config.antispam.advertencia, message)); } catch {}
        cooldowns.set(userId, now + ((config.antispam.timeoutSegundos || 3600) * 1000));
        return true;
      }
    }

    // --- 3) Palabras prohibidas ---
    const contentLower = message.content.toLowerCase();
    if (config.palabrasProhibidas?.length) {
      const found = config.palabrasProhibidas.find(p => contentLower.includes(p.toLowerCase()));
      if (found) {
        if (message.guild) {
          await message.delete().catch(() => {});
          warnings.set(userId, (warnings.get(userId) || 0) + 1);
          try { await message.channel.send(format(config.mensajes.bloqueo, message)); } catch {}
        } else {
          try { await message.reply("⚠️ Ese mensaje contiene palabras prohibidas, nyan~ 💢"); } catch {}
        }
        return true;
      }
    }

    // --- 4) Bloqueo de links ---
    const linkRegex = /(https?:\/\/[^\s]+)/gi;
    if (config.bloqueoLinks && linkRegex.test(message.content)) {
      const hasPermRole = message.member?.roles?.cache?.some(role =>
        (config.allowedLinksRoles || []).includes(role.name)
      ) || false;

      if (!hasPermRole) {
        if (message.guild) {
          await message.delete().catch(() => {});
          warnings.set(userId, (warnings.get(userId) || 0) + 1);
          try { await message.channel.send(format(config.mensajes.link, message)); } catch {}
        } else {
          try { await message.reply("⚠️ No se permiten links externos, nyan~ 💖"); } catch {}
        }
        return true;
      }
    }

    // --- 5) Kick automático por advertencias ---
    if (message.guild) {
      const userWarnings = warnings.get(userId) || 0;
      if (userWarnings >= config.warningsBeforeKick) {
        try {
          await message.member.kick(`Excedió ${config.warningsBeforeKick} advertencias.`);
          try { 
            await message.channel.send(`${message.author.tag} fue expulsado por acumular ${config.warningsBeforeKick} advertencias.`);
          } catch {}
          warnings.delete(userId);
        } catch (err) {
          console.warn(`No se pudo expulsar a ${message.author.tag}:`, err.message);
        }
      }
    }

    return false;

  } catch (err) {
    console.error('❌ Error en checkMessage (AutoMod):', err);
    return false;
  }
}
