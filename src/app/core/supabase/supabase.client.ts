import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// IMPORTANT:
// - Frontend must use ONLY anon/public key.
// - Service role keys are for Edge Functions / server-only code.
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  if (!environment?.supabaseUrl || !environment?.supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set environment.supabaseUrl and environment.supabaseAnonKey.'
    );
  }

  client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}