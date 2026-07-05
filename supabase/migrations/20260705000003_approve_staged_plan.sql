-- Atomic approval of a staged AI plan.
--
-- The validated plan JSON lives on goal_conversations.ai_response_json while
-- the conversation is in 'staged' status. Approval must write milestones,
-- tasks, dependencies, and risks in one transaction, then activate the goal
-- and mark the conversation approved. A plpgsql function gives us that
-- atomicity through a single RPC call.
--
-- SECURITY INVOKER: the function runs as the calling user, so every insert
-- and update still passes RLS. It never widens access.
--
-- Expected ai_response_json shape (validated by Zod before staging):
-- {
--   "plan": {
--     "milestones": [
--       { "title", "description", "success_criteria", "sequence_no",
--         "target_date", "tasks": [
--           { "title", "description", "priority", "action_type", "due_date",
--             "estimated_minutes", "ref", "depends_on_refs": ["ref", ...] }
--         ] }
--     ],
--     "risks": [ { "title", "description", "severity", "mitigation" } ]
--   }
-- }
-- "ref" is a plan-local task identifier used to resolve dependencies.

create or replace function approve_staged_plan(p_conversation_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_conv goal_conversations%rowtype;
  v_plan jsonb;
  v_milestone jsonb;
  v_task jsonb;
  v_risk jsonb;
  v_dep_ref text;
  v_milestone_id uuid;
  v_task_id uuid;
  v_task_ids_by_ref jsonb := '{}'::jsonb;
  v_pending_deps jsonb := '[]'::jsonb;
  v_dep jsonb;
  v_depends_on uuid;
  v_milestone_count integer := 0;
  v_task_count integer := 0;
  v_risk_count integer := 0;
begin
  select * into v_conv
  from goal_conversations
  where id = p_conversation_id
  for update;

  if not found then
    raise exception 'Conversation % not found or not accessible', p_conversation_id;
  end if;

  if v_conv.status <> 'staged' then
    raise exception 'Conversation % is in status %, expected staged', p_conversation_id, v_conv.status;
  end if;

  if v_conv.goal_id is null then
    raise exception 'Conversation % has no goal attached', p_conversation_id;
  end if;

  v_plan := v_conv.ai_response_json -> 'plan';

  if v_plan is null
     or jsonb_array_length(coalesce(v_plan -> 'milestones', '[]'::jsonb)) = 0 then
    raise exception 'Staged plan is empty; refusing to persist';
  end if;

  -- Milestones and their tasks.
  for v_milestone in select * from jsonb_array_elements(v_plan -> 'milestones')
  loop
    insert into milestones (goal_id, title, description, success_criteria, sequence_no, target_date)
    values (
      v_conv.goal_id,
      v_milestone ->> 'title',
      v_milestone ->> 'description',
      v_milestone ->> 'success_criteria',
      (v_milestone ->> 'sequence_no')::integer,
      nullif(v_milestone ->> 'target_date', '')::date
    )
    returning id into v_milestone_id;
    v_milestone_count := v_milestone_count + 1;

    for v_task in select * from jsonb_array_elements(coalesce(v_milestone -> 'tasks', '[]'::jsonb))
    loop
      insert into tasks (
        goal_id, milestone_id, title, description, priority, action_type,
        due_date, estimated_minutes, status, source
      )
      values (
        v_conv.goal_id,
        v_milestone_id,
        v_task ->> 'title',
        v_task ->> 'description',
        coalesce(nullif(v_task ->> 'priority', ''), 'medium')::priority_level,
        v_task ->> 'action_type',
        nullif(v_task ->> 'due_date', '')::date,
        nullif(v_task ->> 'estimated_minutes', '')::integer,
        'todo',
        case when v_conv.conversation_type = 'replan' then 'ai_replan' else 'ai_plan' end::task_source
      )
      returning id into v_task_id;
      v_task_count := v_task_count + 1;

      if v_task ? 'ref' then
        v_task_ids_by_ref := v_task_ids_by_ref || jsonb_build_object(v_task ->> 'ref', v_task_id::text);
      end if;

      for v_dep_ref in
        select value #>> '{}' from jsonb_array_elements(coalesce(v_task -> 'depends_on_refs', '[]'::jsonb))
      loop
        v_pending_deps := v_pending_deps || jsonb_build_array(
          jsonb_build_object('task_id', v_task_id::text, 'ref', v_dep_ref)
        );
      end loop;
    end loop;
  end loop;

  -- Dependencies: resolve refs collected above to real task ids.
  for v_dep in select * from jsonb_array_elements(v_pending_deps)
  loop
    v_depends_on := (v_task_ids_by_ref ->> (v_dep ->> 'ref'))::uuid;
    if v_depends_on is null then
      raise exception 'Dependency ref % does not resolve to a task in this plan', v_dep ->> 'ref';
    end if;
    if v_depends_on <> (v_dep ->> 'task_id')::uuid then
      insert into task_dependencies (task_id, depends_on_task_id)
      values ((v_dep ->> 'task_id')::uuid, v_depends_on)
      on conflict on constraint task_dependencies_unique do nothing;
    end if;
  end loop;

  -- Risks.
  for v_risk in select * from jsonb_array_elements(coalesce(v_plan -> 'risks', '[]'::jsonb))
  loop
    insert into risks (goal_id, title, description, severity, mitigation)
    values (
      v_conv.goal_id,
      v_risk ->> 'title',
      v_risk ->> 'description',
      coalesce(nullif(v_risk ->> 'severity', ''), 'medium')::risk_severity,
      v_risk ->> 'mitigation'
    );
    v_risk_count := v_risk_count + 1;
  end loop;

  update goals
  set status = 'active',
      start_date = coalesce(start_date, current_date)
  where id = v_conv.goal_id;

  update goal_conversations
  set status = 'approved', approved_at = now()
  where id = p_conversation_id;

  return jsonb_build_object(
    'milestones', v_milestone_count,
    'tasks', v_task_count,
    'risks', v_risk_count
  );
end;
$$;
