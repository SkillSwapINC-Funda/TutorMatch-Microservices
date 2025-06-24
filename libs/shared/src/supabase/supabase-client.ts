import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase.config';
import { Database } from '../types/database.types';

// Variables para lazy loading
let _supabase: SupabaseClient<Database> | null = null;
let _supabaseAdmin: SupabaseClient<Database> | null = null;

// Getter para supabase (lazy loading)
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop, receiver) {
    if (!_supabase) {
      console.log('🔧 Creando cliente Supabase...');
      console.log('URL:', supabaseConfig.url || 'UNDEFINED');
      console.log('ANON_KEY:', supabaseConfig.anonKey ? 'SET' : 'UNDEFINED');
      
      if (!supabaseConfig.url || !supabaseConfig.anonKey) {
        throw new Error('Configuración de Supabase incompleta. Verifica SUPABASE_URL y SUPABASE_ANON_KEY');
      }
      
      _supabase = createClient<Database>(
        supabaseConfig.url,
        supabaseConfig.anonKey
      );
    }
    return Reflect.get(_supabase, prop, receiver);
  }
});

// Getter para supabaseAdmin (lazy loading)
export const supabaseAdmin: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop, receiver) {
    if (!_supabaseAdmin) {
      console.log('🔧 Creando cliente Supabase Admin...');
      console.log('URL:', supabaseConfig.url || 'UNDEFINED');
      console.log('SERVICE_ROLE_KEY:', supabaseConfig.serviceRoleKey ? 'SET' : 'UNDEFINED');
      
      if (!supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
        throw new Error('Configuración de Supabase Admin incompleta. Verifica SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
      }
      
      _supabaseAdmin = createClient<Database>(
        supabaseConfig.url,
        supabaseConfig.serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    }
    return Reflect.get(_supabaseAdmin, prop, receiver);
  }
});

export function createSupabaseClient(options?: {
  useServiceRole?: boolean;
  customConfig?: any;
}): SupabaseClient<Database> {
  const { useServiceRole = false, customConfig = {} } = options || {};
  
  console.log('🔧 Creando cliente Supabase personalizado...');
  console.log('Use Service Role:', useServiceRole);
  console.log('URL:', supabaseConfig.url || 'UNDEFINED');
  
  if (!supabaseConfig.url) {
    throw new Error('SUPABASE_URL no está configurada');
  }
  
  const key = useServiceRole ? supabaseConfig.serviceRoleKey : supabaseConfig.anonKey;
  
  if (!key) {
    const keyType = useServiceRole ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY';
    throw new Error(`${keyType} no está configurada`);
  }
  
  return createClient<Database>(
    supabaseConfig.url,
    key,
    {
      auth: {
        autoRefreshToken: !useServiceRole,
        persistSession: !useServiceRole
      },
      ...customConfig
    }
  );
}