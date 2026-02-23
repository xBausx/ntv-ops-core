-- Phase 1 — Core schema (portable Postgres-first)
-- Source of truth tables: players, work_items, work_item_players, work_events, external_refs

-- Extensions (safe on Supabase; portable Postgres)
create extension if not exists "pgcrypto" with schema extensions;

-- -----------------------------------------------------------------------------
-- Utility: updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- players
-- -----------------------------------------------------------------------------
create table if not exists public.players (
  license_uuid     uuid primary key,
  hostname         text,
  dealer_alias     text,
  site_alias       text,
  license_type     text,
  screen           text,

  -- External deep links / mappings (truth lives elsewhere)
  dashboard_url    text,
  mesh_device_id   text,
  mesh_url         text,

  tags             text[] not null default '{}'::text[],

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists trg_players_set_updated_at on public.players;
create trigger trg_players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create index if not exists idx_players_dealer_alias on public.players (dealer_alias);
create index if not exists idx_players_site_alias   on public.players (site_alias);
create index if not exists idx_players_hostname     on public.players (hostname);

-- -----------------------------------------------------------------------------
-- work_items
-- -----------------------------------------------------------------------------
create table if not exists public.work_items (
  work_id              uuid primary key default gen_random_uuid(),

  type                 text not null,
  status               text not null,
  priority             text not null default 'MEDIUM',

  assignee_user_id     uuid,
  scheduled_for        timestamptz,
  sla_due              timestamptz,

  summary              text not null,
  description          text,

  -- BLOCKED support (queue-friendly fields; details can also live in work_events.payload)
  blocked_reason_code  text,
  blocked_reason_detail text,

  verified_at          timestamptz,
  closed_at            timestamptz,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint work_items_type_chk check (type in ('INSTALL','INCIDENT','TASK')),
  constraint work_items_status_chk check (status in ('NEW','SCHEDULED','IN_PROGRESS','BLOCKED','VERIFIED','CLOSED')),
  constraint work_items_priority_chk check (priority in ('LOW','MEDIUM','HIGH','URGENT')),

  -- If status is BLOCKED, require a reason code
  constraint work_items_blocked_reason_chk check (
    status <> 'BLOCKED' OR blocked_reason_code is not null
  )
);

drop trigger if exists trg_work_items_set_updated_at on public.work_items;
create trigger trg_work_items_set_updated_at
before update on public.work_items
for each row execute function public.set_updated_at();

create index if not exists idx_work_items_status        on public.work_items (status);
create index if not exists idx_work_items_type_status   on public.work_items (type, status);
create index if not exists idx_work_items_scheduled_for on public.work_items (scheduled_for);
create index if not exists idx_work_items_assignee      on public.work_items (assignee_user_id);
create index if not exists idx_work_items_sla_due       on public.work_items (sla_due);

-- -----------------------------------------------------------------------------
-- work_item_players (join)
-- -----------------------------------------------------------------------------
create table if not exists public.work_item_players (
  work_id       uuid not null references public.work_items (work_id) on delete cascade,
  license_uuid  uuid not null references public.players (license_uuid) on delete restrict,
  created_at    timestamptz not null default now(),
  primary key (work_id, license_uuid)
);

create index if not exists idx_work_item_players_license_uuid on public.work_item_players (license_uuid);

-- -----------------------------------------------------------------------------
-- work_events (audit timeline)
-- -----------------------------------------------------------------------------
create table if not exists public.work_events (
  event_id     uuid primary key default gen_random_uuid(),
  work_id      uuid not null references public.work_items (work_id) on delete cascade,

  -- Keep flexible (no CHECK) so we can add event types without blocking writes.
  event_type   text not null,

  payload      jsonb not null default '{}'::jsonb,

  -- Supabase Auth user id (uuid). No FK for portability.
  created_by   uuid,
  created_at   timestamptz not null default now()
);

create index if not exists idx_work_events_work_id_created_at
  on public.work_events (work_id, created_at desc);

-- -----------------------------------------------------------------------------
-- external_refs (polymorphic, but enforced via explicit FK columns)
-- -----------------------------------------------------------------------------
create table if not exists public.external_refs (
  external_ref_id     uuid primary key default gen_random_uuid(),

  -- e.g. MONDAY / HUBSPOT / SHEETS / DASHBOARD / MESHCENTRAL / XLSX
  -- Keep flexible (no CHECK) so adapters remain disposable.
  system              text not null,
  external_id         text not null,
  url                 text,

  entity_type         text not null,
  player_license_uuid uuid references public.players (license_uuid) on delete cascade,
  work_id             uuid references public.work_items (work_id) on delete cascade,

  created_at          timestamptz not null default now(),

  constraint external_refs_entity_type_chk check (entity_type in ('PLAYER','WORK_ITEM')),
  constraint external_refs_entity_fk_chk check (
    (entity_type = 'PLAYER'   and player_license_uuid is not null and work_id is null) OR
    (entity_type = 'WORK_ITEM' and work_id is not null and player_license_uuid is null)
  ),

  -- Idempotency anchor (critical for sync/import jobs)
  constraint external_refs_system_external_id_uq unique (system, external_id)
);

create index if not exists idx_external_refs_player on public.external_refs (player_license_uuid);
create index if not exists idx_external_refs_work   on public.external_refs (work_id);