import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase.config';
import { Database } from '../types/database.types';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey
);

export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export function createSupabaseClient(options?: {
  useServiceRole?: boolean;
  customConfig?: any;
}): SupabaseClient<Database> {
  const { useServiceRole = false, customConfig = {} } = options || {};
  
  const key = useServiceRole ? supabaseConfig.serviceRoleKey : supabaseConfig.anonKey;
  
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