-- Phase 1.5 — Security baseline (Supabase Auth + RLS)
-- Roles are stored in public.profiles. RLS requires a profile row for access.

-- -----------------------------------------------------------------------------
-- profiles (user role map)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_role_chk check (role in ('ADMIN','OPS','READ_ONLY'))
);

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- IMPORTANT:
-- Do NOT add "admin can read all profiles" policies here, because that creates
-- self-referential RLS recursion. Manage roles via service role / Edge Functions.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies on profiles for authenticated users.
-- Service role (Edge Functions) bypasses RLS and can manage roles.

-- -----------------------------------------------------------------------------
-- Helper predicates (inline via EXISTS to avoid extra functions)
-- -----------------------------------------------------------------------------
-- "has_profile": exists(select 1 from profiles where user_id = auth.uid())
-- "is_ops":     role in ('OPS','ADMIN')
-- "is_admin":   role = 'ADMIN'

-- -----------------------------------------------------------------------------
-- Enable RLS on core tables
-- -----------------------------------------------------------------------------
alter table public.players enable row level security;
alter table public.work_items enable row level security;
alter table public.work_item_players enable row level security;
alter table public.work_events enable row level security;
alter table public.external_refs enable row level security;

-- -----------------------------------------------------------------------------
-- players policies
-- - Everyone with a profile can read.
-- - Writes restricted to ADMIN for MVP (tightest safe baseline).
-- -----------------------------------------------------------------------------
drop policy if exists "players_select" on public.players;
create policy "players_select"
on public.players
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
  )
);

drop policy if exists "players_admin_insert" on public.players;
create policy "players_admin_insert"
on public.players
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists "players_admin_update" on public.players;
create policy "players_admin_update"
on public.players
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'ADMIN'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists "players_admin_delete" on public.players;
create policy "players_admin_delete"
on public.players
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'ADMIN'
  )
);

-- -----------------------------------------------------------------------------
-- work_items policies
-- - Everyone with a profile can read.
-- - OPS+ADMIN can create/update.
-- - Delete restricted to ADMIN.
-- -----------------------------------------------------------------------------
drop policy if exists "work_items_select" on public.work_items;
create policy "work_items_select"
on public.work_items
for select
to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid())
);

drop policy if exists "work_items_ops_insert" on public.work_items;
create policy "work_items_ops_insert"
on public.work_items
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('OPS','ADMIN')
  )
);

drop policy if exists "work_items_ops_update" on public.work_items;
create policy "work_items_ops_update"
on public.work_items
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('OPS','ADMIN')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('OPS','ADMIN')
  )
);

drop policy if exists "work_items_admin_delete" on public.work_items;
create policy "work_items_admin_delete"
on public.work_items
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'ADMIN'
  )
);

-- -----------------------------------------------------------------------------
-- work_item_players policies
-- - Everyone with a profile can read.
-- - OPS+ADMIN can link/unlink players to work items.
-- -----------------------------------------------------------------------------
drop policy if exists "work_item_players_select" on public.work_item_players;
create policy "work_item_players_select"
on public.work_item_players
for select
to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid())
);

drop policy if exists "work_item_players_ops_insert" on public.work_item_players;
create policy "work_item_players_ops_insert"
on public.work_item_players
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('OPS','ADMIN')
  )
);

drop policy if exists "work_item_players_ops_delete" on public.work_item_players;
create policy "work_item_players_ops_delete"
on public.work_item_players
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('OPS','ADMIN')
  )
);

-- -----------------------------------------------------------------------------
-- work_events policies (append-only audit)
-- - Everyone with a profile can read.
-- - OPS+ADMIN can insert.
-- - No update/delete policies (append-only).
-- -----------------------------------------------------------------------------
drop policy if exists "work_events_select" on public.work_events;
create policy "work_events_select"
on public.work_events
for select
to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid())
);

drop policy if exists "work_events_ops_insert" on public.work_events;
create policy "work_events_ops_insert"
on public.work_events
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('OPS','ADMIN')
  )
);

-- -----------------------------------------------------------------------------
-- external_refs policies
-- - Everyone with a profile can read.
-- - Writes restricted to ADMIN for MVP (link/unlink via Edge Functions later).
-- -----------------------------------------------------------------------------
drop policy if exists "external_refs_select" on public.external_refs;
create policy "external_refs_select"
on public.external_refs
for select
to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid())
);

drop policy if exists "external_refs_admin_insert" on public.external_refs;
create policy "external_refs_admin_insert"
on public.external_refs
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists "external_refs_admin_update" on public.external_refs;
create policy "external_refs_admin_update"
on public.external_refs
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'ADMIN'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists "external_refs_admin_delete" on public.external_refs;
create policy "external_refs_admin_delete"
on public.external_refs
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'ADMIN'
  )
);