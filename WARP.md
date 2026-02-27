# NTV360 Ops Core (ntv-ops-core) - Warp Configuration

## Project Overview
**Repository:** ntv-ops-core  
**Description:** Vendor-independent internal "Ops Core" system for night-shift operations  
**Current Branch:** phase/foundation/scafolding-setup  
**Version:** 1.0.0  

**Goal:** Replace spreadsheet + fragmented ticket/chat workflows with a single source of truth for:
- Installations tracking (queue + saved views)
- Incidents/support tracking  
- Player registry + linking (Inventory truth: NCompass Dashboard; Remote truth: MeshCentral)
- Audit trail and reporting (replace chat-only verification)

## Technology Stack
- **Framework:** Angular 20.3.7
- **Language:** TypeScript 5.8.3
- **Styling:** SCSS + Tailwind CSS 3.4.18
- **Database:** Supabase (PostgreSQL)
- **Server:** Express.js with SSR support
- **Component Library:** @ntv360/component-pantry
- **Charts:** ng-apexcharts + lottie-web
- **HTTP Client:** Axios
- **Package Manager:** npm

## Project Structure

### Core Architecture
```
src/app/
├── core/                 # Core services, guards, interceptors
│   ├── guards/          # Route guards
│   ├── services/        # Singleton services
│   └── supabase/        # Supabase integration
├── features/            # Feature modules (lazy-loaded)
│   ├── auth/            # Authentication
│   ├── admin/           # Admin functionality
│   ├── dashboard/       # Main dashboard
│   ├── incidents/       # Incident tracking
│   ├── installations/   # Installation management
│   └── work/            # Work orders
├── layout/              # Layout components
│   └── authenticated/   # Authenticated user layout
├── shared/              # Shared components, pipes, directives
│   └── components/      # Reusable UI components
└── app.routes.ts        # Main routing configuration
```

### Path Aliases (TypeScript)
- `@core` → `./src/app/core/index.ts`
- `@core/*` → `./src/app/core/*`
- `@features` → `./src/app/features/index.ts`
- `@features/*` → `./src/app/features/*`
- `@layouts` → `./src/app/layout/index.ts`
- `@layouts/*` → `./src/app/layout/*`
- `@shared` → `./src/app/shared/index.ts`
- `@shared/*` → `./src/app/shared/*`

## Development Workflow

### Available Scripts
- `npm run dev` - Start Angular development server
- `npm run dev:all` - Start both database and web server concurrently
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run db:start` - Start Supabase database
- `npm run db:stop` - Stop Supabase database
- `npm run db:reset` - Reset database with fresh schema
- `npm run db:migrate` - Apply database migrations
- `npm run pretty` - Format code with Prettier
- `npm run pretty:check` - Check code formatting

### Code Quality & Standards
- **Linting:** ESLint with Angular rules
- **Formatting:** Prettier with organize-imports plugin
- **Git Hooks:** Husky for pre-commit hooks
- **Commit Convention:** Conventional Commits (@commitlint)
- **Type Safety:** Strict TypeScript configuration

### Component Generation Defaults
- **Style:** SCSS
- **Prefix:** `app`
- **Type Separator:** `.` (e.g., `auth.guard.ts`)

## Database & Backend

### Supabase Integration
- **ORM:** Supabase JavaScript client
- **Authentication:** Supabase Auth
- **Real-time:** Supabase Realtime subscriptions
- **Storage:** Supabase Storage (if needed)

### Environment Configuration
Required environment variables (see `.env.example`):
- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment (development/production)
- `ENABLE_LOGGING` - Enable server logging
- `API_BASE_URL` - Backend API endpoint
- `API_TIMEOUT` - API request timeout
- `ALLOWED_ORIGIN` - CORS origin for production

## Coding Guidelines

### Component Architecture
- Use standalone components (Angular 14+ pattern)
- Implement lazy loading for feature modules
- Follow Angular style guide conventions
- Use reactive forms over template-driven forms

### State Management
- Use Angular services for state management
- Implement RxJS patterns for reactive programming
- Use Supabase real-time subscriptions for live data

### Styling Guidelines
- Use SCSS for component-specific styles
- Leverage Tailwind CSS for utility classes
- Use @ntv360/component-pantry for consistent UI components
- Follow mobile-first responsive design

### File Naming Conventions
- Components: `component-name.component.ts`
- Services: `service-name.service.ts`
- Guards: `guard-name.guard.ts`
- Models: `model-name.model.ts`
- Interfaces: `interface-name.interface.ts`

## Build & Deployment

### Build Configuration
- **Production:** Optimized build with hashing
- **Development:** Source maps enabled, no optimization
- **SSR:** Server-side rendering configured
- **Bundle Budgets:** 500kb warning, 1mb error for initial bundle

### Dependencies
- **Runtime:** Angular, Supabase, Axios, RxJS
- **Development:** Angular CLI, TypeScript, Prettier, Husky
- **UI:** @ntv360/component-pantry, ng-apexcharts, lottie-web

## Features Overview

### Core Features
1. **Authentication** - Login/logout with Supabase Auth
2. **Dashboard** - Central operations overview
3. **Installations** - Track installation queue and status
4. **Incidents** - Support ticket and incident management
5. **Work Orders** - Work order tracking and management
6. **Admin** - Administrative functions

### Planned Integrations
- **NCompass Dashboard** - Inventory truth source
- **MeshCentral** - Remote management truth source
- **Audit Trail** - Replace chat-only verification

## Development Notes

### Current Phase: Foundation/Scaffolding Setup
- Basic Angular structure established
- Supabase integration configured
- Component library integration complete
- Routing structure defined
- TypeScript path aliases configured

### Next Steps
- Implement authentication flow
- Build core feature components
- Set up database schema
- Implement real-time subscriptions
- Add comprehensive testing

## Important Reminders
- Always use path aliases for imports
- Follow conventional commit standards
- Run prettier before committing
- Test database operations with `npm run db:reset` when needed
- Use `npm run dev:all` to start full development environment
- Maintain CHANGELOG.md for all modifications
- Version bump required before commits/releases