// =========================================================
// ☁️ MITTY • SISTEMA DE GUARDADO EN GITHUB
// =========================================================

import fs from "fs";


// =========================================================
// ⚙️ CONFIGURACIÓN
// =========================================================

const PROFILE_PATH = "./profile.json";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GITHUB_OWNER =
    process.env.GITHUB_OWNER || "michuucrac-max";

const GITHUB_REPO =
    process.env.GITHUB_REPO || "mitty";

const GITHUB_BRANCH =
    process.env.GITHUB_BRANCH || "main";

const GITHUB_API =
    "https://api.github.com";

const FILE_PATH =
    "profile.json";

let dirty = false;
let syncing = false;


// =========================================================
// 📡 HEADERS
// =========================================================

function getHeaders() {

    return {
        "Accept":
            "application/vnd.github+json",

        "Authorization":
            `Bearer ${GITHUB_TOKEN}`,

        "X-GitHub-Api-Version":
            "2022-11-28",

        "Content-Type":
            "application/json"
    };
}


// =========================================================
// 🔗 URL DEL ARCHIVO
// =========================================================

function getFileUrl() {

    return (
        `${GITHUB_API}/repos/` +
        `${GITHUB_OWNER}/` +
        `${GITHUB_REPO}/contents/` +
        `${FILE_PATH}`
    );
}


// =========================================================
// ☁️ DESCARGAR PROFILE.JSON DESDE GITHUB
// =========================================================

export async function loadProfileFromGitHub() {

    if (!GITHUB_TOKEN) {

        console.warn(
            "[MITTY] ⚠️ GITHUB_TOKEN no configurado."
        );

        return null;
    }

    try {

        const response = await fetch(
            `${getFileUrl()}?ref=${encodeURIComponent(
                GITHUB_BRANCH
            )}`,
            {
                method: "GET",
                headers: getHeaders()
            }
        );


        if (response.status === 404) {

            console.log(
                "[MITTY] ☁️ profile.json todavía no existe en GitHub."
            );

            return null;
        }


        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(
                `GitHub GET ${response.status}: ${text}`
            );
        }


        const data =
            await response.json();


        const content =
            Buffer.from(
                data.content.replace(/\n/g, ""),
                "base64"
            ).toString("utf8");


        console.log(
            "[MITTY] ☁️ profile.json descargado desde GitHub."
        );


        return {
            content,
            sha: data.sha
        };

    } catch (error) {

        console.error(
            "[MITTY] ❌ Error leyendo profile.json desde GitHub:",
            error
        );

        return null;
    }
}


// =========================================================
// 💾 MARCAR DATOS COMO MODIFICADOS
// =========================================================

export function markProfileDirty() {

    dirty = true;
}


// =========================================================
// ❓ COMPROBAR SI HAY CAMBIOS
// =========================================================

export function isProfileDirty() {

    return dirty;
}


// =========================================================
// ☁️ SUBIR PROFILE.JSON A GITHUB
// =========================================================

export async function flushProfileToGitHub() {

    if (!GITHUB_TOKEN) {
        return false;
    }

    if (!dirty) {
        return false;
    }

    if (syncing) {
        return false;
    }

    syncing = true;


    try {

        if (!fs.existsSync(PROFILE_PATH)) {

            console.warn(
                "[MITTY] ⚠️ No existe profile.json."
            );

            return false;
        }


        const content =
            fs.readFileSync(
                PROFILE_PATH,
                "utf8"
            );


        // =================================================
        // 🔎 OBTENER SHA ACTUAL
        // =================================================

        const remote =
            await loadProfileFromGitHub();


        // =================================================
        // 📦 DATOS PARA GITHUB
        // =================================================

        const body = {

            message:
                "💾 Mitty: actualización de perfiles",

            content:
                Buffer.from(
                    content,
                    "utf8"
                ).toString("base64"),

            branch:
                GITHUB_BRANCH
        };


        // =================================================
        // 🔐 SHA DEL ARCHIVO EXISTENTE
        // =================================================

        if (remote?.sha) {

            body.sha =
                remote.sha;
        }


        // =================================================
        // ☁️ SUBIR ARCHIVO
        // =================================================

        const response =
            await fetch(
                getFileUrl(),
                {
                    method: "PUT",

                    headers:
                        getHeaders(),

                    body:
                        JSON.stringify(body)
                }
            );


        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(
                `GitHub PUT ${response.status}: ${text}`
            );
        }


        dirty = false;


        console.log(
            "[MITTY] ☁️✅ profile.json guardado en GitHub."
        );


        return true;

    } catch (error) {

        console.error(
            "[MITTY] ❌ Error guardando profile.json en GitHub:",
            error
        );

        return false;

    } finally {

        syncing = false;
    }
}


// =========================================================
// 🚨 GUARDADO FORZADO
// =========================================================

export function forceProfileSave() {

    dirty = true;
}
