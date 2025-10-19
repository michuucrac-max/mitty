import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import fs from 'fs';
import OpenAI from 'openai';
import express from 'express';

// Inicializar cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🧠 Cargar comandos desde cmd.json
try {
  const comandos = JSON.parse(fs.readFileSync('./cmd.json', 'utf8'));
  for (const comando of comandos) {
    client.commands.set(comando.name, comando);
  }
  console.log('✨ Comandos cargados correctamente.');
} catch (error) {
  console.error('❌ Error al cargar cmd.json:', error);
}

// 🦋 Cargar estados desde estados.json
let estados = [];
try {
  estados = JSON.parse(fs.readFileSync('./estados.json', 'utf8'));
  console.log(`🌸 ${estados.length} estados cargados.`);
} catch (error) {
  console.error('❌ Error al cargar estados.json:', error);
}

// 🌼 Cuando el bot esté listo
client.once('ready', async () => {
  console.log(`🐾 Softti Tales conectado como ${client.user.tag}`);

  // Ciclo de estados kawaii
  let i = 0;
  setInterval(() => {
    const estadoBase = estados[i % estados.length];
    const servidores = client.guilds.cache.size;
    const usuarios = client.users.cache.size;
    const estadoFinal = estadoBase
      .replace('{servidores}', servidores)
      .replace('{usuarios}', usuarios);

    client.user.setPresence({
      activities: [{ name: estadoFinal, type: 0 }],
      status: 'online'
    });
    i++;
  }, 10000);
});

// 💬 Sistema principal de mensajes
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // 💖 Si envía una imagen, el bot la describe
  if (message.attachments.size > 0) {
    const imagen = message.attachments.first().url;
    try {
      await message.channel.sendTyping();
      const respuesta = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres una IA furry kawaii llamada Softti que habla de forma tierna y positiva, estilo uwu."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Describe esta imagen con ternura uwu." },
              { type: "image_url", image_url: imagen }
            ]
          }
        ],
      });

      const descripcion = respuesta.choices[0].message.content;
      await message.reply(`💫 ${descripcion}`);
    } catch (error) {
      console.error("❌ Error al analizar imagen:", error);
      await message.reply("Aww lo siento, no pude entender esa imagen 😿💔");
    }
    return;
  }

  // 🧡 Soporte para comandos con prefijo /softi
  if (message.content.startsWith('/softi')) {
    const args = message.content.slice(6).trim().split(/ +/);
    const comando = args.shift()?.toLowerCase();
    const cmd = client.commands.get(comando);

    if (cmd) {
      try {
        await cmd.execute(message, args);
      } catch (error) {
        console.error('❌ Error al ejecutar comando:', error);
        await message.reply('Hubo un error ejecutando ese comando 😿');
      }
    } else {
      message.reply("Nya~ ese comando no existe uwu 💖");
    }
    return;
  }

  // 💌 Chat directo con IA (si se le habla directamente o por DM)
  if (
    message.channel.type === 1 || // DM
    message.mentions.has(client.user)
  ) {
    try {
      await message.channel.sendTyping();
      const respuesta = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres una IA furry kawaii llamada Softti. Hablas con ternura, usas emojis lindos y mucho uwu 💖."
          },
          {
            role: "user",
            content: message.content.replace(/<@!?(\d+)>/, '').trim()
          }
        ],
      });

      await message.reply(respuesta.choices[0].message.content);
    } catch (error) {
      console.error('❌ Error al responder mensaje IA:', error);
      await message.reply("Aww, algo falló al pensar... uwu 💔");
    }
  }
});

// 🌐 Mantener el bot vivo en Render
const app = express();
app.get('/', (req, res) => res.send('🌐 KeepAlive activo'));
app.listen(3000, () => console.log('🌐 KeepAlive activo'));

// 🚀 Iniciar sesión (Render usa tus environments)
client.login(process.env.TOKEN);
