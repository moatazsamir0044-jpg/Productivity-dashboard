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

4. Configure Supabase Auth (in the Supabase dashboard):

   - **Authentication → URL Configuration** — set **Site URL** to your app's
     origin (e.g. `http://localhost:3000` for local dev, or your deployed
     URL) and add both to **Redirect URLs** as `<origin>/**`. Confirmation
     links and post-login redirects use the Site URL; leaving it at the
     default sends confirmation emails to `localhost`.
   - For a single-user dashboard, optionally disable the email step under
     **Authentication → Providers → Email → "Confirm email"**. Sign-up then
     logs you in immediately.

5. Run the dev server:

   ```
   npm run dev
   ```

## Deployment (Vercel)

1. Import the repository in Vercel (framework preset: Next.js).
2. Under **Settings → Environment Variables**, add the same three values
   from `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ANTHROPIC_API_KEY`. Environment
   variables only apply to builds created after they are added, so
   **redeploy** afterward (Deployments → ⋯ → Redeploy).
3. In Supabase, set the **Site URL** and **Redirect URLs** (see step 4 above)
   to the deployed origin so email confirmation and sign-in redirects resolve
   to the live site instead of `localhost`.

A missing Supabase/Anthropic env var surfaces as a `500:
MIDDLEWARE_INVOCATION_FAILED` page — the auth middleware needs the Supabase
values on every request. Confirmation links that open `localhost` mean the
Site URL still points at the default.

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
