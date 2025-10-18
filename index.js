import { Client, GatewayIntentBits, Partials } from "discord.js";
import fs from "fs";
import chalk from "chalk";
import vocabulario from "./vocabulario.json" assert { type: "json" };
import cmd from "./cmd.json" assert { type: "json" };
import estados from "./status.json" assert { type: "json" };
import security from "./security_manager.json" assert { type: "json" };

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel],
});

const TOKEN = process.env.TOKEN || "TU_TOKEN_AQUI";
const advertencias = new Map();
const prefix = "!";

// 🦊 Función de seguridad
async function filtrarSeguridad(message) {
  if (message.author.bot) return false;
  const contenido = message.content.toLowerCase();
  const usuario = message.author.username;

  // Bloqueo de links externos
  if (security.bloqueoLinks && /(https?:\/\/|discord\.gg\/|www\.)/i.test(contenido)) {
    try { await message.delete(); } catch {}
    await message.channel.send(security.mensajes.link.replace("{usuario}", usuario)).catch(() => {});
    console.log(chalk.yellow(`[🔗 LINK BLOQUEADO] ${usuario}: ${contenido}`));
    return false;
  }

  // Palabras prohibidas
  for (const palabra of security.palabrasProhibidas) {
    if (contenido.includes(palabra.toLowerCase())) {
      try { await message.delete(); } catch {}
      await message.channel.send(security.mensajes.bloqueo.replace("{usuario}", usuario)).catch(() => {});
      console.log(chalk.red(`[🚫 PALABRA BLOQUEADA] ${palabra} de ${usuario}`));
      return false;
    }
  }

  // Antispam
  const ahora = Date.now();
  const data = advertencias.get(message.author.id) || { mensajes: [] };
  data.mensajes = data.mensajes.filter(ts => ahora - ts < security.antispam.intervaloMs);
  data.mensajes.push(ahora);
  advertencias.set(message.author.id, data);

  if (data.mensajes.length > security.antispam.maxMensajes) {
    try {
      await message.member.timeout(security.antispam.timeoutSegundos * 1000, "Spam detectado");
      await message.reply(security.antispam.advertencia.replace("{usuario}", usuario));
    } catch {
      await message.reply("⚠️ ¡No hagas spam, nya~! 🐾");
    }
    data.mensajes = [];
    advertencias.set(message.author.id, data);
    return false;
  }

  return true;
}

// 🎮 Estados cada 5 min
function cambiarEstado() {
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(estado, { type: 0 });
  console.log(chalk.green(`[🌸 Estado cambiado a:] ${estado}`));
}

// 🟢 Cuando el bot inicia
client.once("ready", () => {
  console.log(chalk.magentaBright(`✨ Softti Tales lista como ${client.user.tag}!`));
  cambiarEstado();
  setInterval(cambiarEstado, 5 * 60 * 1000);
});

// 💌 Mensajes
client.on("messageCreate", async (message) => {
  if (!(await filtrarSeguridad(message))) return;

  const contenido = message.content.toLowerCase();

  // Mención al bot
  if (message.mentions.has(client.user)) {
    const respuesta = vocabulario.respuestas[Math.floor(Math.random() * vocabulario.respuestas.length)];
    await message.reply(respuesta);
    return;
  }

  // Detección de frases comunes
  for (const frase of vocabulario.detectar) {
    if (contenido.includes(frase.toLowerCase())) {
      const respuesta = vocabulario.respuestas[Math.floor(Math.random() * vocabulario.respuestas.length)];
      await message.reply(respuesta);
      return;
    }
  }

  // Comandos (!)
  if (contenido.startsWith(prefix)) {
    const comando = contenido.slice(prefix.length).split(" ")[0];
    const encontrado = cmd.find(c => c.name === comando);
    if (encontrado) await message.reply(encontrado.response);
  }
});

client.login(TOKEN);
