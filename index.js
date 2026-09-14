import {
  Client,
  GatewayIntentBits,
  ActivityType,
  Events
} from "discord.js";

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  handleCommand,
  handleButton
} from "./logic.js";


/* =========================
   CONFIGURACIÓN
========================= */

const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT || 3000;
const OWNER_ID = process.env.OWNER_ID;

const PREFIX = "m;";

if (!TOKEN) {
  console.error("[MITTY] ❌ Falta TOKEN.");
  process.exit(1);
}

if (!process.env.GIF_TOKEN) {
    console.error("[MITTY] ❌ Falta GIF_TOKEN.");
    process.exit(1);
}

/* =========================
   RUTAS
========================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/* =========================
   JSON
========================= */

function loadJSON(file) {
  try {
    return JSON.parse(
      fs.readFileSync(
        path.join(__dirname, file),
        "utf8"
      )
    );
  } catch (error) {
    console.error(`[MITTY] Error leyendo ${file}:`, error);
    return {};
  }
}

const commands = loadJSON("cmd.json");
const config = loadJSON("config.json");
const status = loadJSON("status.json");


/* =========================
   ESTADO
========================= */

let statusIndex = 0;
let thinkingIndex = 0;

function getNextStatus() {
  if (!Array.isArray(status.statuses) || !status.statuses.length) {
    return null;
  }

  const value = status.statuses[statusIndex];

  statusIndex =
    (statusIndex + 1) % status.statuses.length;

  return value;
}

function getNextThinking() {
  if (!Array.isArray(status.thinking) || !status.thinking.length) {
    return null;
  }

  const value = status.thinking[thinkingIndex];

  thinkingIndex =
    (thinkingIndex + 1) % status.thinking.length;

  return value;
}

function reloadStatus() {
  const newStatus = loadJSON("status.json");

  Object.keys(status).forEach(key => {
    delete status[key];
  });

  Object.assign(status, newStatus);

  statusIndex = 0;
  thinkingIndex = 0;
}


/* =========================
   CLIENTE DISCORD
========================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


/* =========================
   BOT LISTO
========================= */

client.once(Events.ClientReady, readyClient => {
  console.log(
    `[MITTY] ✅ Conectado como ${readyClient.user.tag}`
  );

  readyClient.user.setActivity("m;help", {
    type: ActivityType.Listening
  });
});


/* =========================
   COMANDOS POR PREFIJO
========================= */

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) {
    return;
  }

  if (!message.content.startsWith(PREFIX)) {
    return;
  }

  const content = message.content.slice(PREFIX.length).trim();

  if (!content) {
    return;
  }

  const parts = content.split(/\s+/);

  const commandName = parts.shift().toLowerCase();

  const args = parts;

  try {
    await handleCommand({
      message,
      commandName,
      args,
      commands,
      gifs: {},
      config,
      prefix: PREFIX,
      ownerId: OWNER_ID,
      getNextStatus,
      getNextThinking,
      reloadStatus
    });
  } catch (error) {
    console.error(
      "[MITTY] Error en MessageCreate:",
      error
    );
  }
});


/* =========================
   BOTONES
========================= */

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) {
    return;
  }

  try {
    await handleButton(interaction);
  } catch (error) {
    console.error(
      "[MITTY] Error manejando botón:",
      error
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Ocurrió un error con esta interacción.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});


/* =========================
   SERVIDOR WEB
========================= */

const app = express();

app.get("/", (req, res) => {
  res.send("🤖 Mitty online.");
});

app.listen(PORT, () => {
  console.log(`[MITTY] 🌐 Puerto ${PORT}`);
});


/* =========================
   LOGIN
========================= */

client.login(TOKEN);
