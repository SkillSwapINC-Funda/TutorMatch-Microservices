import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Función para configurar variables de entorno en el monorepo
export function configureEnvironment() {
  // Intentar cargar desde múltiples ubicaciones posibles
  const possiblePaths = [
    '.env',                                      // Directorio actual
    resolve(process.cwd(), '.env'),              // Desde cwd
    resolve(__dirname, '../../../.env'),         // 3 niveles arriba
    resolve(__dirname, '../../../../.env'),      // 4 niveles arriba
    resolve(__dirname, '../../../../../.env'),   // 5 niveles arriba
  ];

  let envPath: string | null = null;
  let loaded = false;

  // Buscar el archivo .env
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      envPath = path;
      break;
    }
  }

  if (envPath) {
    const result = config({ path: envPath });
    if (!result.error) {
      console.log(`✅ Variables de entorno cargadas desde: ${envPath}`);
      loaded = true;
    } else {
      console.error(`❌ Error cargando .env desde ${envPath}:`, result.error.message);
    }
  } else {
    console.warn('⚠️  Archivo .env no encontrado en ninguna ubicación esperada');
    console.log('Rutas buscadas:', possiblePaths);
  }

  // Intentar configuración manual como respaldo
  if (!loaded) {
    console.log('🔄 Intentando configuración manual...');
    config(); // Carga .env desde el directorio actual por defecto
  }

  // Verificar variables críticas
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars);
    console.error('📁 Directorio actual:', process.cwd());
    console.error('📁 __dirname:', __dirname);
    
    // Mostrar todas las variables que empiecen con SUPABASE
    const supabaseVars = Object.keys(process.env).filter(key => key.startsWith('SUPABASE'));
    console.error('🔍 Variables SUPABASE encontradas:', supabaseVars);
    
    // Mostrar todas las variables de entorno disponibles (para debug)
    console.error('🔍 Todas las variables disponibles:', Object.keys(process.env).sort());
  } else {
    console.log('✅ Todas las variables requeridas están disponibles');
  }

  return {
    loaded,
    missingVars,
    hasAllRequired: missingVars.length === 0,
    envPath
  };
}
