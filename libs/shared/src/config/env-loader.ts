// Este archivo debe ser importado ANTES que cualquier otro módulo
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

// Cargar variables de entorno antes de cualquier importación
function loadEnvironment() {
  // Rutas posibles para el archivo .env
  const possiblePaths = [
    '.env',
    resolve(process.cwd(), '.env'),
    join(__dirname, '.env'),
    join(__dirname, '..', '.env'),
    join(__dirname, '..', '..', '.env'),
    join(__dirname, '..', '..', '..', '.env'),
    join(__dirname, '..', '..', '..', '..', '.env'),
    resolve(__dirname, '../../../.env'),
    resolve(__dirname, '../../../../.env'),
  ];

  let loaded = false;
  let envPath = '';

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      const result = config({ path });
      if (!result.error) {
        console.log(`✅ Variables cargadas desde: ${path}`);
        envPath = path;
        loaded = true;
        break;
      }
    }
  }

  if (!loaded) {
    console.error('❌ No se pudo cargar el archivo .env');
    console.log('Rutas intentadas:', possiblePaths.map(p => ({ path: p, exists: existsSync(p) })));
  }

  return { loaded, envPath };
}

// Ejecutar la carga inmediatamente
const envResult = loadEnvironment();

// Exportar para usar en otros lugares si es necesario
export const envLoaded = envResult.loaded;
export const envPath = envResult.envPath;
