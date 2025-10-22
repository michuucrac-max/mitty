// 🌪️ autoupdate.js — Recarga automática de archivos JS y JSON
import fs from 'fs';
import path from 'path';

export default function autoupdate(client) {
  const watchDir = './'; // raíz del bot

  fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    if (filename.endsWith('.js') || filename.endsWith('.json')) {
      console.log(`🌀 Detectado cambio en: ${filename}`);

      try {
        const filePath = path.resolve(filename);

        // Eliminar del caché (solo para CommonJS)
        delete require.cache[require.resolve(filePath)];

        if (filename.endsWith('.json')) {
          console.log(`🔁 Archivo JSON actualizado: ${filename}`);
        } else if (filename.endsWith('.js')) {
          import(filePath + '?update=' + Date.now())
            .then(() => console.log(`✨ Módulo recargado: ${filename}`))
            .catch((err) => console.error(`❌ Error recargando ${filename}:`, err));
        }
      } catch (err) {
        console.error('❌ Error en autoupdate:', err);
      }
    }
  });

  console.log('👀 Autoupdate activo — detectará nuevos archivos y recargará sin reinicio');
}
