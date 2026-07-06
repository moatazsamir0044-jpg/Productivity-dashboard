# Architecture

Phase 1 implementation of the Claude-connected productivity dashboard. See
`CLAUDE.md` for the full product rules; this document describes what is
actually built and how the pieces fit together.

## Layers

```
Browser (React / Tailwind, desktop-first)
   │
   ▼
Next.js App Router (server components, server actions, route handlers)
   │            │
   │            ▼
   │        Claude API (structured outputs via forced tool use)
   ▼
Supabase (Postgres + Auth, RLS on every user-owned table)
```

- **Frontend**: server components fetch data directly through the RLS-scoped
  Supabase client; client components handle forms and approval interactions.
- **Backend orchestration**: server actions in `lib/domain/` and `lib/auth/`.
  All Claude calls, validation, and persistence happen server-side.
- **Database**: Supabase Postgres. Schema and policies live in
  `supabase/migrations/` and are the only way schema changes ship.
- **AI layer**: `lib/ai/claude.ts`. Claude never writes to the database;
  it returns schema-validated JSON that is staged for human approval.

## Key modules

| Path | Responsibility |
| --- | --- |
| `lib/db/server.ts` | Request-scoped Supabase server client (auth cookies) |
| `lib/db/middleware.ts` + `middleware.ts` | Session refresh and route protection |
| `lib/auth/actions.ts` | Sign in / sign up / sign out server actions |
| `lib/validation/plan.ts` | Zod schemas for Claude planning output (also generates the tool JSON schema) |
| `lib/validation/goal-draft.ts` | Zod schemas for Claude's goal-intake output (draft or clarification) |
| `lib/validation/goal.ts` | Zod schema for the manual goal-fields fallback form |
| `lib/domain/plan-rules.ts` | Business-rule validation on top of schema validation (plans) |
| `lib/domain/goal-draft-rules.ts` | Business-rule validation on top of schema validation (goal drafts) |
| `lib/domain/goal-intake-actions.ts` | Goal-intake conversation: request/approve/reject a Claude-drafted goal |
| `lib/domain/goal-actions.ts` | Goal CRUD server actions (manual create/update/delete, status changes) |
| `lib/domain/plan-actions.ts` | Plan generation, staging, approval, rejection |
| `lib/ai/claude.ts` | Claude API call, forced tool use, failure classification |
| `lib/ai/prompts.ts` | System prompts per Claude workflow mode (goal intake, planning) |
| `types/domain.ts` | Shared domain types mirroring the database enums |

## Goal intake workflow (implemented)

Claude is the front door of the app, not the `goals` table. `/goals/new`
leads with `GoalIntakePanel`: the user describes the goal in freeform text,
Claude runs in "Goal clarification" mode (`generateGoalDraft`) and either
asks questions or returns a structured draft. The draft is staged on a
`goal_conversations` row with `goal_id = null` (conversations can exist
before any goal does) and shown in `GoalDraftPreview` for review/edits.
Only on approval does `approveGoalDraft` insert the `goals` row and back-fill
`goal_conversations.goal_id`. A collapsed "Skip Claude — enter goal fields
manually" fallback (the original `GoalForm`) still exists for direct CRUD,
but it is not the primary path.

## Plan persistence workflow (implemented)

1. User creates a goal through the Claude goal-intake flow above (`goals`
   row, status `draft`), or manually via the fallback form.
2. User submits a planning prompt from the goal detail page, where the
   Claude planning conversation is the first thing shown — manual goal-field
   edits are a secondary, collapsed section below it.
3. `requestPlan` records a `goal_conversations` row (`pending`) — every AI
   interaction is auditable, including failures.
4. `generatePlan` calls Claude with `tool_choice` forcing a single
   `submit_planning_response` tool call. The tool's `input_schema` is derived
   from the same Zod schema used for validation, so the contract cannot drift.
5. Failures are classified (`refusal`, `truncated`, `malformed`, `api_error`),
   logged separately from validation errors, and stored on the conversation
   row with status `failed`. The goal returns to `draft`.
6. A `clarification` response stores questions (`needs_clarification`) and
   surfaces them to the user without staging anything.
7. A `plan` response passes Zod validation, then business rules
   (`lib/domain/plan-rules.ts`): chronological milestone dates, unique refs
   and sequence numbers, resolvable dependencies, no tasks before the goal
   start date, no empty plans. Rule errors fail the conversation; warnings
   are shown on the preview but do not block.
8. Valid plans are stored on the conversation row (`staged`) and the goal
   moves to `awaiting_approval`. **No production records exist yet.**
9. The staging view shows exactly what will be created. On approval, the
   `approve_staged_plan` Postgres function (SECURITY INVOKER, so RLS still
   applies) inserts milestones, tasks, dependencies, and risks atomically,
   activates the goal, and marks the conversation `approved`. On rejection,
   the conversation is marked `rejected` and the goal returns to `draft`.

## Security model

- Every user-owned table has RLS enabled; policies scope to `auth.uid()`
  directly or through goal ownership (`owns_goal` / `owns_task` helpers).
- The app uses only the anon/publishable key. No service-role key exists in
  the codebase; if one is ever needed it must stay server-side.
- `ANTHROPIC_API_KEY` is read server-side only (`lib/ai/claude.ts` runs in
  server actions).
- `profiles` rows are created by a `SECURITY DEFINER` trigger on
  `auth.users` insert — the only definer code in the schema.

## Conversation status state machine

```
pending ──► failed                （AI failure or business-rule errors）
pending ──► needs_clarification   （Claude asked questions）
pending ──► staged ──► approved   （user approved; production records written）
                 └───► rejected   （user rejected; nothing persisted）
```

Goal status follows: `draft → planning → awaiting_approval → active`, with
`paused / completed / archived` as manual transitions.

## Execution tracking (implemented — first Phase 2 slice)

The operating loop after a plan is approved:

1. Tasks get assigned to days of the week via `tasks.scheduled_for`
   (the "No day / Mon–Sun" select on any task row). Direct user edits like
   this persist immediately — no staging, per the approval rules.
2. The Today dashboard (`app/dashboard`) is day-driven: "Today's plan"
   (scheduled or due today, done items stay visible), "Slipped" (scheduled
   or due before today and still open), a Mon–Sun week board, and
   "Not scheduled yet" as the backlog to pull from when planning a week.
3. Task status changes (checkbox or status select in
   `components/tasks/task-row.tsx`) call `lib/domain/task-actions.ts`, which
   rolls progress up: task → milestone `percent_complete`/`status` → goal
   `percent_complete`. The pure rollup rules live in
   `lib/domain/progress.ts` (tested in `tests/progress.test.ts`); cancelled
   tasks never count, and a manually set `blocked` milestone status is
   preserved until the milestone actually completes.
4. Check-ins (`lib/domain/check-in-actions.ts`, composer on the goal page)
   log progress notes, blockers, and next steps against a goal or a specific
   task — the raw material for daily/weekly reviews.

Known limit: tasks are one-shot. A recurring weekly routine (e.g. the same
four workouts every week) is modelled as this week's scheduled tasks; a
recurrence/replan mechanism is future work.

## Deliberate Phase 1 limits

- No kanban board, timeline view, reviews, or notifications UI yet
  (remaining Phase 2 scope).
- No replanning engine yet (Phase 3); the schema already supports it
  (`conversation_type = 'replan'`, `task_source = 'ai_replan'`).
- The goal-intake conversation has no multi-turn memory: answering a
  clarification question starts a new `goal_conversations` row rather than
  continuing the same thread. Same limitation as the milestone/task planning
  conversation. A richer threaded conversation view is a Phase 2/3 concern.
