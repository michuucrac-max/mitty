/**
 * index.js - Softti Tales (Definitivo sin música)
 * Funcionalidad: IA, AutoMod, imágenes y comandos
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder, REST, Routes } from 'discord.js';
import { initAutoMod, checkMessage } from './automod.js';

// --- Paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Environment ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- JSON Config ---
function safeReadJSON(p){ try{ return JSON.parse(fs.readFileSync(path.join(__dirname,p),'utf8')); }catch{return null;} }
const cmdJson = safeReadJSON('cmd.json') || [];
const estadosJson = safeReadJSON('estados.json') || [];

// --- Optional autoupdate & server ---
try{ (await import('./autoupdate.js')).default || (await import('./autoupdate.js')); }catch{}
try{ await import('./server.js'); }catch{}

// --- Discord Client ---
const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials:[Partials.Channel, Partials.Message]
});

// --- Slash commands ---
const rest = new REST({ version:'10' }).setToken(TOKEN);
async function registrarComandosGlobales(){
  if(!CLIENT_ID || !cmdJson.length) return;
  try{
    const data = cmdJson.map(cmd=>({
      name:cmd.name,
      description:cmd.description||'Comando personalizado',
      options:[{name:'usuario',type:6,description:'Usuario objetivo',required:false}]
    }));
    await rest.put(Routes.applicationCommands(CLIENT_ID),{body:data});
    console.log('✅ Comandos globales registrados');
  }catch(e){ console.error('Error registrar comandos:',e); }
}

// --- AutoMod ---
try{ initAutoMod(); console.log('🛡️ AutoMod inicializado'); }catch(e){ console.warn('No se pudo inicializar automod:',e); }

// --- OpenAI IA ---
async function generarRespuestaIA(mensaje){
  if(!OPENAI_API_KEY) return '💖 IA no disponible';
  try{
    const prompt=`Eres Softi, una IA kawaii y tierna, muy amable, que responde con frases dulces, coherentes y adorables. Evita respuestas agresivas o incoherentes. Mensaje recibido: ${mensaje}`;
    const res = await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4.1-mini',input:[{role:'user',content:[{type:'input_text',text:prompt}]}],max_output_tokens:200})
    });
    const data = await res.json();
    return data.output?.[0]?.content?.[0]?.text||'💖';
  }catch(e){ console.error('OpenAI error:',e); return 'Ups... no pude generar respuesta >.<'; }
}

// --- Image Analysis ---
async function analizarImagenYResponder(attachment,message){
  if(!OPENAI_API_KEY) return message.reply('💖 No puedo analizar la imagen (API no configurada).');
  try{
    const prompt='Eres Softi, una IA kawaii. Describe esta imagen de forma tierna sin inventar cosas:';
    const response = await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4.1-mini',input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:attachment.url}]}],max_output_tokens:200})
    });
    const data = await response.json();
    const text = data.output?.[0]?.content?.[0]?.text||'💖 Se ve adorable';
    await message.reply(text);
  }catch(e){ console.error('analizarImagen error:',e); await message.reply('Ups... no pude analizar la imagen >.<'); }
}

// --- Message Handler ---
client.on('messageCreate',async message=>{
  if(message.author?.bot) return;

  const guild = message.guild;
  if(guild) try{ if(await checkMessage(message)) return; }catch(e){ console.error('automod error:',e); }

  if(message.attachments.size>0){
    for(const att of message.attachments.values()){
      if(att.contentType?.startsWith('image/')||att.url?.match(/\.(jpg|png|jpeg|gif|webp)$/i)){
        await analizarImagenYResponder(att,message); return;
      }
    }
  }

  const content = (message.content||'').trim();

  if(content.startsWith('!')){
    const args = content.slice(1).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    const custom = cmdJson.find(c=>c.name===cmd);
    if(custom){
      const user = message.author.username;
      const target = message.mentions.users.first()?.username||'ellos mismos';
      const respuesta = (custom.response||'').replace('{user}',user).replace('{target}',target);
      return message.reply(respuesta);
    }
  }

  // IA en DM o canales normales
  const shouldUseIA = true;
  if(shouldUseIA){
    const reply = await generarRespuestaIA(content);
    try{ await message.reply(reply); }catch(e){ console.warn('No pude responder con IA:',e); }
  }
});

// --- Ready & presence ---
client.once('ready',()=>{
  console.log(`🌸 Softti Tales en línea como ${client.user.tag}`);
  function setPresenceSafe(){
    try{
      const estados = estadosJson.length?estadosJson:['🌸 cuidando corazones','💖 abrazos digitales'];
      const estado = Array.isArray(estados)?estados[Math.floor(Math.random()*estados.length)]:estados;
      client.user.setPresence({activities:[{name:`${estado} | kawaii`,type:ActivityType.Playing}],status:'online'});
    }catch(err){ console.error('Error setPresenceSafe:',err); }
  }
  setPresenceSafe();
  setInterval(setPresenceSafe,1000*60*5);
  registrarComandosGlobales().catch(e=>console.warn('No se pudieron registrar comandos globales:',e));
});

// --- Global error handlers ---
process.on('unhandledRejection',(reason,p)=>{ console.error('Unhandled Rejection at Promise',p,'reason:',reason); });
process.on('uncaughtException',(err)=>{ console.error('Uncaught Exception thrown',err); });

// --- Login ---
client.login(TOKEN).catch(err=>console.error('Error login:',err));
