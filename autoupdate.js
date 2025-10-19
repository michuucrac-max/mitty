import fs from 'fs';
import path from 'path';

export function watchBotFiles(client) {
  const watchDir = './'; // raíz del bot

  fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    if (filename.endsWith('.js') || filename.endsWith('.json')) {
      console.log(`🌀 Detectado cambio en: ${filename}`);

      try {
        // Eliminar del caché y recargar
        const filePath = path.resolve(filename);
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
