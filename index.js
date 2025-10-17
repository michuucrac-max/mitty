// Importar la librería Discord.js
const { Client, GatewayIntentBits } = require('discord.js');

// Crear el cliente del bot con los permisos necesarios
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,            // Para leer servidores
    GatewayIntentBits.GuildMessages,     // Para leer mensajes
    GatewayIntentBits.MessageContent     // Para leer el contenido de los mensajes
  ]
});

// Cuando el bot esté listo
client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// Cuando alguien envíe un mensaje
client.on('messageCreate', (message) => {
  // Ignorar mensajes del propio bot
  if (message.author.bot) return;

  // Ejemplo de comando simple
  if (message.content === '!hola') {
    message.reply('¡Hola! 🐾 Soy tu bot y estoy funcionando correctamente en Render 🚀');
  }

  // Otro comando ejemplo
  if (message.content === '!info') {
    message.reply('Soy un bot básico hecho con discord.js v14 💫');
  }
});

// Iniciar sesión con el token (se obtiene desde las variables de entorno)
client.login(process.env.DISCORD_TOKEN);
