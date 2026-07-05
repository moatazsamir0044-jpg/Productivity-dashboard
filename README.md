# Productivity Dashboard

A Claude-connected productivity dashboard that converts natural-language goal
discussions into structured execution plans and trackable work items. Claude
is the reasoning and planning layer; the Supabase database is the operational
source of truth after validation and approval.

See `CLAUDE.md` for the full product spec and `docs/architecture.md` for the
implemented architecture.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Auth + Postgres
with RLS) · Zod · Claude API (structured outputs).

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Create a Supabase project and apply the migrations in
   `supabase/migrations/` in filename order (via the Supabase MCP tools,
   `supabase db push`, or the SQL editor).

3. Configure environment variables:

   ```
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `ANTHROPIC_API_KEY`.

4. Run the dev server:

   ```
   npm run dev
   ```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (includes lint + type check) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (validation + business-rule tests) |

## Core workflow

Create a goal → ask Claude for a plan → review the staged plan → approve to
persist milestones, tasks, dependencies, and risks. Nothing AI-generated
reaches production tables without schema validation, business-rule
validation, and your explicit approval.
