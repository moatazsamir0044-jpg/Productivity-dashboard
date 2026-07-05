# CLAUDE.md

## Project Overview

This repository contains a Claude-connected productivity dashboard that converts natural-language goal discussions into structured execution plans and trackable work items.

The application is the primary operating dashboard for the project owner. It must support the full workflow from goal intake to planning, approval, execution tracking, check-ins, reviews, and replanning.

The system is designed around one central principle: Claude is the reasoning and planning layer, while the application database is the operational source of truth after validation and approval.

## Product Objective

Build a reliable dashboard where a user can:

- describe a goal in natural language;
- let Claude brainstorm, clarify, and break it into milestones and tasks;
- review the generated plan before any persistence occurs;
- approve the plan and push it into the dashboard automatically;
- track progress through statuses, due dates, check-ins, and reviews;
- request plan revisions when priorities, blockers, or deadlines change.

## Product Scope

### In scope

- Goal intake workflow.
- Claude planning workflow.
- Structured-output plan generation.
- Plan staging and approval.
- Goal, milestone, and task persistence.
- Dashboard views for execution tracking.
- Daily and weekly reviews.
- Replanning workflow.
- Basic notification system.
- Auditability of AI-generated and user-approved changes.

### Out of scope for initial production phase

- Team collaboration and shared workspaces.
- Public-facing pages.
- Autonomous write actions through MCP.
- Calendar sync, email sync, and third-party integrations unless explicitly added later.
- Mobile-native apps.

## High-Level Architecture

The product must follow a four-layer architecture:

- Frontend application layer.
- Backend orchestration layer.
- Database and auth layer.
- Claude integration layer.

### Frontend responsibilities

- Goal capture UI.
- Dashboard views.
- Plan preview and approval screens.
- Task and check-in interactions.
- Review center.

### Backend responsibilities

- Call Claude APIs.
- Enforce structured output usage.
- Validate all AI payloads.
- Enforce business rules.
- Persist approved records.
- Log failures and retries.

### Database responsibilities

- Store all approved goals, milestones, tasks, check-ins, risks, and notifications.
- Store raw conversation payloads separately from validated structured outputs.
- Enforce access control through row-level security.

### Claude responsibilities

- Ask clarifying questions when required.
- Convert large goals into realistic, actionable plans.
- Return schema-compliant outputs.
- Suggest revisions and next actions.
- Never function as the persistence layer.

## Core Product Rules

These rules are non-negotiable.

- Never write AI-generated plans directly into live production tables without validation.
- Never bypass user approval for initial plan creation.
- Never treat raw model text as structured data unless it passes validation.
- Never collapse goals, milestones, and tasks into one generic table.
- Never skip the staging layer for material AI-generated changes.
- Never introduce MCP write actions in the first implementation phase.
- Never store secrets in client-side code.
- Never bypass row-level security assumptions in application logic.

## Required Tech Stack

Use this stack unless explicitly instructed otherwise:

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- Supabase Auth.
- Supabase PostgreSQL.
- Zod for runtime validation.
- Claude API for structured outputs.
- Server-side API routes or server actions for orchestration.

If a dependency is introduced, it must have a clear purpose and should not duplicate capabilities already provided by the existing stack.

## Repository Structure

Target structure:

```
.
├── CLAUDE.md
├── docs/
│   ├── claude-productivity-dashboard-build-spec.md
│   ├── architecture.md
│   ├── prompts/
│   └── workflows/
├── app/
│   ├── (marketing if needed later)
│   ├── dashboard/
│   ├── goals/
│   ├── reviews/
│   ├── api/
│   └── layout.tsx
├── components/
│   ├── dashboard/
│   ├── goals/
│   ├── planning/
│   ├── reviews/
│   └── ui/
├── lib/
│   ├── ai/
│   ├── auth/
│   ├── db/
│   ├── validation/
│   ├── domain/
│   └── utils/
├── supabase/
│   ├── migrations/
│   ├── seed/
│   └── policies/
├── types/
├── public/
├── tests/
└── package.json
```

If the scaffold differs slightly because of framework defaults, preserve the same architectural separation.

## Primary Domain Model

The application must preserve this hierarchy:

- User
- Goal
- Milestone
- Task
- Task Dependency
- Check-in
- Risk
- Notification
- Goal Conversation

### Required entities

**profiles or users**
- id
- email
- display_name
- timezone
- created_at
- updated_at

**goals**
- id
- user_id
- title
- description
- success_definition
- category
- priority
- status
- target_date
- start_date
- percent_complete
- estimated_effort_hours
- created_at
- updated_at

**goal_conversations**
- id
- user_id
- goal_id (nullable)
- conversation_type
- raw_prompt
- ai_response_raw
- ai_response_json
- status
- created_at

**milestones**
- id
- goal_id
- title
- description
- success_criteria
- sequence_no
- target_date
- status
- percent_complete
- created_at
- updated_at

**tasks**
- id
- goal_id
- milestone_id (nullable)
- parent_task_id (nullable)
- title
- description
- priority
- action_type
- due_date
- status
- percent_complete
- estimated_minutes
- actual_minutes (nullable)
- scheduled_for (nullable)
- source
- created_at
- updated_at

**task_dependencies**
- id
- task_id
- depends_on_task_id
- dependency_type

**check_ins**
- id
- goal_id
- task_id (nullable)
- user_id
- note
- progress_delta
- blocker_flag
- next_step
- created_at

**risks**
- id
- goal_id
- title
- description
- severity
- mitigation
- created_at

**notifications**
- id
- user_id
- goal_id (nullable)
- task_id (nullable)
- type
- title
- body
- read_at (nullable)
- created_at

## AI Integration Rules

The dashboard must use structured outputs for all planning and replanning workflows.

### Structured output requirements

- Use schema-based outputs for initial plan generation.
- Use schema-based outputs for revision/replan operations.
- Validate model responses with Zod before any application logic relies on them.
- Reject or retry responses that are refused, truncated, malformed, or operationally invalid.
- Keep schemas stable and reuse them wherever possible.
- Avoid unnecessary schema nesting.
- Keep optional fields limited unless there is a clear product need.

### Claude workflow modes

Support these modes:

- Goal clarification.
- Initial plan generation.
- Replan / revision.
- Next-action recommendation.
- Progress summarization.
- Daily review support.
- Weekly review support.

### Planning behavior rules

- If the goal is underspecified, ask clarification questions instead of guessing.
- Break large goals into milestones first, then tasks.
- Prefer concrete, measurable tasks over generic advice.
- Keep tasks realistically scoped.
- Avoid overloading the first week with too many tasks.
- Include risks only when materially useful.
- Include dependencies only when meaningful.
- Optimize for execution, not motivational language.

## Plan Persistence Workflow

The correct workflow is mandatory and must not be skipped.

1. User creates or opens a goal draft.
2. User enters a natural-language goal.
3. Backend sends goal context to Claude.
4. Claude returns clarification questions or a structured plan.
5. Backend validates response against Zod schema.
6. Backend applies business-rule validation.
7. Valid result is stored in a staging state.
8. User reviews and approves the staged plan.
9. Only after approval are production records written to goals, milestones, tasks, dependencies, and risks.
10. Dashboard updates from persisted data.

### Business-rule validation requirements

- Target dates must be chronological.
- Task due dates must not precede milestone or goal start dates without explicit reason.
- Duplicate milestone titles should be flagged.
- Duplicate task titles within the same milestone should be flagged.
- Dependency references must resolve to actual tasks.
- Empty plans must never be persisted.

## Replanning Workflow

Replanning is a first-class feature and must be implemented as a controlled update flow.

Rules:

- Replanning must reference existing goal state, milestone state, task state, blockers, and overdue items.
- Replans must generate a structured revision payload rather than freeform advice.
- Replans that materially alter milestones or tasks must go through approval.
- Preserve revision history.
- Do not silently overwrite existing records.

## Approval Rules

Approval gates are critical because this application is meant to be the main dashboard.

- Initial plans require approval before persistence.
- Major replans require approval before persistence.
- Minor edits made directly by the user may persist immediately if they do not originate from new AI planning output.
- The staging interface must clearly show what will be created or changed.
- All approved changes should be attributable to a user action.

## Database and Security Rules

Use Supabase with row-level security on all user-owned tables.

### Security requirements

- All tables that contain user-specific data must enforce RLS.
- Policies must scope records to `auth.uid()` or equivalent user ownership patterns.
- Service-role access must remain server-side only.
- Client code must never expose privileged credentials.
- Sensitive operations must be executed in secure server contexts.
- Raw Claude responses should be stored only where operationally necessary.
- Audit fields must exist for critical records and actions.

### Migration rules

- All schema changes must be migration-based.
- Do not rely on undocumented manual changes in the Supabase dashboard.
- Every new table must include ownership and timestamp strategy.
- Every policy change must be reviewed for unintended broad access.

## UI and Product Experience Rules

The interface should be a desktop-first dashboard optimized for clarity, speed, and operational trust.

### Primary screens

- Home / Today dashboard.
- Goal creation flow.
- Goal detail page.
- Task execution views.
- Daily review center.
- Weekly review center.
- Conversation history / planning history.
- Settings.

### Required dashboard views

- Today focus.
- All goals.
- Goal detail.
- Kanban by task status.
- List view.
- Timeline / milestone view.
- Review center.

### UX rules

- Always show current goal status clearly.
- Always show due dates and overdue states clearly.
- Make the next action obvious.
- Use staging views for AI-generated changes.
- Favor operational clarity over decorative design.
- Avoid hiding critical state behind hover-only interactions.
- Design for real workload management, not a demo experience.

## Component Expectations

Expected component groups:

- Goal intake form.
- Claude planning panel.
- Plan preview / staging table.
- Milestone timeline.
- Task board.
- Task detail drawer or modal.
- Check-in composer.
- Review summary cards.
- Notification center.
- Empty states and loading states.

All states must be designed intentionally, including loading, error, empty, rejected, and retry states.

## State Model

### Goal status values

- draft
- planning
- awaiting_approval
- active
- paused
- completed
- archived

### Milestone status values

- not_started
- in_progress
- completed
- blocked

### Task status values

- backlog
- todo
- in_progress
- waiting
- done
- cancelled

If status values change, update the database enum strategy, shared TypeScript types, validation schemas, and UI badges consistently.

## Review System Requirements

The dashboard must support structured review workflows.

### Daily review

Should surface:

- overdue tasks;
- tasks due today;
- tasks started but stalled;
- suggested next actions;
- latest blockers;
- quick logging of progress.

### Weekly review

Should surface:

- goals progressed this week;
- tasks completed vs planned;
- milestones at risk;
- goals needing replanning;
- accumulated blockers;
- strategic next focus.

The review system is operational, not journal-style. Keep it concise, actionable, and decision-oriented.

## Coding Standards

### General rules

- Use TypeScript strictly.
- Prefer explicit domain types.
- Keep business logic out of presentation components where possible.
- Use server-side validation for all AI responses and external payloads.
- Keep components modular and readable.
- Use descriptive names.
- Avoid premature abstraction.
- Refactor only when duplication becomes structurally costly.

### API rules

- Keep endpoint responsibilities clear and narrow.
- Validate input and output at boundaries.
- Return actionable error messages for operational debugging.
- Log AI failures separately from ordinary validation errors.

### Data rules

- Keep raw AI payloads separate from validated payloads.
- Preserve traceability for approved plan generations and revisions.
- Avoid destructive updates without clear auditability.

## Testing Priorities

Minimum testing priorities:

- Validation of structured AI outputs.
- Goal creation flow.
- Approval and persistence flow.
- Replanning flow.
- Task status updates.
- RLS-sensitive data access paths.
- Review calculations.

If test coverage is partial early on, prioritize business-critical flows over visual edge cases.

## Error Handling Requirements

Handle these cases explicitly:

- Claude refusal.
- Claude token cutoff or truncation.
- Invalid structured output.
- Empty structured output.
- Invalid dependency graph.
- Database persistence failures.
- Unauthorized data access.
- Network or timeout failures.

The UI must never fail silently for AI workflows. The user should always understand whether a plan is pending, staged, approved, rejected, or failed.

## Performance Rules

- Reuse stable structured schemas where possible.
- Keep planning schemas simpler than necessary rather than more complex than needed.
- Minimize avoidable round trips on the Today screen.
- Optimize for a fast dashboard feel after authentication.
- Use loading states that match the dashboard layout.

## Commands

```
npm install        # install dependencies
npm run dev        # start the dev server (http://localhost:3000)
npm run lint       # ESLint
npm run test       # Vitest (validation + business-rule tests in tests/)
npm run build      # production build; includes lint + TypeScript checks
```

Build verification is `npm run test && npm run build`.

Supabase operations: schema changes are SQL files in `supabase/migrations/`
(timestamped filenames, applied in order). Apply them with the Supabase MCP
`apply_migration` tool, `supabase db push`, or the SQL editor. Environment
configuration lives in `.env.local` (see `.env.example`).

## Delivery Phases

Claude must build in phases and stop at the requested phase unless explicitly instructed to continue.

### Phase 1

- Project scaffold.
- Authentication.
- Database schema.
- Supabase migrations.
- Row-level security.
- Goal CRUD.
- Claude structured-output planning endpoint.
- Zod validation.
- Plan staging and approval flow.

### Phase 2

- Goal detail page.
- Task board.
- List and timeline views.
- Check-ins.
- Daily review.
- Weekly review.
- Notifications.

### Phase 3

- Replanning engine.
- Goal health scoring.
- Suggested next-action intelligence.
- Improved review insights.

### Phase 4

- MCP integration for controlled tool actions.
- Read/write tool boundaries.
- Additional integrations if explicitly approved.

### Phase Execution Rule

When asked to build, default to the smallest complete next unit of work. Do not attempt to implement all phases in one pass unless explicitly instructed.

The preferred execution model is:

1. analyze current repository state;
2. identify the active phase;
3. implement only the requested scope;
4. summarize what was built;
5. identify blockers or missing configuration;
6. stop and wait for confirmation before expanding scope.

## Documentation Rules

- Keep architecture-level decisions in `docs/`.
- Keep persistent project rules in this CLAUDE.md.
- When a major workflow changes, update both implementation and documentation.
- Do not let docs drift far from the real codebase.

## Prompting Rules for Claude Code Sessions

When operating inside this repo, Claude should:

- read CLAUDE.md first;
- inspect the build spec in docs/;
- inspect the current codebase before proposing changes;
- prefer precise, implementation-oriented outputs;
- propose phased work rather than uncontrolled expansion;
- surface assumptions explicitly;
- ask for missing secrets or configuration instead of fabricating them.

## Definition of Done

A feature or phase is done only when:

- the code compiles;
- the flow works end-to-end;
- migrations are present for schema changes;
- validation exists for AI outputs and external inputs;
- failure states are handled explicitly;
- user-facing states are clear;
- documentation is updated where necessary;
- the implementation respects the project workflow described in this file.

## Final Build Principle

This repository is for a production-minded operational dashboard, not a prototype toy. Favor correctness, safe workflows, structured data, and reviewable changes over cleverness, unnecessary abstraction, or premature automation.
