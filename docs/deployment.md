# Deployment & environment runbook

How the app is configured to run in production, and how to reproduce or
recover that configuration. Secrets themselves live only in `.env.local`
(local) and the Vercel project's environment variables (production) — never
in git.

## Required configuration

Three environment variables, in every environment that runs the app:

| Variable | Where it is used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Project URL, e.g. `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Anon/publishable key; safe to expose, protected by RLS |
| `ANTHROPIC_API_KEY` | server only | Read in `lib/ai/claude.ts`; never exposed to the client |

Optional: `CLAUDE_MODEL` overrides the planning model (default
`claude-sonnet-5`).

## Database

Schema, RLS, and the `approve_staged_plan` function are the three files in
`supabase/migrations/`, applied in filename order. Apply them via the
Supabase SQL editor, `supabase db push`, or the Supabase MCP
`apply_migration` tool against a fresh project. They are idempotent only on a
clean database (they `create` objects), so run them once per project.

## Supabase Auth configuration

These are dashboard settings, not migrations, so they must be set per project.

1. **Authentication → URL Configuration**
   - **Site URL**: the app's public origin (the deployed URL in production,
     `http://localhost:3000` for local dev). Confirmation-email links and
     post-login redirects are built from this value.
   - **Redirect URLs**: add `<origin>/**` for each origin you use
     (production and localhost).
2. **Authentication → Providers → Email**
   - For a single-user dashboard, turning **"Confirm email"** off is the
     simplest path: sign-up then returns a session immediately and the app
     redirects to `/dashboard` (`lib/auth/actions.ts`). With it on, the user
     must click the emailed link, which only works once the Site URL points
     at a reachable origin.

## Vercel

1. Import the repo (Next.js preset). The production branch must contain the
   app — either merge the feature branch to the default branch or set the
   production branch under **Settings → Git**.
2. **Settings → Environment Variables**: add the three variables above.
3. **Redeploy** after adding or changing variables — they only take effect on
   builds created afterward.

`.vercelignore` is configured so that a session-provided `.env.local` is not
uploaded to Vercel; production reads its values from the Vercel environment
variables instead. `.env.local` remains gitignored everywhere.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `500: MIDDLEWARE_INVOCATION_FAILED` on every route | Missing Supabase env vars; the auth middleware runs on every request | Add the two `NEXT_PUBLIC_SUPABASE_*` vars in Vercel and redeploy |
| Planning fails with "ANTHROPIC_API_KEY is not configured" | Key missing server-side | Add `ANTHROPIC_API_KEY` in Vercel and redeploy |
| Confirmation email link opens `localhost` and fails | Supabase Site URL still at its `http://localhost:3000` default | Set Site URL to the deployed origin, or disable email confirmation |
| Sign-in rejects a just-created account | Account created while confirmation was on, then never confirmed | Delete the user under Authentication → Users and sign up again with confirmation off |
