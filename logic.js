import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

const GIF_TOKEN = process.env.GIF_TOKEN;

const GIF_SEARCHES = {
  Hug: "anime hug",
  Pat: "anime pat",
  Boop: "anime boop",
  Cuddle: "anime cuddle",
  Poke: "anime poke",
  Meow: "anime meow"
};

/* =========================
   GIPHY
========================= */

async function getRandomGif(category) {
  if (!GIF_TOKEN) {
    console.error("[MITTY] Falta GIF_TOKEN.");
    return null;
  }

  const query = GIF_SEARCHES[category];

  if (!query) {
    console.error(`[MITTY] Categoría GIPHY desconocida: ${category}`);
    return null;
  }

  try {
    const params = new URLSearchParams({
      api_key: GIF_TOKEN,
      q: query,
      limit: "20",
      rating: "g"
    });

    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?${params}`
    );

    if (!response.ok) {
      console.error(
        `[MITTY] GIPHY respondió ${response.status}: ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();

    const gifs = (data.data || [])
      .map(gif => gif?.images?.original?.url)
      .filter(Boolean);

    if (!gifs.length) {
      console.error(`[MITTY] GIPHY no encontró GIFs para "${query}".`);
      return null;
    }

    return gifs[Math.floor(Math.random() * gifs.length)];

  } catch (error) {
    console.error("[MITTY] Error consultando GIPHY:", error);
    return null;
  }
}

/* =========================
   UTILIDADES
========================= */

async function getTargetFromReply(message) {
  if (!message.reference?.messageId) {
    return null;
  }

  try {
    const referenced = await message.fetchReference();
    return referenced.author;
  } catch {
    return null;
  }
}

function getButtonEmoji(category) {
  const emojis = {
    Hug: "🤗",
    Pat: "🥰",
    Boop: "👉",
    Cuddle: "🫂",
    Poke: "👉",
    Meow: "🐱"
  };

  return emojis[category] || "💞";
}

async function sendInteraction({
  message,
  category,
  actionText,
  buttonText
}) {
  const target = await getTargetFromReply(message);

  if (!target) {
    await message.reply(
      "Debes responder al mensaje de alguien para usar este comando."
    );
    return;
  }

  const gif = await getRandomGif(category);

  if (!gif) {
    await message.reply(
      "No pude conseguir un GIF en este momento. Inténtalo de nuevo."
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setDescription(
      `${message.author} ${actionText} ${target}!`
    )
    .setImage(gif);

  const button = new ButtonBuilder()
    .setCustomId(`mitty_${category.toLowerCase()}_${target.id}`)
    .setLabel(buttonText)
    .setEmoji(getButtonEmoji(category))
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder()
    .addComponents(button);

  await message.reply({
    embeds: [embed],
    components: [row]
  });
}

/* =========================
   COMANDOS BÁSICOS
========================= */

async function ping(message) {
  await message.reply(`🏓 Pong! ${message.client.ws.ping}ms`);
}

async function help(message, commands, prefix) {
  const embed = new EmbedBuilder()
    .setTitle("📖 Ayuda de Mitty")
    .setDescription(
      `Usa \`${prefix}comando\` para ejecutar un comando.`
    );

  if (Array.isArray(commands)) {
    embed.addFields({
      name: "Comandos",
      value: commands
        .map(command => `\`${command}\``)
        .join(", ")
        .slice(0, 1024)
    });
  } else if (commands && typeof commands === "object") {
    const names = Object.keys(commands);

    if (names.length) {
      embed.addFields({
        name: "Comandos",
        value: names
          .map(command => `\`${command}\``)
          .join(", ")
          .slice(0, 1024)
      });
    }
  }

  await message.reply({ embeds: [embed] });
}

/* =========================
   INTERACCIONES
========================= */

async function hug(message) {
  await sendInteraction({
    message,
    category: "Hug",
    actionText: "le dio un abrazo a",
    buttonText: "Devolver un abrazo"
  });
}

async function pat(message) {
  await sendInteraction({
    message,
    category: "Pat",
    actionText: "le dio palmaditas a",
    buttonText: "Devolver palmaditas"
  });
}

async function boop(message) {
  await sendInteraction({
    message,
    category: "Boop",
    actionText: "le hizo boop a",
    buttonText: "Devolver boop"
  });
}

async function cuddle(message) {
  await sendInteraction({
    message,
    category: "Cuddle",
    actionText: "se acurrucó con",
    buttonText: "Devolver acurrucón"
  });
}

async function poke(message) {
  await sendInteraction({
    message,
    category: "Poke",
    actionText: "le hizo poke a",
    buttonText: "Devolver poke"
  });
}

async function meow(message) {
  await sendInteraction({
    message,
    category: "Meow",
    actionText: "le maulló a",
    buttonText: "Devolver maullido"
  });
}

/* =========================
   BOTONES
========================= */

async function handleButton(interaction) {
  if (!interaction.isButton()) {
    return false;
  }

  if (!interaction.customId.startsWith("mitty_")) {
    return false;
  }

  const parts = interaction.customId.split("_");

  const category = parts[1];
  const targetId = parts[2];

  /*
   * Solo la persona mencionada originalmente
   * puede utilizar el botón.
   */
  if (interaction.user.id !== targetId) {
    await interaction.reply({
      content: "💭 Ese botón no es para ti.",
      ephemeral: true
    });

    return true;
  }

  const categoryMap = {
    hug: "Hug",
    pat: "Pat",
    boop: "Boop",
    cuddle: "Cuddle",
    poke: "Poke",
    meow: "Meow"
  };

  const realCategory = categoryMap[category];

  if (!realCategory) {
    await interaction.reply({
      content: "❌ Interacción desconocida.",
      ephemeral: true
    });

    return true;
  }

  const gif = await getRandomGif(realCategory);

  if (!gif) {
    await interaction.reply({
      content: "No pude conseguir otro GIF ahora mismo.",
      ephemeral: true
    });

    return true;
  }

  const actionText = {
    Hug: `${interaction.user} devolvió el abrazo a`,
    Pat: `${interaction.user} devolvió las palmaditas a`,
    Boop: `${interaction.user} devolvió el boop a`,
    Cuddle: `${interaction.user} devolvió el acurrucón a`,
    Poke: `${interaction.user} devolvió el poke a`,
    Meow: `${interaction.user} devolvió el maullido a`
  };

  const originalUser = interaction.message.mentions.users.first();

  const embed = new EmbedBuilder()
    .setDescription(
      originalUser
        ? `${actionText[realCategory]} ${originalUser}!`
        : `${interaction.user} devolvió la interacción!`
    )
    .setImage(gif);

  await interaction.update({
    embeds: [embed],
    components: []
  });

  return true;
}

/* =========================
   HANDLER PRINCIPAL
========================= */

export async function handleCommand({
  message,
  commandName,
  args,
  commands,
  gifs,
  config,
  prefix,
  ownerId,
  getNextStatus,
  getNextThinking,
  reloadStatus
}) {
  try {
    /*
     * Los botones no pasan por el sistema
     * normal de comandos.
     */
    if (message.author.bot) {
      return;
    }

    const command = commandName.toLowerCase();

    switch (command) {
      case "ping":
        return await ping(message);

      case "help":
      case "ayuda":
        return await help(message, commands, prefix);

      case "hug":
      case "abrazo":
        return await hug(message);

      case "pat":
      case "palmaditas":
        return await pat(message);

      case "boop":
        return await boop(message);

      case "cuddle":
      case "acurrucon":
      case "acurrucón":
        return await cuddle(message);

      case "poke":
        return await poke(message);

      case "meow":
      case "miau":
        return await meow(message);

      default:
        return;
    }

  } catch (error) {
    console.error("[MITTY] Error ejecutando comando:", error);

    try {
      await message.reply(
        "❌ Ocurrió un error al ejecutar ese comando."
      );
    } catch {}
  }
}

/* =========================
   EXPORTACIONES
========================= */

export {
  getRandomGif,
  handleButton,
  hug,
  pat,
  boop,
  cuddle,
  poke,
  meow
};
