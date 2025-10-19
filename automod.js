// automod.js
const forbiddenWords = ['malaPalabra1', 'malaPalabra2', 'malaPalabra3']; // Palabras prohibidas
const allowedLinksRoles = ['Admin', 'Moderador']; // Roles que pueden enviar links
const warnings = new Map(); // Para llevar conteo de advertencias

export default function autoMod(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 1️⃣ Bloquear palabras prohibidas
    const foundWord = forbiddenWords.find(word => message.content.toLowerCase().includes(word.toLowerCase()));
    if (foundWord) {
      await message.delete();
      const userWarnings = warnings.get(message.author.id) || 0;
      warnings.set(message.author.id, userWarnings + 1);
      message.channel.send(`${message.author}, no puedes usar esa palabra. Advertencias: ${userWarnings + 1}`);
      return;
    }

    // 2️⃣ Bloquear enlaces si no tienen rol permitido
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    if (linkRegex.test(message.content)) {
      const hasRole = message.member.roles.cache.some(role => allowedLinksRoles.includes(role.name));
      if (!hasRole) {
        await message.delete();
        const userWarnings = warnings.get(message.author.id) || 0;
        warnings.set(message.author.id, userWarnings + 1);
        message.channel.send(`${message.author}, no puedes enviar enlaces. Advertencias: ${userWarnings + 1}`);
        return;
      }
    }

    // 3️⃣ Expulsar automáticamente después de 3 advertencias
    const userWarnings = warnings.get(message.author.id);
    if (userWarnings >= 3) {
      try {
        await message.member.kick('Acumuló 3 advertencias');
        message.channel.send(`${message.author.tag} ha sido expulsado por acumular 3 advertencias.`);
        warnings.delete(message.author.id);
      } catch (error) {
        console.log('No se pudo expulsar al usuario:', error);
      }
    }
  });
}
