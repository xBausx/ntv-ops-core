-- Core schema (portable Postgres-first) for Ops Core
-- Source of truth: public schema in Supabase Postgres

-- Extensions
create extension if not exists pgcrypto;

-- Shared utility: updated_at auto-touch
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- players
-- =========================
create table public.players (
  license_uuid uuid primary key,

  hostname text,
  dealer_alias text,
  site_alias text,
  license_type text,
  screen text,

  dashboard_url text,

  mesh_device_id text,
  mesh_url text,

  tags text[] not null default '{}'::text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create index idx_players_hostname on public.players (hostname);
create index idx_players_site_alias on public.players (site_alias);
create index idx_players_dealer_alias on public.players (dealer_alias);

create index idx_players_hostname_lower on public.players (lower(hostname));
create index idx_players_site_alias_lower on public.players (lower(site_alias));
create index idx_players_dealer_alias_lower on public.players (lower(dealer_alias));

create index idx_players_tags_gin on public.players using gin (tags);

-- =========================
-- work_items
-- =========================
create table public.work_items (
  work_id uuid primary key default gen_random_uuid(),

  type text not null,
  status text not null,
  priority smallint not null default 3,

  assignee_user_id uuid null references auth.users(id),

  scheduled_for timestamptz null,
  sla_due timestamptz null,

  summary text not null,
  description text null,

  blocked_reason_code text null,
  blocked_reason_detail text null,

  verified_at timestamptz null,
  closed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ck_work_items_type
    check (type in ('INSTALL', 'INCIDENT', 'TASK')),

  constraint ck_work_items_status
    check (status in ('NEW', 'SCHEDULED', 'IN_PROGRESS', 'BLOCKED', 'VERIFIED', 'CLOSED')),

  constraint ck_work_items_priority_range
    check (priority between 1 and 5),

  constraint ck_work_items_blocked_reason_required
    check (status <> 'BLOCKED' or blocked_reason_code is not null),

  constraint ck_work_items_verified_at_required
    check (status <> 'VERIFIED' or verified_at is not null),

  constraint ck_work_items_closed_at_required
    check (status <> 'CLOSED' or closed_at is not null)
);

create trigger trg_work_items_set_updated_at
before update on public.work_items
for each row execute function public.set_updated_at();

-- Queue-friendly indexes
create index idx_work_items_type_status on public.work_items (type, status);
create index idx_work_items_type_status_scheduled_for on public.work_items (type, status, scheduled_for);
create index idx_work_items_type_status_priority_sla on public.work_items (type, status, priority, sla_due);
create index idx_work_items_assignee on public.work_items (assignee_user_id);

-- =========================
-- work_item_players (join)
-- =========================
create table public.work_item_players (
  work_id uuid not null references public.work_items(work_id) on delete cascade,
  license_uuid uuid not null references public.players(license_uuid) on delete restrict,

  created_at timestamptz not null default now(),

  primary key (work_id, license_uuid)
);

create index idx_work_item_players_license_uuid on public.work_item_players (license_uuid);

-- =========================
-- work_events (append-only)
-- =========================
create table public.work_events (
  event_id uuid primary key default gen_random_uuid(),

  work_id uuid not null references public.work_items(work_id) on delete cascade,

  event_type text not null,
  payload jsonb not null default '{}'::jsonb,

  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_work_events_work_id_created_at on public.work_events (work_id, created_at);

-- =========================
-- external_refs (disposable adapters)
-- =========================
create table public.external_refs (
  external_ref_id uuid primary key default gen_random_uuid(),

  system text not null,
  external_id text not null,
  url text null,

  -- Polymorphic association: exactly one target
  license_uuid uuid null references public.players(license_uuid) on delete cascade,
  work_id uuid null references public.work_items(work_id) on delete cascade,

  created_at timestamptz not null default now(),

  constraint ck_external_refs_system
    check (system in ('MONDAY', 'HUBSPOT', 'SHEETS', 'DASHBOARD', 'MESHCENTRAL', 'XLSX')),

  constraint ck_external_refs_one_target
    check (
      (license_uuid is not null and work_id is null)
      or
      (license_uuid is null and work_id is not null)
    )
);

-- Ensure external mappings are unique per system
create unique index ux_external_refs_system_external_id
on public.external_refs (system, external_id);

create unique index ux_external_refs_license_uuid_dashboard
on public.external_refs (license_uuid, system)
where license_uuid is not null and system = 'DASHBOARD';

create unique index ux_external_refs_license_uuid_meshcentral
on public.external_refs (license_uuid, system)
where license_uuid is not null and system = 'MESHCENTRAL';

create index idx_external_refs_license_uuid on public.external_refs (license_uuid);
create index idx_external_refs_work_id on public.external_refs (work_id);