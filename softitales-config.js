import fs from 'fs';

const SETTINGS_FILE = './guildSettings.json';
const COMMANDS_FILE = './guildCommands.json';
const BEHAVIORS_FILE = './aiBehaviors.json';
const FUNCS_FILE = './customFuncs.json';

// Carga o inicializa archivos JSON
function loadOrCreate(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

let guildSettings = loadOrCreate(SETTINGS_FILE);
let guildCommands = loadOrCreate(COMMANDS_FILE);
let aiBehaviors = loadOrCreate(BEHAVIORS_FILE);
let customFuncs = loadOrCreate(FUNCS_FILE);

export async function getGuildSettings(guildId) {
  if (!guildId) return { automodEnabled: true };
  return guildSettings[guildId] || { automodEnabled: true };
}

export async function handleGuildConfigMessage(guildId, message) {
  const content = message.content.trim();
  const args = content.split(' ');

  // === AUTOMOD ===
  if (args[0] === '/automod') {
    const state = args[1];
    if (state === 'on' || state === 'off') {
      guildSettings[guildId] = guildSettings[guildId] || {};
      guildSettings[guildId].automodEnabled = state === 'on';
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(guildSettings, null, 2));
      await message.reply(`✅ AutoMod se ha ${state === 'on' ? 'activado' : 'desactivado'} para este servidor.`);
      return true;
    }
  }

  // === ADDCMD ===
  if (args[0] === '/addcmd') {
    const name = args[1];
    const response = args.slice(2).join(' ');
    if (!name || !response) return message.reply('⚠️ Uso correcto: `/addcmd nombre respuesta`');
    guildCommands[name] = response;
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(guildCommands, null, 2));
    await message.reply(`✨ Comando **/${name}** agregado.`);
    return true;
  }

  // === ADD BEHAVIOR ===
  if (args[0] === '/addai') {
    const trigger = args[1];
    const response = args.slice(2).join(' ');
    if (!trigger || !response) return message.reply('⚠️ Uso: `/addai palabra respuesta`');
    aiBehaviors[trigger.toLowerCase()] = response;
    fs.writeFileSync(BEHAVIORS_FILE, JSON.stringify(aiBehaviors, null, 2));
    await message.reply(`🧠 Nuevo comportamiento agregado: **${trigger}**`);
    return true;
  }

  // === ADD FUNC ===
  if (args[0] === '/addfunc') {
    const name = args[1];
    const code = content.slice(content.indexOf('{'));
    if (!name || !code) return message.reply('⚠️ Uso: `/addfunc nombre {codigo}`');
    customFuncs[name] = code;
    fs.writeFileSync(FUNCS_FILE, JSON.stringify(customFuncs, null, 2));
    await message.reply(`💻 Nueva función agregada: **${name}()**`);
    return true;
  }

  return false;
}

// 💖 Panel de ayuda Softi
export async function showHelpPanel(message) {
  const embed = {
    color: 0xffb6c1,
    title: "🌸 Softi Config Panel 🌸",
    description: "Hola Owner~ 💖 Aquí tienes los comandos para administrar Softitales.",
    fields: [
      { name: "⚙️ AutoMod", value: "`/automod on` — activa\n`/automod off` — desactiva" },
      { name: "💬 Comandos", value: "`/addcmd nombre respuesta` — agrega un comando personalizado" },
      { name: "🧠 Comportamientos", value: "`/addai palabra respuesta` — agrega respuesta IA a una palabra" },
      { name: "💻 Funciones JS", value: "`/addfunc nombre {codigo}` — crea funciones personalizadas" },
      { name: "💡 Consejo", value: "Solo los usuarios con rol **Owner** pueden usar este canal." }
    ],
    footer: { text: "Softi-Tales v1.3.1 💞", icon_url: "https://cdn.discordapp.com/emojis/112233445566778899.webp?size=96" }
  };
  await message.reply({ embeds: [embed] });
}
