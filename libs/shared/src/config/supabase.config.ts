// Función para obtener configuración de Supabase con lazy loading
function getSupabaseConfig() {
  const config = {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  
  console.log('🔍 Verificando configuración de Supabase:');
  console.log('SUPABASE_URL:', config.url || 'UNDEFINED');
  console.log('SUPABASE_ANON_KEY:', config.anonKey ? 'SET' : 'UNDEFINED');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', config.serviceRoleKey ? 'SET' : 'UNDEFINED');
  
  return config;
}

// Proxy para lazy loading de la configuración
export const supabaseConfig = new Proxy({} as {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}, {
  get(target, prop: string | symbol) {
    const config = getSupabaseConfig();
    return (config as any)[prop];
  }
});

console.log('=== DEBUG SUPABASE CONFIG ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'UNDEFINED');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'UNDEFINED');
console.log('=============================');