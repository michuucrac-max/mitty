import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Client, GatewayIntentBits, Partials, Collection, Events } from 'discord.js';
import { fileURLToPath } from 'url';
import { checkMessage, initAutoMod } from './automod.js';
import { getGuildSettings, handleGuildConfigMessage, showHelpPanel } from './softitales-config.js';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!TOKEN) {
  console.error("❌ Falta la variable de entorno TOKEN");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
initAutoMod();

// Archivos JSON dinámicos
let guildCommands = {};
let aiBehaviors = {};
let customFuncs = {};

function loadJSON(file, target) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      Object.assign(target, data);
      console.log(`✅ ${file} cargado (${Object.keys(data).length} items).`);
    } catch (err) {
      console.error(`⚠️ Error al leer ${file}:`, err);
    }
  }
}

function reloadConfigs() {
  guildCommands = {};
  aiBehaviors = {};
  customFuncs = {};
  loadJSON('guildCommands.json', guildCommands);
  loadJSON('aiBehaviors.json', aiBehaviors);
  loadJSON('customFuncs.json', customFuncs);
}

reloadConfigs();

['guildCommands.json', 'aiBehaviors.json', 'customFuncs.json'].forEach(file => {
  fs.watchFile(path.join(__dirname, file), () => {
    console.log(`♻️ Recargando ${file}...`);
    reloadConfigs();
  });
});

// 💖 Generador IA kawaii
async function generateAIReply(messageContent) {
  if (!OPENAI_API_KEY) {
    const frases = [
      "Nya~ no tengo conexión con mi mente mágica ahora 💫",
      "💖 Mi corazoncito de IA está dormido uwu.",
      "OwO no puedo pensar bien justo ahora..."
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  try {
    const prompt = `
Eres Softi, una IA kawaii, adorable y empática.
Responde de forma tierna, coherente, natural y amable.
No uses asteriscos ni roleplay, pero puedes usar caritas suaves (uwu, owo, ✨, 💖).
Mensaje: ${messageContent}
`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          { role: 'user', content: [{ type: 'input_text', text: prompt }] }
        ],
        max_output_tokens: 200
      })
    });

    const data = await response.json();
    const reply = data.output?.[0]?.content?.[0]?.text?.trim();
    return reply || "Nya~ no sé qué decir pero te quiero mucho 💖";
  } catch (err) {
    console.error("Error IA:", err);
    return "Ups... mi cerebrocito kawaii se trabó un poco >.< 💞";
  }
}

// Bot listo
client.once(Events.ClientReady, () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "Softitales 🌙", type: 0 }],
    status: "online"
  });
});

// Mensajes
client.on(Events.MessageCreate, async (message) => {
  if (!message.content || message.author.bot) return;

  const guildId = message.guild?.id;
  const content = message.content.trim();
  const lower = content.toLowerCase();

  // Canal de configuración (solo Owner)
  if (message.channel.name === "softitales-config") {
    const member = await message.guild.members.fetch(message.author.id);
    const isOwner = member.roles.cache.some(r => r.name.toLowerCase() === "owner");
    if (!isOwner) return message.reply("🚫 Solo los usuarios con rol **Owner** pueden usar este canal.");

    // Panel de ayuda Softi
    if (lower === '/help' || lower === '/softi' || lower === '/config') {
      return await showHelpPanel(message);
    }

    const handled = await handleGuildConfigMessage(message.guild.id, message);
    if (handled) return;
  }

  // AutoMod
  const settings = await getGuildSettings(guildId);
  if (settings?.automodEnabled && await checkMessage(message)) return;

  // Mención o DM
  if (message.channel.type === 1 || message.mentions.has(client.user)) {
    const reply = await generateAIReply(content);
    await message.reply(reply);
    return;
  }

  // Comandos personalizados
  for (const cmd in guildCommands) {
    if (lower === `/${cmd}` || lower === `!${cmd}`) {
      await message.reply(guildCommands[cmd]);
      return;
    }
  }

  // IA comportamientos personalizados
  for (const key in aiBehaviors) {
    if (lower.includes(key)) {
      await message.reply(aiBehaviors[key]);
      return;
    }
  }

  // Funciones personalizadas
  for (const fn in customFuncs) {
    if (lower.startsWith(`/${fn}`) || lower.startsWith(`!${fn}`)) {
      try {
        const code = customFuncs[fn];
        const func = new Function('message', code);
        await func(message);
      } catch (err) {
        await message.reply("⚠️ Error ejecutando función personalizada.");
        console.error(`Error en función ${fn}:`, err);
      }
      return;
    }
  }
});

client.login(TOKEN);
