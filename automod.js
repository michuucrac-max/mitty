import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, 'security_manager.json');

let config = {
  forbiddenWords: [],
  allowedLinksRoles: [],
  warningsBeforeKick: 3
};

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('✅ Security manager cargado correctamente');
} catch (error) {
  console.error('❌ Error al cargar security_manager.json:', error);
}

const warnings = new Map();

export default function autoMod(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 1️⃣ Bloquear palabras prohibidas
    const foundWord = config.forbiddenWords.find(word =>
      message.content.toLowerCase().includes(word.toLowerCase())
    );
    if (foundWord) {
      await message.delete().catch(() => {});
      const userWarnings = warnings.get(message.author.id) || 0;
      warnings.set(message.author.id, userWarnings + 1);
      message.channel.send(`${message.author}, no puedes usar esa palabra. Advertencias: ${userWarnings + 1}`);
      return;
    }

    // 2️⃣ Bloquear enlaces si no tienen rol permitido
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    if (linkRegex.test(message.content)) {
      const hasRole = message.member?.roles?.cache?.some(role =>
        config.allowedLinksRoles.includes(role.name)
      ) || false;

      if (!hasRole) {
        await message.delete().catch(() => {});
        const userWarnings = warnings.get(message.author.id) || 0;
        warnings.set(message.author.id, userWarnings + 1);
        message.channel.send(`${message.author}, no puedes enviar enlaces. Advertencias: ${userWarnings + 1}`);
        return;
      }
    }

    // 3️⃣ Expulsar automáticamente después de X advertencias (solo si es en servidor)
    if (message.guild) {
      const userWarnings = warnings.get(message.author.id);
      if (userWarnings >= config.warningsBeforeKick) {
        try {
          await message.member.kick(`Acumuló ${config.warningsBeforeKick} advertencias`);
          message.channel.send(`${message.author.tag} ha sido expulsado por acumular ${config.warningsBeforeKick} advertencias.`);
          warnings.delete(message.author.id);
        } catch (error) {
          console.log('No se pudo expulsar al usuario:', error);
        }
      }
    }
  });
}
