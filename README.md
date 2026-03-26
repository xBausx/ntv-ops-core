# NTV360 Ops Core (ntv-ops-core)

Vendor-independent internal **Ops Core** system for night-shift operations.

## Goal

Replace spreadsheet + fragmented ticket/chat workflows with a single source of truth for:

- Installations tracking
- Incidents / support tracking
- Player registry + linking
- Audit trail and reporting

## Current stack

- Angular
- Angular SSR
- Supabase
- Tailwind CSS
- `@ntv360/component-pantry`

## Prerequisites

- Node.js
- npm

Supabase is invoked through `npx`, so a separate global install is not required for the commands below.

## Install

~~~bash
npm ci
~~~

## Run locally

Run the Angular app only:

~~~bash
npm run dev
~~~

Run local Supabase + Angular together:

~~~bash
npm run dev:all
~~~

## Build

~~~bash
npm run build
~~~

## Test

~~~bash
npm run test
~~~

## Database commands

Start local Supabase:

~~~bash
npm run db:start
~~~

Stop local Supabase:

~~~bash
npm run db:stop
~~~

Reset DB with a fresh schema:

~~~bash
npm run db:reset
~~~

Apply migrations without reset:

~~~bash
npm run db:migrate
~~~

## Formatting

Format the repo:

~~~bash
npm run pretty
~~~

Quick formatting pass:

~~~bash
npm run pretty:quick
~~~

Check formatting only:

~~~bash
npm run pretty:check
~~~

## Available scripts

- `npm run dev` - start Angular locally
- `npm run dev:all` - start local Supabase and Angular together
- `npm run build` - production build
- `npm run watch` - development build in watch mode
- `npm run test` - run unit tests
- `npm run db:start` - start local Supabase
- `npm run db:stop` - stop local Supabase
- `npm run db:reset` - reset local database
- `npm run db:migrate` - apply pending migrations
- `npm run pretty` - format files
- `npm run pretty:quick` - fast formatting pass
- `npm run pretty:check` - formatting check only

## Environment notes

Make sure your local environment variables are configured before running the app.

Examples may include project-specific Supabase values depending on your setup.

## Admin notes

The Admin area includes a **Bootstrap Import** page.

Current behavior:

- file picker is available
- CSV dry-run preview is available
- validation issues are shown before import
- normalized preview rows are shown before import

Still pending:

- XLSX / XLS parsing
- backend import execution flow

## Dev notes

Useful local flow:

1. install dependencies
2. start local services
3. apply or reset DB as needed
4. run the Angular app
5. build before pushing changes

Example:

~~~bash
npm ci
npm run dev:all
~~~