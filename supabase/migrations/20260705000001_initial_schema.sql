-- Initial schema for the Claude-connected productivity dashboard.
-- Creates enums, core tables, ownership columns, timestamps, and triggers.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type goal_status as enum (
  'draft', 'planning', 'awaiting_approval', 'active', 'paused', 'completed', 'archived'
);

create type milestone_status as enum (
  'not_started', 'in_progress', 'completed', 'blocked'
);

create type task_status as enum (
  'backlog', 'todo', 'in_progress', 'waiting', 'done', 'cancelled'
);

create type priority_level as enum ('low', 'medium', 'high');

create type conversation_type as enum (
  'clarification', 'initial_plan', 'replan', 'next_action',
  'progress_summary', 'daily_review', 'weekly_review'
);

create type conversation_status as enum (
  'pending', 'needs_clarification', 'staged', 'approved', 'rejected', 'failed'
);

create type task_source as enum ('ai_plan', 'ai_replan', 'manual');

create type dependency_type as enum ('blocks', 'informs');

create type risk_severity as enum ('low', 'medium', 'high');

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row when a new auth user is created.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text,
  success_definition text,
  category text,
  priority priority_level not null default 'medium',
  status goal_status not null default 'draft',
  target_date date,
  start_date date,
  percent_complete numeric(5, 2) not null default 0 check (percent_complete >= 0 and percent_complete <= 100),
  estimated_effort_hours numeric(8, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on goals (user_id);
create index goals_status_idx on goals (user_id, status);

create trigger goals_set_updated_at
  before update on goals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- goal_conversations (raw AI payloads + validated staging payloads)
-- ---------------------------------------------------------------------------

create table goal_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  goal_id uuid references goals (id) on delete cascade,
  conversation_type conversation_type not null,
  raw_prompt text not null,
  ai_response_raw text,
  ai_response_json jsonb,
  status conversation_status not null default 'pending',
  error_message text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index goal_conversations_user_id_idx on goal_conversations (user_id);
create index goal_conversations_goal_id_idx on goal_conversations (goal_id);

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------

create table milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals (id) on delete cascade,
  title text not null,
  description text,
  success_criteria text,
  sequence_no integer not null,
  target_date date,
  status milestone_status not null default 'not_started',
  percent_complete numeric(5, 2) not null default 0 check (percent_complete >= 0 and percent_complete <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index milestones_goal_id_idx on milestones (goal_id);

create trigger milestones_set_updated_at
  before update on milestones
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table tasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals (id) on delete cascade,
  milestone_id uuid references milestones (id) on delete set null,
  parent_task_id uuid references tasks (id) on delete set null,
  title text not null,
  description text,
  priority priority_level not null default 'medium',
  action_type text,
  due_date date,
  status task_status not null default 'todo',
  percent_complete numeric(5, 2) not null default 0 check (percent_complete >= 0 and percent_complete <= 100),
  estimated_minutes integer,
  actual_minutes integer,
  scheduled_for date,
  source task_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_goal_id_idx on tasks (goal_id);
create index tasks_milestone_id_idx on tasks (milestone_id);
create index tasks_status_idx on tasks (goal_id, status);

create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- task_dependencies
-- ---------------------------------------------------------------------------

create table task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  depends_on_task_id uuid not null references tasks (id) on delete cascade,
  dependency_type dependency_type not null default 'blocks',
  constraint task_dependencies_no_self check (task_id <> depends_on_task_id),
  constraint task_dependencies_unique unique (task_id, depends_on_task_id)
);

create index task_dependencies_task_id_idx on task_dependencies (task_id);

-- ---------------------------------------------------------------------------
-- check_ins
-- ---------------------------------------------------------------------------

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals (id) on delete cascade,
  task_id uuid references tasks (id) on delete set null,
  user_id uuid not null references profiles (id) on delete cascade,
  note text not null,
  progress_delta numeric(5, 2),
  blocker_flag boolean not null default false,
  next_step text,
  created_at timestamptz not null default now()
);

create index check_ins_goal_id_idx on check_ins (goal_id);
create index check_ins_user_id_idx on check_ins (user_id);

-- ---------------------------------------------------------------------------
-- risks
-- ---------------------------------------------------------------------------

create table risks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals (id) on delete cascade,
  title text not null,
  description text,
  severity risk_severity not null default 'medium',
  mitigation text,
  created_at timestamptz not null default now()
);

create index risks_goal_id_idx on risks (goal_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  goal_id uuid references goals (id) on delete cascade,
  task_id uuid references tasks (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on notifications (user_id, read_at);
