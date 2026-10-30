import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'shopcore_supabase_credentials';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          return {
            url: parsed.url.trim().replace(/\/+$/, ''),
            anonKey: parsed.anonKey.trim(),
          };
        }
      }
    } catch {
      // fallback to env
    }
  }

  return {
    url: envUrl.trim().replace(/\/+$/, ''),
    anonKey: envAnonKey.trim(),
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  if (typeof window !== 'undefined') {
    const cleanedConfig = {
      url: config.url.trim().replace(/\/+$/, ''),
      anonKey: config.anonKey.trim(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedConfig));
    supabaseInstance = null; // Reset cached client instance
    window.location.reload();
  }
}

export function clearSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    supabaseInstance = null;
    window.location.reload();
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (
    !config.url ||
    !config.anonKey ||
    config.url.includes('your-project') ||
    config.anonKey.includes('your-anon-key') ||
    !config.url.startsWith('http')
  ) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
}

export async function checkSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Supabase credentials not configured or placeholder detected' };
  }
  try {
    const { error } = await client.from('products').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          ok: false,
          message: 'Connected to Supabase, but database tables are not yet created. Run schema.sql in Supabase SQL Editor.',
        };
      }
      return { ok: false, message: error.message };
    }
    return { ok: true, message: 'Connected to Supabase PostgreSQL (All tables verified)' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown connection error';
    return { ok: false, message: errorMsg };
  }
}
