// Función para obtener configuración de Supabase con lazy loading
function getSupabaseConfig() {
  const config = {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
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