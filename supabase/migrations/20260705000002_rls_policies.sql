-- Row-level security for all user-owned tables.
-- Every policy scopes access to auth.uid(), directly or through goal ownership.

-- Helper: does the current user own the given goal?
create or replace function owns_goal(p_goal_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1 from goals g where g.id = p_goal_id and g.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Inserts happen via the on_auth_user_created trigger (security definer);
-- no direct client insert policy is required.

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------

alter table goals enable row level security;

create policy "goals_select_own" on goals
  for select using (user_id = auth.uid());

create policy "goals_insert_own" on goals
  for insert with check (user_id = auth.uid());

create policy "goals_update_own" on goals
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "goals_delete_own" on goals
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- goal_conversations
-- ---------------------------------------------------------------------------

alter table goal_conversations enable row level security;

create policy "goal_conversations_select_own" on goal_conversations
  for select using (user_id = auth.uid());

create policy "goal_conversations_insert_own" on goal_conversations
  for insert with check (user_id = auth.uid());

create policy "goal_conversations_update_own" on goal_conversations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "goal_conversations_delete_own" on goal_conversations
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- milestones (owned through the parent goal)
-- ---------------------------------------------------------------------------

alter table milestones enable row level security;

create policy "milestones_select_own" on milestones
  for select using (owns_goal(goal_id));

create policy "milestones_insert_own" on milestones
  for insert with check (owns_goal(goal_id));

create policy "milestones_update_own" on milestones
  for update using (owns_goal(goal_id)) with check (owns_goal(goal_id));

create policy "milestones_delete_own" on milestones
  for delete using (owns_goal(goal_id));

-- ---------------------------------------------------------------------------
-- tasks (owned through the parent goal)
-- ---------------------------------------------------------------------------

alter table tasks enable row level security;

create policy "tasks_select_own" on tasks
  for select using (owns_goal(goal_id));

create policy "tasks_insert_own" on tasks
  for insert with check (owns_goal(goal_id));

create policy "tasks_update_own" on tasks
  for update using (owns_goal(goal_id)) with check (owns_goal(goal_id));

create policy "tasks_delete_own" on tasks
  for delete using (owns_goal(goal_id));

-- ---------------------------------------------------------------------------
-- task_dependencies (owned through both tasks' goals)
-- ---------------------------------------------------------------------------

alter table task_dependencies enable row level security;

create or replace function owns_task(p_task_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from tasks t
    join goals g on g.id = t.goal_id
    where t.id = p_task_id and g.user_id = auth.uid()
  );
$$;

create policy "task_dependencies_select_own" on task_dependencies
  for select using (owns_task(task_id));

create policy "task_dependencies_insert_own" on task_dependencies
  for insert with check (owns_task(task_id) and owns_task(depends_on_task_id));

create policy "task_dependencies_delete_own" on task_dependencies
  for delete using (owns_task(task_id));

-- ---------------------------------------------------------------------------
-- check_ins
-- ---------------------------------------------------------------------------

alter table check_ins enable row level security;

create policy "check_ins_select_own" on check_ins
  for select using (user_id = auth.uid());

create policy "check_ins_insert_own" on check_ins
  for insert with check (user_id = auth.uid() and owns_goal(goal_id));

create policy "check_ins_delete_own" on check_ins
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- risks (owned through the parent goal)
-- ---------------------------------------------------------------------------

alter table risks enable row level security;

create policy "risks_select_own" on risks
  for select using (owns_goal(goal_id));

create policy "risks_insert_own" on risks
  for insert with check (owns_goal(goal_id));

create policy "risks_update_own" on risks
  for update using (owns_goal(goal_id)) with check (owns_goal(goal_id));

create policy "risks_delete_own" on risks
  for delete using (owns_goal(goal_id));

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

alter table notifications enable row level security;

create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());

create policy "notifications_insert_own" on notifications
  for insert with check (user_id = auth.uid());

create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notifications_delete_own" on notifications
  for delete using (user_id = auth.uid());
