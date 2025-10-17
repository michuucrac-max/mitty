const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
  new SlashCommandBuilder().setName("hablar").setDescription("Habla contigo UwU"),
  new SlashCommandBuilder().setName("hug").setDescription("Da un abracito suave 🤗"),
  new SlashCommandBuilder().setName("kiss").setDescription("Da un besito >///<"),
  new SlashCommandBuilder().setName("pat").setDescription("Acaricia suavemente 🫶"),
  new SlashCommandBuilder().setName("pet").setDescription("Da mimitos UwU 🐾"),
  new SlashCommandBuilder().setName("mymoney").setDescription("Mira cuántas moneditas tienes 💰"),
  new SlashCommandBuilder().setName("uwu").setDescription("Modo tierno activo OwO")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("⏳ Registrando comandos kwai...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados correctamente.");
  } catch (error) {
    console.error(error);
  }
})();
