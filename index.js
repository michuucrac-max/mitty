// 🌸 Softi-Tales Bot COMPLETO 🌸
// Render + Node 22 + discord.js v14 + IA kawaii + AutoMod + Slash + autoupdate

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder } from "discord.js";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import express from "express";

// ===== CONFIG =====
const TOKEN = process.env.TOKEN || "TU_TOKEN_DISCORD_AQUI";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "TU_TOKEN_OPENAI_AQUI";

// ===== CLIENTE DISCORD =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessageReactions
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});
client.commands = new Collection();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const rest = new REST({ version: "10" }).setToken(TOKEN);

// ===== AUTOSUBCARPETAS PARA SERVIDORES =====
const SERVERS_DIR = './servers';
if (!fs.existsSync(SERVERS_DIR)) fs.mkdirSync(SERVERS_DIR);

// ===== AUTOCOMANDOS BASE =====
let cmds = [];
try {
  cmds = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
  cmds.forEach(c => client.commands.set(c.name, c));
} catch {
  fs.writeFileSync("./cmd.json", "[]");
}

// ===== AUTOPRESENCE ALEATORIO =====
let estados = [];
try { estados = JSON.parse(fs.readFileSync("./estados.json", "utf8")); } catch {}
function setRandomPresence() {
  if (!estados.length || !client.user) return;
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setPresence({ activities: [{ name: estado, type: 0 }], status: "online" }).catch(() => {});
}
setInterval(setRandomPresence, 60000);

// ===== AUTOSERVE KEEPALIVE =====
const app = express();
app.get('/', (req, res) => res.send('🌐 Softi Tales KeepAlive activo UwU'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 KeepAlive activo'));

// ===== AUTOUODATE =====
const WATCH_DIR = './';
fs.watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  if (filename.endsWith('.js') || filename.endsWith('.json')) {
    try {
      const filePath = path.resolve(filename);
      delete require.cache[require.resolve(filePath)];
      if (filename.endsWith('.js')) import(filePath + '?update=' + Date.now());
      console.log(`🌀 Cambios detectados y recargados: ${filename}`);
    } catch (err) { console.error('❌ Error autoupdate:', err); }
  }
});

// ===== AUTOMOD =====
let securityConfig = { palabrasProhibidas: [], bloqueoLinks: true, antispam: { maxMensajes: 5, intervaloMs: 5000, timeoutSegundos: 3600, advertencia: "⚠️ Cuidado {usuario}!" }, mensajes: { bloqueo: "🚫 Nya~ {usuario}", link: "🔗 Nya~ {usuario}" }, warningsBeforeKick: 3, allowedLinksRoles: [] };
try { securityConfig = Object.assign(securityConfig, JSON.parse(fs.readFileSync('./security_manager.json', 'utf8'))); } catch {}
const warnings = new Map(), spamTrack = new Map(), cooldowns = new Map();
async function checkMessage(message) {
  if (!message?.content || message.author?.bot) return true;
  const userId = message.author.id, now = Date.now();
  // Cooldown
  if (cooldowns.get(userId) > now) { if (message.guild) await message.delete().catch(() => {}); return true; } else cooldowns.delete(userId);
  // Antispam
  let arr = spamTrack.get(userId) || []; arr.push(now); arr = arr.filter(t => t > now - (securityConfig.antispam.intervaloMs||5000)); spamTrack.set(userId, arr);
  if (arr.length > (securityConfig.antispam.maxMensajes||5)) { if (message.guild) await message.delete().catch(() => {}); try { await message.channel.send(securityConfig.antispam.advertencia.replace("{usuario}", message.author)) } catch {} cooldowns.set(userId, now + (securityConfig.antispam.timeoutSegundos||3600)*1000); return true; }
  // Palabras prohibidas
  if (securityConfig.palabrasProhibidas?.some(p => message.content.toLowerCase().includes(p.toLowerCase()))) { if (message.guild) { await message.delete().catch(() => {}); warnings.set(userId,(warnings.get(userId)||0)+1); try{await message.channel.send(securityConfig.mensajes.bloqueo.replace("{usuario}", message.author))}catch{} } else try{await message.reply("⚠️ Palabra prohibida")}catch{}; return true; }
  // Links
  if (securityConfig.bloqueoLinks && /(https?:\/\/[^\s]+)/gi.test(message.content)) {
    const hasRole = message.member?.roles?.cache?.some(r=>securityConfig.allowedLinksRoles.includes(r.name))||false;
    if (!hasRole) { if (message.guild) { await message.delete().catch(()=>{}); warnings.set(userId,(warnings.get(userId)||0)+1); try{await message.channel.send(securityConfig.mensajes.link.replace("{usuario}", message.author))}catch{} } else try{await message.reply("⚠️ No links")}catch{}; return true; }
  }
  // Kick
  if (message.guild && (warnings.get(userId)||0) >= securityConfig.warningsBeforeKick) {
    try { await message.member.kick(`Excedió advertencias`); await message.channel.send(`${message.author.tag} expulsado 🐾`); warnings.delete(userId); } catch {}
  }
  return false;
}

// ===== READY =====
client.once("ready", async () => {
  console.log(`🌸 Softi en línea como ${client.user.tag}`);
  setRandomPresence();
  // Registrar comandos globales
  try { await rest.put(Routes.applicationCommands(client.user.id), { body: cmds.map(c=>({ name:c.name,description:c.description,options:[{name:"usuario",description:"Usuario",type:6,required:true}]})) }); } catch(e){console.error(e);}
});

// ===== MENSAJES =====
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const lower = message.content.toLowerCase();
  const mentioned = message.mentions.has(client.user) || lower.includes("softi");

  // AutoMod
  if (await checkMessage(message)) return;

  // Canal Owner / Config
  const configChannel = message.guild?.channels.cache.find(ch => ch.name==="softitales-config");
  const isOwner = message.guild?.roles.cache.some(r=>r.name.toLowerCase()==="owner") && message.member?.roles.cache.some(r=>r.name.toLowerCase()==="owner");
  if (configChannel && message.channel.id===configChannel.id && isOwner) {
    if (lower.startsWith("/softihelpmod")) {
      const embed = new EmbedBuilder().setTitle("🌸 Softi Help Mod 🌸").setColor(0xffb6c1).setDescription("Comandos para Owners y Mods:\n"+cmds.map(c=>`/${c.name} — ${c.description}`).join("\n"));
      await message.reply({ embeds:[embed] });
      return;
    }
    if (lower.startsWith("/softihelp")) {
      const embed = new EmbedBuilder().setTitle("🌸 Softi Help 🌸").setColor(0xffb6c1).setDescription("Comandos generales:\n"+cmds.map(c=>`/${c.name} — ${c.description}`).join("\n"));
      await message.reply({ embeds:[embed] });
      return;
    }
    // Add / remove cmds por servidor
    const serverFile = path.join(SERVERS_DIR,message.guild.id+".json");
    let serverData = fs.existsSync(serverFile)?JSON.parse(fs.readFileSync(serverFile,"utf8")):{ cmds:{} };
    if (lower.startsWith("/addcmd")) {
      const args = message.content.split(' ').slice(1); const name=args[0]; const response=args.slice(1).join(' '); serverData.cmds[name]=response; fs.writeFileSync(serverFile,JSON.stringify(serverData,null,2)); await message.reply(`✨ Comando ${name} agregado en este servidor`); return;
    }
    if (lower.startsWith("/toggle-automod")) {
      serverData.automodEnabled=!serverData.automodEnabled; fs.writeFileSync(serverFile,JSON.stringify(serverData,null,2)); await message.reply(`✅ AutoMod ${serverData.automodEnabled?"activado":"desactivado"}`); return;
    }
  }

  // Menciones o DMs -> IA
  if (!message.guild || mentioned) {
    let prompt = "Eres Softi, IA kawaii, dulce y alegre, usa emojis suaves y habla con ternura.";
    const imgs = Array.from(message.attachments.values()).filter(a=>a.contentType?.startsWith("image/")).map(a=>a.url);
    if (imgs.length>0) prompt+=` Describe estas imágenes con ternura: ${imgs.join(", ")} 💕`;
    try {
      const completion = await openai.chat.completions.create({ model:"gpt-4o-mini", messages:[{role:"system",content:prompt},{role:"user",content:message.content}], temperature:0.8, max_tokens:500 });
      const reply = completion.choices[0].message.content || "Nya~ 💖 no sé qué decir pero te quiero 💞";
      await message.reply(reply);
    } catch { await message.reply("💔 Softi tuvo un problemita procesando eso~"); }
  }
});

client.login(TOKEN);
