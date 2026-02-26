# WARP - Architecture Documentation

## Project Overview

**NTV360 Ops Core** is a vendor-independent internal operations management system designed to replace fragmented spreadsheet and ticket/chat workflows for night-shift operations at N-Compass TV.

### What This Project Does

This system serves as a **single source of truth** for:
- **Installation Queue Management**: Replace "Today Forward" spreadsheet workflows with a proper queuing system
- **Incident & Support Tracking**: Centralized incident management with priority/SLA tracking
- **Player Registry & Linking**: Maintain player inventory with deep links to NCompass Dashboard and MeshCentral
- **Audit Trail & Reporting**: Replace chat-only verification with auditable event tracking

### Architecture Stack

- **Frontend**: Angular 20 with Server-Side Rendering (SSR)
- **Backend**: Express.js BFF (Backend for Frontend) layer
- **Database**: Supabase (Postgres) with Row Level Security (RLS)
- **Styling**: TailwindCSS with NTV360 Component Pantry
- **Auth**: Supabase Auth with role-based permissions (Admin/Ops/Read-only)

### Key Design Principles

- **Ops Core as Source of Truth**: Not Monday.com or Google Sheets
- **Universal Key**: `license_uuid` (UUID) for all entities
- **Inventory Integration**: Links to NCompass Dashboard and MeshCentral
- **Auditable Everything**: Every action creates a `work_event` for compliance
- **Export-First**: All data exportable (CSV/JSON) to prevent vendor lock-in

### Current Development Phase

**Phase 1 MVP** focuses on core operational screens:
1. **Install Queue** - Replace spreadsheet workflow with saved views and inline actions
2. **Incident Queue** - Priority/SLA/status filtering with dealer/site organization
3. **Player Search & Profile** - Search by license_uuid, hostname, or location with integrated links
4. **Work Item Detail** - Canonical status tracking with full audit timeline
5. **Admin XLSX Import** - Migration tool to bootstrap from existing tracker data

**Success Metrics**: 90%+ installation tracking in Ops Core (not spreadsheets) within 2 weeks of launch, with sub-1s queue load times and 100% export capability.

## Project Structure

```
src/
├── app/
│   ├── core/              # Infrastructure (guards, services, models)
│   ├── features/          # Business features (dashboard, etc.)
│   ├── layout/            # Layout shells (authenticated, public)
│   └── shared/            # Reusable components, directives, pipes
│
└── server/                # BFF Layer
    ├── config/            # Environment configuration
    ├── middleware/        # Express middleware (origin validation)
    ├── services/          # HTTP client for backend proxy
    └── types/             # TypeScript type definitions
```

## Path Aliases

```typescript
import { AuthService, authGuard, guestGuard } from "@core";
import { DashboardComponent } from "@features/dashboard";
import { MyComponent } from "@shared/components";
import { PublicComponent } from "@layouts/public";
```

## Import Organization

Imports must be organized in groups with section comments:

```typescript
/** Angular Imports */
import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";

/** Third Party Imports */
import axios from "axios";
import express from "express";

/** Local Imports */
import { AuthService } from "@core";
import { DashboardComponent } from "@features/dashboard";
```

**Rules:**

-   Group imports by source (Angular, Third Party, Local)
-   Add section comments: `/** Angular Imports */`, `/** Third Party Imports */`, `/** Local Imports */`
-   Use path aliases for local imports (`@core`, `@features`, etc.)
-   For server files, use `.js` extension: `import { service } from './service.js';`

## Core Data Model

### Key Entities

- **Players**: Digital signage devices identified by `license_uuid` with links to NCompass Dashboard and MeshCentral
- **Work Items**: Tasks/installs/incidents with status tracking (NEW → SCHEDULED → IN_PROGRESS → VERIFIED → CLOSED)
- **Work Events**: Immutable audit trail of all status changes, notes, and verification actions
- **External Refs**: Links to Monday.com, HubSpot, spreadsheets, and other external systems for traceability

### Database Strategy

- **Postgres-First**: Business rules enforced at database level with constraints and indexes
- **Supabase Integration**: Real-time subscriptions, Row Level Security, and Edge Functions
- **Audit Everything**: Every meaningful action creates a timestamped, attributed event record
- **Performance Optimized**: Indexes on common queue filters (status, assignee, scheduled_for, SLA due dates)

## BFF Architecture

```
Browser → SSR Server (BFF) → Supabase API
```

**Benefits:**

-   ✅ Hides backend URLs from browser
-   ✅ Centralized security & validation
-   ✅ SSR-safe authentication with Supabase

## Authentication & Authorization

### Frontend Auth
-   **AuthService**: Manages Supabase auth state with Angular signals
-   **authGuard**: Protects authenticated routes
-   **guestGuard**: Protects public routes  
-   **SSR-safe**: Uses `isPlatformBrowser()` checks

### Role-Based Access Control
-   **Admin**: Full access including imports, bulk operations, user management
-   **Ops**: Standard work item lifecycle, player updates, event creation
-   **Read-only**: View access to all operational data without modification rights

### Security Implementation
-   **Row Level Security (RLS)**: Postgres policies enforce permissions at database level
-   **JWT Integration**: Supabase JWT tokens carry user role information
-   **Edge Functions**: Privileged operations (imports, bulk updates) run server-side only

## Adding Features

1. Create in `features/your-feature/`
2. Add routes in `layout/*/routes.ts`
3. Use path aliases for imports
4. Export via `index.ts` barrel

## Local Development Setup

### Prerequisites
- Node.js (LTS version)
- Docker Desktop (required for Supabase local stack)
- Supabase CLI installed globally

### Quick Start
```bash
# Install dependencies
npm install

# Start Supabase local development stack
supabase start

# Run Angular development server with SSR
npm run dev
```

### Available Scripts
- `npm run start` - Angular dev server (client-side only)
- `npm run dev` - Build and run with SSR
- `npm run build` - Production build
- `npm run pretty` - Format code with Prettier
- `npm test` - Run unit tests

### Environment Configuration
- Copy `.env.example` to `.env` and configure your local settings
- Supabase local stack runs on configured ports (see `supabase/config.toml`)
- Database migrations are in `supabase/migrations/`

---

**Project**: NTV360 Ops Core  
**Repository**: ntv-ops-core  
**Maintained by**: N-Compass TV Development Team  
**Status**: Phase 1 MVP Development
