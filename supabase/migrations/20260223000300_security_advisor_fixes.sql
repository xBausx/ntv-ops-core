-- Security Advisor / db lint fixes
-- - Ensure RLS is enabled on public tables
-- - Pin function search_path to prevent "role mutable search_path" warnings

-- 1) Fix function_search_path_mutable lint
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) Ensure RLS is enabled on all core tables (idempotent)
alter table if exists public.profiles enable row level security;
alter table if exists public.players enable row level security;
alter table if exists public.work_items enable row level security;
alter table if exists public.work_item_players enable row level security;
alter table if exists public.work_events enable row level security;
alter table if exists public.external_refs enable row level security;