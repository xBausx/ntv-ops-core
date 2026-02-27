# NTV360 Ops Core (ntv-ops-core)

Vendor-independent internal “Ops Core” system for night-shift operations.

**Goal:** Replace spreadsheet + fragmented ticket/chat workflows with a single source of truth for:
- Installations tracking (queue + saved views)
- Incidents/support tracking
- Player registry + linking (Inventory truth: NCompass Dashboard; Remote truth: MeshCentral)
- Audit trail and reporting (replace chat-only verification)

Start everything: npm run dev:all
Just run Angular: npm run dev
DB reset (fresh schema): npm run db:reset
Apply migrations (no reset): npm run db:migrate