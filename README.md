# NTV360 Ops Core (ntv-ops-core)

Vendor-independent internal “Ops Core” system for night-shift operations.

**Goal:** Replace spreadsheet + fragmented ticket/chat workflows with a single source of truth for:
- Installations tracking (queue + saved views)
- Incidents/support tracking
- Player registry + linking (Inventory truth: NCompass Dashboard; Remote truth: MeshCentral)
- Audit trail and reporting (replace chat-only verification)

**Design principles**
- Ops Core is the source of truth (not Monday/Sheets).
- Universal key: `license_uuid` (UUID).
- Inventory truth remains NCompass Dashboard; Ops Core stores mappings + deep links.
- Remote truth remains MeshCentral; Ops Core stores `mesh_device_id` + deep link (+ optional last-seen).
- Work truth: Ops Core stores work items with strict statuses and an audit timeline.
- Integrations/adapters are disposable and optional.
- Everything exportable (CSV/JSON) to avoid lock-in.

---

## Phase 1 MVP plan

### MVP screens (must-have)
1) **Install Queue**
   - Replace “Today Forward” spreadsheet workflow.
   - Saved views/filters (e.g., Today, Tomorrow, This Week, Blocked, Unassigned).
   - Fast inline actions: assign, change status, schedule date, add note.
2) **Incident Queue**
   - Similar queue UX; filters by priority/SLA/status/dealer/site.
3) **Player Search + Player Profile**
   - Search by `license_uuid`, hostname, dealer/site, tags.
   - Show: inventory fields + NCompass deep link, MeshCentral deep link, open work items, work history.
4) **Work Item Detail**
   - Canonical status + audit timeline (work events).
   - Notes, evidence links/files, external references (Monday/HubSpot/Sheets/etc.).
5) **Admin: XLSX import (migration)**
   - Import installs/history from the existing tracker to bootstrap Ops Core.

### MVP success metrics (definition of “spreadsheet replaced”)
- 90%+ of installation tracking happens in Ops Core UI (not Sheets) within 2 weeks of launch.
- Install queue loads in < 1s for typical filters (using indexed queries).
- Every status change creates a `work_event` (no “silent” updates).
- Verification is captured as an auditable event (actor + timestamp + payload).
- 100% exportable: installs/incidents/work history can be exported to CSV/JSON.

### Non-goals (MVP)
- Full two-way sync with Monday/HubSpot (one-way import/link only unless rules are defined).
- Complex role workflows beyond Admin/Ops/Read-only.
- Perfect parity with every existing sheet column (we’ll map what matters, keep raw ref in `external_refs`).

---

## Proposed repo structure (Phase 0 foundations)

We will follow the agreed layout once scaffolding is created:

```
ntv-ops-core/
  supabase/
    migrations/            # SQL migrations committed to git
    functions/             # Edge Functions (Deno/TS)
  worker/                  # scheduled jobs (Docker/Node or Deno)
  scripts/                 # one-off import/export tools
  src/                     # Angular app (after scaffold)
```

---

## Data model (MVP) — portable Postgres-first

> We prefer constraints + indexes in Postgres so business rules do not live only in UI.

### Table: `players`
- **PK:** `license_uuid uuid`
- Core fields: hostname, dealer_alias, site_alias, license_type, screen, tags (text[])
- Linking fields:
  - `dashboard_url text` (deep link)
  - `mesh_device_id text`
  - `mesh_url text` (deep link)

### Table: `work_items`
- **PK:** `work_id uuid` (generated)
- Fields: `type`, `status`, `priority`, `assignee_user_id`, `scheduled_for`, `sla_due`
- Text: `summary`, `description`
- Timestamps: created_at, updated_at, closed_at, verified_at (optional)

### Table: `work_item_players` (join)
- Composite unique: (`work_id`, `license_uuid`)

### Table: `work_events` (audit timeline)
- **PK:** `event_id uuid`
- FK: `work_id`
- Fields: `event_type`, `payload jsonb`, `created_by`, `created_at`
- This is the canonical audit trail.

### Table: `external_refs`
- **PK:** `external_ref_id uuid`
- Fields:
  - `entity_type` (PLAYER / WORK_ITEM)
  - `entity_id` (uuid reference stored as uuid; for players this equals license_uuid)
  - `system` (MONDAY / HUBSPOT / SHEETS / DASHBOARD / MESHCENTRAL / XLSX)
  - `external_id text`
  - `url text`
- Uniqueness for idempotency:
  - (`system`, `external_id`) unique
  - (`entity_type`, `entity_id`, `system`, `external_id`) unique (optional, depends on approach)

---

## Schema constraints + indexes (planned)

We will implement these via `supabase/migrations/*.sql`:

### Integrity constraints
- `players.license_uuid` is required and unique (PK).
- Work item enums via CHECK constraints (portable + easy migrations):
  - `work_items.type IN ('INSTALL','INCIDENT','TASK')`
  - `work_items.status IN ('NEW','SCHEDULED','IN_PROGRESS','BLOCKED','VERIFIED','CLOSED')`
  - `work_items.priority IN ('LOW','MEDIUM','HIGH','URGENT')`
- FK constraints:
  - `work_item_players.work_id -> work_items.work_id` (cascade delete)
  - `work_item_players.license_uuid -> players.license_uuid` (restrict delete)
  - `work_events.work_id -> work_items.work_id` (cascade delete)
- `work_item_players` unique(work_id, license_uuid)

### Queue performance indexes (baseline)
- `work_items(status)`
- `work_items(type, status)`
- `work_items(scheduled_for)`
- `work_items(assignee_user_id)`
- `work_items(sla_due)`
- `players(dealer_alias)`
- `players(site_alias)`
- `players(hostname)` (or trigram later if needed)
- `work_item_players(license_uuid)` and `(work_id)`
- `work_events(work_id, created_at desc)`
- `external_refs(system, external_id)` unique index

### Audit strategy
- Every key action creates a `work_event`:
  - STATUS_CHANGED
  - NOTE_ADDED
  - VERIFIED_ONLINE
  - PLAYER_SYNCED (from Dashboard)
  - MESH_LAST_SEEN_SYNCED (optional)
  - EXTERNAL_REF_LINKED/UNLINKED
- Optional DB trigger (Phase 1.x):
  - on `work_items.status` change → auto-insert STATUS_CHANGED event

---

## RLS policy approach (high-level)

We will use Supabase Auth + Postgres RLS.

### Roles
- Admin
- Ops
- Read-only

### Role storage approach (recommended)
- Create `profiles` table keyed by `user_id` (auth.users.id), with:
  - `role text CHECK (role IN ('ADMIN','OPS','READ_ONLY'))`
- Policies read role from `profiles.role`.

### High-level permissions
- **Read-only**
  - SELECT on all core tables/views needed by UI
  - no INSERT/UPDATE/DELETE
- **Ops**
  - SELECT everything needed by UI
  - INSERT/UPDATE on `work_items` (except restricted fields like imports)
  - INSERT on `work_events` (always allowed; events are append-only)
  - Limited UPDATE on `players` (only tags / hostname / mesh mapping fields if needed)
  - INSERT on `external_refs` only via Edge Function OR limited direct rules
- **Admin**
  - Full access including imports, bulk operations, and configuration tables

### “Client direct write vs Edge Function write”
- Default: allow Ops to do normal work item lifecycle updates from client under RLS.
- Privileged or bulk operations via Edge Functions (service role), admin-only:
  - XLSX import
  - verification endpoints that must be tamper-resistant
  - external ref linking/unlinking (optional)

---

## Angular app structure (when scaffolding is created)

Feature-first structure under `src/app`:

- `core/` (singletons/infrastructure)
  - `auth/` (Supabase auth wrapper, session)
  - `guards/` (role guards)
  - `interceptors/` (optional)
  - `supabase/` (client wrapper + typed helpers)
  - `layout/` (shell, nav)
  - `config/` (env config, feature flags)

- `shared/` (reusable UI/utilities; no feature business logic)
  - `ui/` (thin wrappers around pantry components if needed)
  - `pipes/`
  - `directives/`
  - `util/`
  - `types/`

- `features/` (vertical slices)
  - `installations/`
  - `incidents/`
  - `players/`
  - `work-items/`
  - `admin/`

Each feature:
- `shell/` (route components/pages + feature routes)
- `ui/` (presentational components)
- `data-access/` (facades/services calling Supabase/Edge Functions)
- `models/` (types/enums/interfaces)

Routing:
- top-level in `app.routes.ts`
- feature routes exported and lazy-loaded

UI:
- Pantry-first components from `@ntv-scaffolding/component-pantry`
- Do not guess pantry APIs; verify from pantry docs/examples before implementing.

Grid/Table strategy:
- Start with pantry `<ntv-table>` if it supports required sorting/filter/pagination + row click.
- If we need spreadsheet-like features (heavy inline edit, virtualization, bulk operations):
  - Prefer AG Grid Community (free) OR justify a paid option.
- Wrap chosen grid behind a thin internal abstraction to keep it swappable.

---

## Migration approach (XLSX installations tracker → Ops Core)

### Target mapping (minimum viable)
- Create/Upsert `players` keyed by `license_uuid`
- Create `work_items` of type INSTALL (or INCIDENT if sheet contains that)
- Create `work_item_players` links
- Create `external_refs` entries pointing back to the XLSX/Sheet row identifiers

### Idempotency rules (critical)
- `players`: upsert by `license_uuid`
- `external_refs`: unique(system, external_id) prevents duplicates
- For work items imported from sheet:
  - Store an `external_refs` row with system = XLSX or SHEETS and external_id = row_id (or a stable hash)
  - Import script checks if that external_ref already exists; if yes, skip or update

### Implementation plan (Phase 2 Edge Function)
- Admin uploads XLSX → Edge Function parses → batch writes to DB (service role)
- Writes `work_events` as part of import:
  - IMPORTED_FROM_XLSX with payload including source file name, row id, mapped fields

---

## Phase 0 foundations checklist (make local dev reproducible)

### Local prerequisites
- Node.js (LTS), package manager (npm/pnpm), Git
- Supabase CLI installed
- Docker installed (required by Supabase local stack)

### Initialize Supabase locally
```bash
supabase init
supabase start
```

### Environment strategy
- Keep secrets out of the repo.
- Commit only examples: `.env.example`
- Use separate projects/environments: **local**, **staging**, **prod**
- Prefer a secret manager (platform or CI) for deployment secrets.

### What “done” means for Phase 0
- `supabase start` boots the local stack successfully.
- A migration can be applied locally and verified in Postgres.
- CI can run lint/tests (once Angular scaffold exists).
- No secrets committed; only example env files.

---
