// =========================================================
// 🧠 MITTY — MOTOR PRINCIPAL
// =========================================================
//
// TODO EL SISTEMA DE COMANDOS FUNCIONARÁ DESDE JSON.
//
// Archivos:
//
// interactions.json
// profile.json
// utility.json
// moderation.json
// ai.json
//
// TODOS ESTÁN EN LA RAÍZ DEL PROYECTO.
//
// logic.js NO tendrá la configuración individual
// de cada comando.
//
// Su trabajo será leer los JSON y ejecutar sus sistemas.
// =========================================================


import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// =========================================================
// 📁 RUTA PRINCIPAL
// =========================================================

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


// =========================================================
// 📦 ARCHIVOS JSON DE COMANDOS
// =========================================================

const COMMAND_FILES = [

    "interactions.json",
    "profile.json",
    "utility.json",
    "moderation.json",
    "ai.json"

];


// =========================================================
// 📖 LEER JSON
// =========================================================

function loadJSON(fileName) {

    const filePath =
        path.join(
            __dirname,
            fileName
        );

    try {

        if (!fs.existsSync(filePath)) {

            console.warn(
                `[MITTY] ⚠️ Falta ${fileName}`
            );

            return null;
        }

        return JSON.parse(
            fs.readFileSync(
                filePath,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            `[MITTY] ❌ Error leyendo ${fileName}:`,
            error
        );

        return null;
    }
}


// =========================================================
// 📚 CARGAR TODOS LOS JSON
// =========================================================

function loadAllCommands() {

    const commands = {};

    for (
        const fileName
        of COMMAND_FILES
    ) {

        const data =
            loadJSON(fileName);

        if (!data) {
            continue;
        }

        commands[fileName] =
            data;
    }

    return commands;
}


// =========================================================
// 🔎 BUSCAR COMANDO
// =========================================================

function findCommand(commandName) {

    const allCommands =
        loadAllCommands();

    const search =
        commandName
            .toLowerCase()
            .trim();


    for (
        const [fileName, data]
        of Object.entries(allCommands)
    ) {

        if (!data.commands) {
            continue;
        }


        for (
            const [name, command]
            of Object.entries(
                data.commands
            )
        ) {

            // ---------------------------------------------
            // NOMBRE PRINCIPAL
            // ---------------------------------------------

            if (
                name.toLowerCase() ===
                search
            ) {

                return {
                    name,
                    command,
                    fileName,
                    group: data
                };

            }


            // ---------------------------------------------
            // ALIASES
            // ---------------------------------------------

            const aliases =
                command.aliases || [];


            if (
                aliases.some(
                    alias =>
                        alias
                            .toLowerCase()
                            .trim() ===
                        search
                )
            ) {

                return {
                    name,
                    command,
                    fileName,
                    group: data
                };

            }

        }

    }

    return null;
}


// =========================================================
// ⚙️ EJECUTAR COMANDO
// =========================================================

async function handleCommand(
    message,
    commandName,
    args = []
) {

    const result =
        findCommand(commandName);


    // -----------------------------------------------------
    // ❌ NO EXISTE
    // -----------------------------------------------------

    if (!result) {

        return false;

    }


    const {
        name,
        command,
        fileName,
        group
    } = result;


    console.log(
        `[MITTY] ▶ ${name} | ${fileName}`
    );


    try {

        switch (command.type) {


            // =============================================
            // 💞 INTERACCIONES
            // =============================================

            case "interaction":

                return await interactionSystem(
                    message,
                    name,
                    command,
                    group,
                    args
                );


            // =============================================
            // 👤 PERFIL
            // =============================================

            case "profile":

                return await profileSystem(
                    message,
                    name,
                    command,
                    group,
                    args
                );


            // =============================================
            // 🛠️ UTILIDAD
            // =============================================

            case "utility":

                return await utilitySystem(
                    message,
                    name,
                    command,
                    group,
                    args
                );


            // =============================================
            // 🛡️ MODERACIÓN
            // =============================================

            case "moderation":

                return await moderationSystem(
                    message,
                    name,
                    command,
                    group,
                    args
                );


            // =============================================
            // 🤖 IA
            // =============================================

            case "ai":

                return await aiSystem(
                    message,
                    name,
                    command,
                    group,
                    args
                );


            // =============================================
            // ❓ TIPO DESCONOCIDO
            // =============================================

            default:

                console.warn(
                    `[MITTY] ⚠️ Tipo desconocido: ${command.type}`
                );

                return false;

        }

    } catch (error) {

        console.error(
            `[MITTY] ❌ Error en ${name}:`,
            error
        );

        try {

            await message.reply(
                "❌ Ocurrió un error al ejecutar este comando."
            );

        } catch {}

        return true;
    }

}


// =========================================================
// 💞 SISTEMA DE INTERACCIONES
// =========================================================

async function interactionSystem(
    message,
    name,
    command,
    group,
    args
) {

    // =====================================================
    // AQUÍ MIGRAREMOS LA LÓGICA ANTIGUA DE MITTY
    //
    // GIF
    // GIPHY
    // TARGET
    // BOTONES
    // CONTADORES
    // RESPUESTAS
    // EXPIRACIÓN DE BOTONES
    // ETC.
    // =====================================================

    console.log(
        `[MITTY] 💞 Interacción: ${name}`
    );

    return true;
}


// =========================================================
// 👤 SISTEMA DE PERFIL
// =========================================================

async function profileSystem(
    message,
    name,
    command,
    group,
    args
) {

    console.log(
        `[MITTY] 👤 Perfil: ${name}`
    );

    return true;
}


// =========================================================
// 🛠️ SISTEMA DE UTILIDADES
// =========================================================

async function utilitySystem(
    message,
    name,
    command,
    group,
    args
) {

    console.log(
        `[MITTY] 🛠️ Utilidad: ${name}`
    );

    return true;
}


// =========================================================
// 🛡️ SISTEMA DE MODERACIÓN
// =========================================================

async function moderationSystem(
    message,
    name,
    command,
    group,
    args
) {

    console.log(
        `[MITTY] 🛡️ Moderación: ${name}`
    );

    return true;
}


// =========================================================
// 🤖 SISTEMA DE IA
// =========================================================

async function aiSystem(
    message,
    name,
    command,
    group,
    args
) {

    console.log(
        `[MITTY] 🤖 IA: ${name}`
    );

    return true;
}


// =========================================================
// 📤 EXPORTACIONES
// =========================================================

export {
    handleCommand,
    findCommand,
    loadAllCommands
};
