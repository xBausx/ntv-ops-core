-- RLS baseline for Ops Core
-- Roles: ADMIN / OPS / READ_ONLY
-- NOTE: profiles role management should be done via service-role (Edge Functions).
-- We intentionally do NOT allow admins to select all profiles via RLS to avoid recursion/overexposure.

-- =========================
-- profiles (auth.users -> app role)
-- =========================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),

  constraint ck_profiles_role
    check (role in ('ADMIN', 'OPS', 'READ_ONLY'))
);

alter table public.profiles enable row level security;

-- Helper: role check (security definer, but constrained to auth.uid())
create or replace function public.has_any_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = any(required_roles)
  );
$$;

revoke all on function public.has_any_role(text[]) from public;
grant execute on function public.has_any_role(text[]) to authenticated;

-- profiles policies:
-- Users can read ONLY their own profile row (no insert/update/delete from client).
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

-- =========================
-- Enable RLS on core tables
-- =========================
alter table public.players enable row level security;
alter table public.work_items enable row level security;
alter table public.work_item_players enable row level security;
alter table public.work_events enable row level security;
alter table public.external_refs enable row level security;

-- =========================
-- READ access (all roles)
-- =========================
drop policy if exists "players_select_all_roles" on public.players;
create policy "players_select_all_roles"
on public.players
for select
to authenticated
using (public.has_any_role(array['ADMIN','OPS','READ_ONLY']));

drop policy if exists "work_items_select_all_roles" on public.work_items;
create policy "work_items_select_all_roles"
on public.work_items
for select
to authenticated
using (public.has_any_role(array['ADMIN','OPS','READ_ONLY']));

drop policy if exists "work_item_players_select_all_roles" on public.work_item_players;
create policy "work_item_players_select_all_roles"
on public.work_item_players
for select
to authenticated
using (public.has_any_role(array['ADMIN','OPS','READ_ONLY']));

drop policy if exists "work_events_select_all_roles" on public.work_events;
create policy "work_events_select_all_roles"
on public.work_events
for select
to authenticated
using (public.has_any_role(array['ADMIN','OPS','READ_ONLY']));

drop policy if exists "external_refs_select_all_roles" on public.external_refs;
create policy "external_refs_select_all_roles"
on public.external_refs
for select
to authenticated
using (public.has_any_role(array['ADMIN','OPS','READ_ONLY']));

-- =========================
-- WRITE access (OPS + ADMIN)
-- =========================

-- work_items: ops/admin can insert + update
drop policy if exists "work_items_insert_ops_admin" on public.work_items;
create policy "work_items_insert_ops_admin"
on public.work_items
for insert
to authenticated
with check (public.has_any_role(array['ADMIN','OPS']));

drop policy if exists "work_items_update_ops_admin" on public.work_items;
create policy "work_items_update_ops_admin"
on public.work_items
for update
to authenticated
using (public.has_any_role(array['ADMIN','OPS']))
with check (public.has_any_role(array['ADMIN','OPS']));

-- work_item_players: ops/admin can link/unlink players to work items
drop policy if exists "work_item_players_insert_ops_admin" on public.work_item_players;
create policy "work_item_players_insert_ops_admin"
on public.work_item_players
for insert
to authenticated
with check (public.has_any_role(array['ADMIN','OPS']));

drop policy if exists "work_item_players_delete_ops_admin" on public.work_item_players;
create policy "work_item_players_delete_ops_admin"
on public.work_item_players
for delete
to authenticated
using (public.has_any_role(array['ADMIN','OPS']));

-- work_events: ops/admin can append events
-- Enforce that client-created events cannot spoof created_by
drop policy if exists "work_events_insert_ops_admin" on public.work_events;
create policy "work_events_insert_ops_admin"
on public.work_events
for insert
to authenticated
with check (
  public.has_any_role(array['ADMIN','OPS'])
  and created_by = auth.uid()
);

-- =========================
-- WRITE access (ADMIN only)
-- =========================

-- players: admin-only writes (we can relax later if needed)
drop policy if exists "players_insert_admin" on public.players;
create policy "players_insert_admin"
on public.players
for insert
to authenticated
with check (public.has_any_role(array['ADMIN']));

drop policy if exists "players_update_admin" on public.players;
create policy "players_update_admin"
on public.players
for update
to authenticated
using (public.has_any_role(array['ADMIN']))
with check (public.has_any_role(array['ADMIN']));

drop policy if exists "players_delete_admin" on public.players;
create policy "players_delete_admin"
on public.players
for delete
to authenticated
using (public.has_any_role(array['ADMIN']));

-- external_refs: admin-only writes (privileged/adapters/links)
drop policy if exists "external_refs_insert_admin" on public.external_refs;
create policy "external_refs_insert_admin"
on public.external_refs
for insert
to authenticated
with check (public.has_any_role(array['ADMIN']));

drop policy if exists "external_refs_update_admin" on public.external_refs;
create policy "external_refs_update_admin"
on public.external_refs
for update
to authenticated
using (public.has_any_role(array['ADMIN']))
with check (public.has_any_role(array['ADMIN']));

drop policy if exists "external_refs_delete_admin" on public.external_refs;
create policy "external_refs_delete_admin"
on public.external_refs
for delete
to authenticated
using (public.has_any_role(array['ADMIN']));

-- Optional: allow ADMIN-only deletion of work_items (usually avoided; keep for cleanup)
drop policy if exists "work_items_delete_admin" on public.work_items;
create policy "work_items_delete_admin"
on public.work_items
for delete
to authenticated
using (public.has_any_role(array['ADMIN']));