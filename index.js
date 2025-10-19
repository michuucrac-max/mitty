// index.js (ESM)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import OpenAI from 'openai';

// --- paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function safeReadJSON(filename, fallback = null) {
  try {
    const full = path.join(__dirname, filename);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch { return fallback; }
}

// --- archivos
const cmd = safeReadJSON('cmd.json', []);
const securityFile = safeReadJSON('security_manager.json', {});
const vocabularioFile = safeReadJSON('vocabulario.json', []);
const statusFile = safeReadJSON('status_manager.json', null);
const frasesDetectadasFile = safeReadJSON('frases_detectadas.json', []);

// --- configuración
const security = {
  palabras: securityFile.palabrasProhibidas || [],
  bloqueoLinks: securityFile.bloqueoLinks ?? true,
  antispam: securityFile.antispam || { maxMensajes: 5, intervaloMs: 5000, timeoutSegundos: 3600, advertencia: '⚠️ ¡OwO cuidado {usuario}!' },
  mensajes: securityFile.mensajes || { bloqueo: '🚫 Nya~ no puedes decir eso, {usuario}!', link: '🔗 Nya~ no puedes enviar links, {usuario} uwu 💖' }
};

const vocabulario = Array.isArray(vocabularioFile) ? vocabularioFile : vocabularioFile.respuestas || [];
const frasesDetectadas = Array.isArray(frasesDetectadasFile) ? frasesDetectadasFile : [];

// --- cliente
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

// --- OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// --- memoria de usuarios
const userTraffic = new Map();
const cooldowns = new Set();

// --- estado dinámico
function cambiarEstado() {
  if (!statusFile?.estados?.length) return;
  const e = statusFile.estados[Math.floor(Math.random() * statusFile.estados.length)];
  const type = ActivityType[e.tipo] ?? ActivityType.Playing;
  client.user.setActivity(e.mensaje, { type });
}

// --- seguridad
async function filtrarSeguridad(message) {
  if (!message?.content || message.author?.bot) return false;
  const txt = message.content.toLowerCase();
  const userLabel = message.author.username || 'usuario';

  // Links
  if (security.bloqueoLinks && /(https?:\/\/|www\.|discord\.gg\/)/i.test(txt)) {
    await message.delete().catch(() => {});
    await message.channel.send(security.mensajes.link.replace('{usuario}', userLabel)).catch(() => {});
    return false;
  }

  // Palabras prohibidas
  for (const p of security.palabras) {
    if (!p) continue;
    if (txt.includes(p.toLowerCase())) {
      await message.delete().catch(() => {});
      await message.channel.send(security.mensajes.bloqueo.replace('{usuario}', userLabel)).catch(() => {});
      return false;
    }
  }

  // Antispam
  const now = Date.now();
  const data = userTraffic.get(message.author.id) || { msgs: [], strikes: 0 };
  data.msgs = data.msgs.filter(ts => now - ts < security.antispam.intervaloMs);
  data.msgs.push(now);
  if (data.msgs.length > security.antispam.maxMensajes) {
    data.strikes++;
    userTraffic.set(message.author.id, { msgs: [], strikes: data.strikes });
    await message.channel.send(security.antispam.advertencia.replace('{usuario}', userLabel)).catch(() => {});
    return false;
  } else userTraffic.set(message.author.id, data);

  return true;
}

// --- respuesta random vocabulario
function respuestaRandom() {
  if (!vocabulario.length) return 'Nyaa~ ¿en qué puedo ayudarte? 💖';
  return vocabulario[Math.floor(Math.random() * vocabulario.length)];
}

// --- ready
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} listo!`);
  cambiarEstado();
  const mins = Math.max(1, parseInt(statusFile?.intervaloMinutos || 5, 10));
  setInterval(cambiarEstado, mins * 60 * 1000);
});

// --- messageCreate
client.on('messageCreate', async (message) => {
  try {
    if (message.author?.bot) return;
    if (!(await filtrarSeguridad(message))) return;

    if (cooldowns.has(message.author.id)) return;
    cooldowns.add(message.author.id);
    setTimeout(() => cooldowns.delete(message.author.id), 2000);

    const contenido = message.content.toLowerCase();

    // --- comandos !softiX
    if (contenido.startsWith('!softi')) {
      const parts = contenido.slice(1).split(' ');
      const name = parts.shift().toLowerCase();
      const sub = parts.shift() || '';
      const found = cmd.find(c => c.name === name);
      if (found) {
        const { response, image, title, description } = found;
        try {
          const { EmbedBuilder } = await import('discord.js');
          const embed = new EmbedBuilder().setTitle(title || '').setDescription(response || '').setColor(0xffaaff);
          if (image) embed.setImage(image);
          await message.reply({ embeds: [embed] });
        } catch { await message.reply(response); }
        return;
      }
    }

    // --- menciones o DM → OpenAI furry/uwu
    if (message.mentions.has(client.user) || message.channel.type === 'DM') {
      const reply = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Habla con un estilo furry/kawaii/uwu, dulce y amistoso.' },
          { role: 'user', content: message.content }
        ],
        temperature: 0.8
      });
      const text = reply.choices?.[0]?.message?.content || respuestaRandom();
      await message.reply(text);
      return;
    }

    // --- frases detectadas
    for (const f of frasesDetectadas) {
      if (contenido.includes(f.toLowerCase())) {
        await message.reply(respuestaRandom());
        return;
      }
    }

  } catch (err) { console.error(err); }
});

// --- login
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error('✖ TOKEN no encontrado');
  process.exit(1);
}
client.login(TOKEN).catch(err => console.error('Error login:', err.message));
