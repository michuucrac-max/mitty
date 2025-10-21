// softitales-config.js
import fs from "fs";
import path from "path";

const SETTINGS_DIR = path.join(process.cwd(), "autom", "guildSettings");
if (!fs.existsSync(SETTINGS_DIR)) fs.mkdirSync(SETTINGS_DIR, { recursive: true });

/**
 * Obtiene la configuración guardada para un servidor.
 * Si no existe, devuelve valores por defecto.
 */
export function getGuildSettings(guildId) {
  const filePath = path.join(SETTINGS_DIR, `${guildId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      console.warn(`⚠️ Error leyendo configuración de ${guildId}, usando por defecto.`);
    }
  }
  return {
    automod: true,
    behaviors: [],
    commands: [],
  };
}

/**
 * Guarda configuración en disco para un servidor
 */
function saveGuildSettings(guildId, settings) {
  const filePath = path.join(SETTINGS_DIR, `${guildId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
}

/**
 * Maneja mensajes dentro del canal #softitales-config
 * Solo usuarios con rol "owner" pueden ejecutar comandos.
 */
export async function handleConfigMessage(message, guildSettings) {
  try {
    const member = message.member;
    if (!member?.roles?.cache?.some((r) => r.name.toLowerCase() === "owner")) {
      await message.reply("🚫 Solo los usuarios con rol **owner** pueden usar este canal.");
      return null;
    }

    const args = message.content.trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();

    // --- AUTOMOD ON/OFF ---
    if (cmd === "automod") {
      const value = args[0]?.toLowerCase();
      if (!["on", "off"].includes(value)) {
        await message.reply("Uso: `automod on` o `automod off`");
        return null;
      }
      guildSettings.automod = value === "on";
      saveGuildSettings(message.guild.id, guildSettings);
      await message.reply(`🛡️ AutoMod ${value === "on" ? "activado" : "desactivado"} correctamente.`);
      return guildSettings;
    }

    // --- ADDCMD ---
    if (cmd === "addcmd") {
      const name = args.shift();
      const response = args.join(" ");
      if (!name || !response) {
        await message.reply("Uso: `addcmd <nombre> <respuesta>`");
        return null;
      }
      guildSettings.commands.push({ name, response });
      saveGuildSettings(message.guild.id, guildSettings);
      await message.reply(`✨ Comando **/${name}** agregado.`);
      return guildSettings;
    }

    // --- ADDBEHAVIOR ---
    if (cmd === "addbehavior") {
      const behavior = args.join(" ");
      if (!behavior) {
        await message.reply("Uso: `addbehavior <texto del comportamiento>`");
        return null;
      }
      guildSettings.behaviors.push(behavior);
      saveGuildSettings(message.guild.id, guildSettings);
      await message.reply("🧠 Nuevo comportamiento agregado para Softi 💖");
      return guildSettings;
    }

    // --- SHOWCONFIG ---
    if (cmd === "showconfig") {
      const json = JSON.stringify(guildSettings, null, 2);
      await message.reply(`📜 Configuración actual:\n\`\`\`json\n${json}\n\`\`\``);
      return null;
    }

    await message.reply("❓ Comando no reconocido. Usa: `automod`, `addcmd`, `addbehavior`, `showconfig`");
    return null;

  } catch (err) {
    console.error("Error en handleConfigMessage:", err);
    await message.reply("⚠️ Error al procesar la configuración.");
    return null;
  }
}
