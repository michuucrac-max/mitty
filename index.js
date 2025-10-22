// ==========================
// index.js — Softti Tales Bot
// ==========================

import fs from 'fs';
import { Client, GatewayIntentBits, Partials, EmbedBuilder, REST, Routes } from 'discord.js';
import autoupdate from './autoupdate.js';
import { checkMessage, initAutoMod } from './automod.js';
import keepAlive from './server.js';

// TOKEN desde environments
const { TOKEN, CLIENT_ID } = process.env;

// ==== CLIENT ====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message]
});

// ==== CARGA ESTADOS ====
let estados = [];
try { estados = JSON.parse(fs.readFileSync('./estados.json', 'utf8')); } catch {}

// ==== CARGA COMANDOS ==== 
let cmds = [];
try { cmds = JSON.parse(fs.readFileSync('./cmd.json', 'utf8')); } catch {}

// ==== MEMORIA Y CONVERSACIONES ====
let conversaciones = {};
let memoria = {};
try {
  conversaciones = JSON.parse(fs.readFileSync('./conversaciones.json', 'utf8'));
  memoria = JSON.parse(fs.readFileSync('./memoria.json', 'utf8'));
} catch {}

// ==== CONFIG POR SERVIDOR ====
function loadServerConfig(guildId) {
  const dir = './servers';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = `${dir}/${guildId}.json`;
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({
    automodEnabled: true,
    welcomeChannel: null,
    welcomeMessage: "Bienvenido {user}!",
    leaveChannel: null,
    leaveMessage: "Adiós {user}!",
    banChannel: null,
    banMessage: "{user} fue baneado.",
    boostChannel: null,
    boostMessage: "¡Alguien hizo boost! 🎉"
  }, null, 2));
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveServerConfig(guildId, config) {
  const dir = './servers';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = `${dir}/${guildId}.json`;
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
}

// ==== AUTOMOD ====
initAutoMod();

// ==== KEEP ALIVE ====
keepAlive();

// ==== AUTUPDATE ====
autoupdate(client);

// ==== HELPER ====
function format(template, user) {
  return template.replace(/\{user\}/g, `<@${user.id}>`);
}

// ==== INTERACTION (SLASH COMMANDS) ====
client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  const serverConfig = loadServerConfig(interaction.guildId);
  const ownerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
  const isOwner = ownerRole && interaction.member.roles.cache.has(ownerRole.id);

  if (interaction.commandName === "softihelp") {
    const embed = new EmbedBuilder()
      .setTitle("🌸 Softi Help 🌸")
      .setColor(0xffb6c1)
      .setDescription("Comandos disponibles 💖")
      .addFields(cmds.map(c => ({ name: c.name, value: c.description, inline: true })));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === "softihelpmod") {
    if (!isOwner) return interaction.reply({ content: "❌ Solo Owners pueden usar este comando.", ephemeral: true });
    const embed = new EmbedBuilder()
      .setTitle("🌸 Softi Help Mod 🌸")
      .setColor(0xffb6c1)
      .setDescription("Comandos de administración y configuración 💖")
      .addFields(cmds.map(c => ({ name: c.name, value: c.description, inline: true })));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

// ==== EVENTOS DE MENSAJES ====
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const serverConfig = loadServerConfig(message.guild.id);

  // AutoMod
  if (serverConfig.automodEnabled) {
    const blocked = await checkMessage(message);
    if (blocked) return;
  }

  // Owner commands vía canal softitales-config
  const ownerRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
  const isOwner = ownerRole && message.member.roles.cache.has(ownerRole.id);
  const args = message.content.trim().split(' ');

  if (isOwner && message.channel.name === "softitales-config") {
    // /setwelcome #channel mensaje
    if (args[0] === "/setwelcome") {
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply("❌ Menciona un canal válido");
      const msg = args.slice(2).join(' ') || "Bienvenido {user}!";
      serverConfig.welcomeChannel = ch.id;
      serverConfig.welcomeMessage = msg;
      saveServerConfig(message.guild.id, serverConfig);
      return message.reply(`✅ Canal de bienvenida configurado a ${ch} con mensaje "${msg}"`);
    }

    // /setleave #channel mensaje
    if (args[0] === "/setleave") {
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply("❌ Menciona un canal válido");
      const msg = args.slice(2).join(' ') || "Adiós {user}!";
      serverConfig.leaveChannel = ch.id;
      serverConfig.leaveMessage = msg;
      saveServerConfig(message.guild.id, serverConfig);
      return message.reply(`✅ Canal de despedida configurado a ${ch} con mensaje "${msg}"`);
    }

    // /setban #channel mensaje
    if (args[0] === "/setban") {
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply("❌ Menciona un canal válido");
      const msg = args.slice(2).join(' ') || "{user} fue baneado.";
      serverConfig.banChannel = ch.id;
      serverConfig.banMessage = msg;
      saveServerConfig(message.guild.id, serverConfig);
      return message.reply(`✅ Canal de baneos configurado a ${ch} con mensaje "${msg}"`);
    }

    // /setboost #channel mensaje
    if (args[0] === "/setboost") {
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply("❌ Menciona un canal válido");
      const msg = args.slice(2).join(' ') || "¡Alguien hizo boost! 🎉";
      serverConfig.boostChannel = ch.id;
      serverConfig.boostMessage = msg;
      saveServerConfig(message.guild.id, serverConfig);
      return message.reply(`✅ Canal de boost configurado a ${ch} con mensaje "${msg}"`);
    }

    // Info de Softi
    if (args[0].toLowerCase().includes("softi")) {
      const embed = new EmbedBuilder()
        .setTitle("🌸 Softi Info 🌸")
        .setColor(0xffb6c1)
        .setDescription("Aquí puedes editar configuración del servidor y ver los comandos disponibles.");
      return message.reply({ embeds: [embed] });
    }
  }
});

// ==== EVENTOS DE GUILD ====
client.on("guildMemberAdd", member => {
  const config = loadServerConfig(member.guild.id);
  if (config.welcomeChannel) {
    const ch = member.guild.channels.cache.get(config.welcomeChannel);
    if (ch) ch.send(format(config.welcomeMessage, member));
  }
});

client.on("guildMemberRemove", member => {
  const config = loadServerConfig(member.guild.id);
  if (config.leaveChannel) {
    const ch = member.guild.channels.cache.get(config.leaveChannel);
    if (ch) ch.send(format(config.leaveMessage, member));
  }
});

client.on("guildBanAdd", ban => {
  const config = loadServerConfig(ban.guild.id);
  if (config.banChannel) {
    const ch = ban.guild.channels.cache.get(config.banChannel);
    if (ch) ch.send(format(config.banMessage, ban.user));
  }
});

// ==== ESTADOS ALEATORIOS ====
setInterval(() => {
  if (!estados.length) return;
  const estado = estados[Math.floor(Math.random() * estados.length)];
  client.user.setActivity(estado, { type: "PLAYING" }).catch(() => {});
}, 60000);

// ==== MANEJO DE ERRORES ====
client.on("error", err => console.error("💥 Error del cliente:", err));

// ==== LOGIN ====
client.login(TOKEN);
