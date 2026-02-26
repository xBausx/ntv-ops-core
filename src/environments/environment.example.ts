export const environment = {
  // Name only (used for UI labels/logging)
  envName: 'local',

  // Supabase (NEVER put service_role keys in the frontend)
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseAnonKey: 'REPLACE_ME_WITH_LOCAL_ANON_KEY',

  // Optional: base URLs for deep links (keep vendor adapters disposable)
  ncompassDashboardBaseUrl: 'REPLACE_ME_IF_NEEDED',
  meshCentralBaseUrl: 'REPLACE_ME_IF_NEEDED',
};