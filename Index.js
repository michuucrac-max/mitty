const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot activo!'));
app.listen(3000, () => console.log('Servidor web encendido'));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.content === '!hola') {
    message.reply('¡Hola desde Railway! 🤖');
  }
});

client.login(process.env.TOKEN);
