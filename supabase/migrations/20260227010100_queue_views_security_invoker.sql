-- Ensure queue views execute as the INVOKER so underlying table RLS is enforced.
-- Requires Postgres 15+ (Supabase local + hosted are OK).

alter view if exists public.v_work_item_player_agg
  set (security_invoker = true);

alter view if exists public.v_install_queue
  set (security_invoker = true);

alter view if exists public.v_incident_queue
  set (security_invoker = true);