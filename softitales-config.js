/**
 * softitales-config.js
 * Panel interno de configuración de Softti Tales
 * Comandos accesibles solo desde #softitales-config con rol Owner
 */

import fs from "fs";
import path from "path";

const SETTINGS_DIR = path.join(process.cwd(), "autom", "guildSettings");
if (!fs.existsSync(SETTINGS_DIR)) fs.mkdirSync(SETTINGS_DIR, { recursive: true });

export function ensureGuildConfig(guildId) {
  const file = path.join(SETTINGS_DIR, `${guildId}.json`);
  if (!fs.existsSync(file)) {
    const def = { automod: true, behaviors: {}, commands: [] };
    fs.writeFileSync(file, JSON.stringify(def, null, 2));
    return def;
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function reloadGuildConfig(guildId) {
  const file = path.join(SETTINGS_DIR, `${guildId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export async function handleConfigCommand(message, config, guildId) {
  const [cmd, ...args] = message.content.trim().split(/\s+/);
  const file = path.join(SETTINGS_DIR, `${guildId}.json`);

  switch (cmd.toLowerCase()) {
    case "automod":
      if (!args[0]) return message.reply("Usa: `automod on` o `automod off`");
      config.automod = args[0].toLowerCase() === "on";
      fs.writeFileSync(file, JSON.stringify(config, null, 2));
      return message.reply(`🛡️ AutoMod ${config.automod ? "activado" : "desactivado"}`);

    case "addcmd": {
      const [name, ...rest] = args;
      const response = rest.join(" ");
      if (!name || !response)
        return message.reply("Uso: `addcmd nombre respuesta`");
      config.commands.push({ name, response });
      fs.writeFileSync(file, JSON.stringify(config, null, 2));
      return message.reply(`✨ Comando /${name} agregado.`);
    }

    case "addbehavior": {
      const [name, ...rest] = args;
      const text = rest.join(" ");
      if (!name || !text)
        return message.reply("Uso: `addbehavior nombre texto`");
      config.behaviors[name] = text;
      fs.writeFileSync(file, JSON.stringify(config, null, 2));
      return message.reply(`💬 Nuevo comportamiento agregado: ${name}`);
    }

    case "reload": {
      const reloaded = reloadGuildConfig(guildId);
      if (!reloaded) return message.reply("❌ No se encontró configuración para este servidor.");
      return message.reply("🔄 Configuración recargada exitosamente sin reiniciar el bot.");
    }

    default:
      return message.reply(
        "⚙️ Comandos disponibles:\n" +
          "`automod on/off` — activa o desactiva el AutoMod\n" +
          "`addcmd nombre respuesta` — agrega un nuevo comando personalizado\n" +
          "`addbehavior nombre texto` — agrega comportamiento de IA\n" +
          "`reload` — recarga configuración del servidor\n\n" +
          "Solo para rol **Owner**."
      );
  }
}
