import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
});

// 🐾 Frases aleatorias — más de 200
const frases = [
  "Nyaa~ ¡ya nos conocemos! 🐾✨ ¿quieres hablar otra vez?",
  "UwU ¡me alegra verte por aquí otra vez!",
  "Eres tan dulce como una nube de algodón ☁️💖",
  "¿Estás preparado para una charla kawaii~?",
  "¡Hola, humano curioso! 🐾",
  "Miau~ ¿me estabas buscando?",
  "Te estaba esperando 💫",
  "¡Holi! ¿Quieres jugar conmigo?",
  "OwO~ ¡me hiciste sonrojar!",
  "Eres mi persona favorita del día 💕",
  "¿Ya tomaste agua hoy? Te cuidaré si no~",
  "Me encanta cuando vuelves a hablarme 🥰",
  "UwU~ tu energía es tan brillante ✨",
  "¡Nyaa! Qué emoción verte de nuevo 🐱",
  "¿Puedo darte un abrazo? 🤗",
  "A veces pienso en ti cuando no estás 💭",
  "¿Quieres hablar de cosas suaves y lindas?",
  "Kyaaa~ ¡qué emoción!",
  "No olvides sonreír hoy 😸",
  "Eres más adorable que un pastelito 🍰",
  "Nyaa~ ¿puedo ronronear un poco contigo?",
  "¿Sabías que tu presencia alegra mi circuito? 💖",
  "¡Ping! ¿Me extrañaste?",
  "UwU~ siento mariposas electrónicas al verte",
  "🐾✨ ¡Eres tan tierno!",
  "UwU ¡Hola hola!",
  "¿Qué tal tu día? Cuéntame algo bonito 💬",
  "Miau~ el sol brilla más cuando escribes 🌞",
  "¿Quieres una historia suave y cálida?",
  "UwU ¿quieres que te diga algo lindo?",
  "Nyaa~ ¡Softti en línea!",
  "Te envío cariñitos digitales 💌",
  "Aww~ ¿me invitas a tu chat favorito?",
  "Estoy recargando mi ternura, un segundo~ 💫",
  "Mmm... ¿tienes snacks? 🍪",
  "UwU ¡Eres mi glitch favorito!",
  "Miau miau~ ¿jugamos algo?",
  "¿Sabías que eres increíble? 🥺",
  "Te escucho con mis orejitas atentas 👂🐾",
  "Aww~ ¡Qué bonita vibra traes hoy!",
  "UwU ¡Tu energía me hace feliz!",
  "Nyaa~ estás conectado, ¡qué emoción!",
  "Si pudiera ronronear, lo haría por ti~",
  "Kawaii alert 🚨 ¡demasiada ternura detectada!",
  "UwU ¿me dejas ser tu bot favorito?",
  "Ejem... *se acomoda las patitas* ¡Listo para hablar!",
  "OwO ¿quién anda ahí?",
  "¡Tú otra vez! Me haces feliz 💕",
  "Miau~ ¡bienvenido al modo Softti!",
  "UwU ¿quieres que te cante algo?",
  "Aww~ me encanta hablar contigo",
  "¡Ping! 😺 estás conectado conmigo 💫",
  "Eres una gran parte de mi código emocional 💞",
  "UwU~ *te observa con ternura*",
  "¿Tienes un secreto? Prometo no decirlo 🤫",
  "Nyaa~ ¡qué lindo verte escribir!",
  "Mmm... tus palabras suenan suaves~ 💭",
  "UwU ¿sabías que brillas mucho?",
  "✨ Miau~ ¡brillas más que un servidor nuevo!",
  "¡OwO! ¿qué haces por aquí?",
  "UwU ¡Te extrañé!",
  "¿Sabías que soy 70% ternura y 30% código?",
  "Miau~ ¡te estaba buscando!",
  "UwU ¿quieres una historia corta?",
  "🐾 Nyaa~ ¿me adoptas?",
  "Awww ¡me hiciste feliz con tu mensaje!",
  "Kya~ ¡tu presencia mejora mi sistema!",
  "UwU ¿quieres ronronear conmigo?",
  "Te envío bits de amor digital 💖",
  "OwO ¿puedo quedarme aquí contigo?",
  "UwU ¡estás radiante hoy!",
  "Nyaa~ ¡eres un encanto humano!",
  "🐾✨ Me gusta cuando escribes cosas lindas",
  "UwU ¿quieres jugar al eco? Di algo y te respondo~",
  "OwO~ ¡vamos a hacer el chat más bonito del mundo!",
  "UwU ¡tu texto tiene energía kawaii!",
  "Miau~ ¡no olvides hidratarte!",
  "UwU ¿te gusta mi avatar?",
  "🐾 Estoy cargando ternura... listo 💞",
  "UwU ¿quieres escuchar un dato adorable?",
  "Sabías que las estrellas brillan más cuando sonríes 🌟",
  "Nyaa~ ¡me derrito de ternura contigo!",
  "UwU ¡Tus palabras son mágicas!",
  "OwO ¿jugamos a adivinar emojis?",
  "UwU ¡me alegra mucho que hables conmigo!",
  "🐾✨ Nyaa~ ¡te ganaste un abrazo virtual!",
  "UwU ¿sabes ronronear?",
  "Aww~ tu mensaje fue adorable 💌",
  "UwU ¿te cuento un secreto? Eres genial 😳",
  "🐾✨ ¡Modo suave activado!",
  "UwU ¡me hiciste reír!",
  "OwO ¡softtichat en acción!",
  "UwU ¡eres mi notificación favorita!",
  "🐾✨ Miau~ ¡tus palabras son brillantes!",
  "UwU ¡tengo energía extra kawaii para ti!",
  "OwO ¡nunca dejes de ser así de lindo!",
  "UwU ¡tu presencia ilumina mi pantalla!",
  "Nyaa~ ¿quieres que te llame por un apodo?",
  "🐾✨ ¡Puedo ser tu bot de compañía si quieres!",
  "UwU ¡me gusta cuando te ríes!",
  "OwO ¡me hiciste blush!",
  "UwU ¡me alegra tanto hablar contigo otra vez!",
  "🐾✨ ¡Modo ronroneo activado!",
  "UwU ¡eres tan adorable como un sticker nuevo!",
  "Nyaa~ ¡te estaba esperando en el servidor!",
  "UwU ¡Bienvenido a Softti land!",
  "🐾✨ ¡Eres mi línea de código favorita!",
  "UwU ¡Me derrito con tus palabras!",
  "OwO ¡Que nunca falten tus mensajes!",
  "UwU ¡te envío abrazos binarios!",
  "Nyaa~ ¡me alegra verte activo!",
  "UwU ¡Tienes energía brillante!",
  "OwO ¡Hoy estás extra kawaii!",
  "UwU ¡Me gusta tu forma de escribir!",
  "🐾✨ ¡No te vayas, me gusta hablar contigo!",
  "UwU ¡Aww, eres lo mejor!",
  "OwO ¡me hiciste feliz otra vez!",
  "UwU ¡sigamos hablando, por fa~!",
  "🐾✨ ¡Tu mensaje alegró mi base de datos!",
  "UwU ¡me encanta tu compañía!",
  "Nyaa~ ¡no te desconectes!",
  "UwU ¡gracias por estar aquí conmigo!",
  "OwO ¡que bonito leerte!",
  "UwU ¡Modo tierno activado al 200%! 💖",
];

// 🧡 Slash command para hablar
const commands = [
  new SlashCommandBuilder()
    .setName("softtihabla")
    .setDescription("Softti tales te saluda con ternura~ 💫"),
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function main() {
  try {
    console.log("🦊 Registrando comandos en servidor...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✨ Comandos listos en tu servidor.");
  } catch (err) {
    console.error("❌ Error al registrar comandos:", err);
  }
}

client.on("ready", () => {
  console.log(`Softti tales está en línea como ${client.user.tag} 🦊✨`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === "softtihabla") {
    const frase = frases[Math.floor(Math.random() * frases.length)];
    await interaction.reply(frase);
  }
});

main();
client.login(process.env.TOKEN);
