import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, Partials, ActivityType } from 'discord.js';
import fs from 'fs';
import fetch from 'node-fetch';
import { initAutoMod, checkMessage } from './automod.js';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel],
});

initAutoMod();

let comandos = [];
let estados = [];

try { comandos = JSON.parse(fs.readFileSync('./cmd.json', 'utf8')); } catch {}
try { estados = JSON.parse(fs.readFileSync('./estados.json', 'utf8')); } catch {}

// Registrar comandos globales
const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registrarComandos() {
  const data = comandos.map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: [{ name: 'usuario', type: 6, description: 'El usuario objetivo', required: false }]
  }));
  try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: data }); } catch {}
}

// IA
async function responderConIA(mensaje) {
  try {
    const prompt = `Eres Softi, IA kawaii. Responde de forma tierna y coherente: "${mensaje}"`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`, 'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4.1-mini', input:[{role:'user', content:[{type:'input_text', text:prompt}]}], max_output_tokens:150})
    });
    const data = await response.json();
    return data.output?.[0]?.content?.[0]?.text || 'Awww 💖';
  } catch { return 'Ups... no pude responder >.<'; }
}

// Imágenes
async function analizarImagen(attachment, message) {
  try {
    const imageUrl = attachment.url;
    const prompt = `Eres Softi. Describe esta imagen kawaii: ${imageUrl}`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`, 'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4.1-mini', input:[{role:'user', content:[{type:'input_text', text:prompt},{type:'input_image', image_url:imageUrl}]}], max_output_tokens:150})
    });
    const data = await response.json();
    await message.reply(data.output?.[0]?.content?.[0]?.text || 'Awww adorable 💖');
  } catch { try{await message.reply('Ups, no pude ver la imagen >.<');}catch{} }
}

client.once('ready', () => {
  function cambiarEstado() {
    if(estados.length){
      const estado = estados[Math.floor(Math.random()*estados.length)];
      client.user.setPresence({activities:[{name:`${estado} | cuidando a ${client.users.cache.size} users 💖`, type: ActivityType.Playing}], status:'online'});
    }
  }
  cambiarEstado();
  setInterval(cambiarEstado, 1000*60*5);
});

client.on('interactionCreate', async interaction => {
  if(!interaction.isCommand()) return;
  const cmd = comandos.find(c=>c.name===interaction.commandName);
  if(!cmd) return;
  const user = interaction.user.username;
  const target = interaction.options.getUser('usuario')?.username || 'ellos mismos';
  await interaction.reply(cmd.response.replace('{user}', user).replace('{target}', target));
});

client.on('messageCreate', async message => {
  try {
    if(message.author?.bot) return;
    const bloqueado = await checkMessage(message);
    if(bloqueado) return;
    if(message.attachments?.size){
      for(const a of message.attachments.values())
        if(a.contentType?.startsWith('image/')) return analizarImagen(a,message);
    }
    const respuesta = await responderConIA(message.content);
    await message.reply(respuesta).catch(()=>{});
  } catch(err){ console.error(err); }
});

registrarComandos();
client.login(TOKEN);
