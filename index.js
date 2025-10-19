// 📦 Dependencias
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import fs from 'fs';
import express from 'express';

// 🧸 Configurar cliente del bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message]
});

// 🐾 Cargar comandos desde cmd.json
let comandos = [];
try {
  const data = fs.readFileSync('./cmd.json', 'utf8');
  comandos = JSON.parse(data);
  console.log(`🪄 Se cargaron ${comandos.length} comandos desde cmd.json`);
} catch (err) {
  console.error('❌ Error al cargar cmd.json:', err);
}

// 🩵 Cargar estados desde estados.json
let estados = [];
try {
  const data = fs.readFileSync('./estados.json', 'utf8');
  estados = JSON.parse(data);
  console.log(`💫 Se cargaron ${estados.length} estados desde estados.json`);
} catch (err) {
  console.error('❌ Error al cargar estados.json:', err);
}

// ✨ Evento: cuando el bot está listo
client.once('ready', async () => {
  console.log(`✨ Softti Tales está online UwU`);
  console.log(`🐾 Conectado como ${client.user.tag}`);

  // 🎀 Cambiar estados cada 3 minutos
  const actualizarEstado = () => {
    const usuarios = client.users.cache.size;
    const servidores = client.guilds.cache.size;

    // Seleccionar estado aleatorio
    let estado = estados[Math.floor(Math.random() * estados.length)] || "Cuidando el servidor 💖";

    // Reemplazar variables si existen
    estado = estado
      .replace('{{USUARIOS}}', usuarios)
      .replace('{{SERVIDORES}}', servidores);

    client.user.setActivity(estado, { type: ActivityType.Playing });
  };

  actualizarEstado();
  setInterval(actualizarEstado, 1000 * 60 * 3); // cada 3 minutos
});

// 💬 Evento: mensajes del servidor
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const comando = args.shift().toLowerCase();

  // Buscar el comando en cmd.json
  const cmd = comandos.find(c => c.name === comando);

  if (cmd) {
    try {
      await message.channel.send(cmd.response);
    } catch (err) {
      console.error(`❌ Error al ejecutar el comando ${comando}:`, err);
    }
  }
});

// 🌐 Servidor web para mantener el bot activo
const app = express();
app.get('/', (req, res) => res.send('🌐 KeepAlive activo'));
app.listen(3000, () => console.log('🌐 Servidor web activo en el puerto 3000'));

// 🚀 Iniciar sesión con el token desde environments
client.login(process.env.TOKEN)
  .then(() => console.log("✅ Login exitoso"))
  .catch(err => console.error("❌ Error al iniciar sesión:", err));
