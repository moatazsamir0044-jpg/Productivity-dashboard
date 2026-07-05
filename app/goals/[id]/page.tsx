import { notFound } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { AppShell } from '@/components/ui/app-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { PlanPanel } from '@/components/planning/plan-panel';
import { PlanPreview } from '@/components/planning/plan-preview';
import { ConversationHistory } from '@/components/planning/conversation-history';
import { GoalEditForm } from '@/components/goals/goal-edit-form';
import { planSchema } from '@/lib/validation/plan';
import type { Goal, GoalConversation, Milestone, Risk, Task } from '@/types/domain';

export default async function GoalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: goalData } = await supabase
    .from('goals')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!goalData) {
    notFound();
  }
  const goal = goalData as Goal;

  const [milestonesRes, tasksRes, risksRes, stagedRes, failedRes, historyRes] =
    await Promise.all([
      supabase
        .from('milestones')
        .select('*')
        .eq('goal_id', goal.id)
        .order('sequence_no', { ascending: true }),
      supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goal.id)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('risks')
        .select('*')
        .eq('goal_id', goal.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('goal_conversations')
        .select('*')
        .eq('goal_id', goal.id)
        .eq('status', 'staged')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('goal_conversations')
        .select('*')
        .eq('goal_id', goal.id)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('goal_conversations')
        .select('*')
        .eq('goal_id', goal.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

  const milestones = (milestonesRes.data ?? []) as Milestone[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const risks = (risksRes.data ?? []) as Risk[];
  const staged = (stagedRes.data?.[0] ?? null) as GoalConversation | null;
  const lastFailed = (failedRes.data?.[0] ?? null) as GoalConversation | null;
  const conversationHistory = (historyRes.data ?? []) as GoalConversation[];

  // Parse the staged plan defensively; a stale or corrupted staging row must
  // not break the page.
  let stagedPlan = null;
  if (staged) {
    const payload = staged.ai_response_json as { plan?: unknown } | null;
    const parsed = planSchema.safeParse(payload?.plan);
    if (parsed.success) {
      stagedPlan = parsed.data;
    }
  }

  const tasksByMilestone = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const key = task.milestone_id;
    const list = tasksByMilestone.get(key) ?? [];
    list.push(task);
    tasksByMilestone.set(key, list);
  }

  const hasPlan = milestones.length > 0;

  return (
    <AppShell email={user?.email}>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">{goal.title}</h1>
        <StatusBadge status={goal.status} />
      </div>
      <p className="mb-6 text-xs text-neutral-500">
        Priority {goal.priority}
        {goal.category && ` · ${goal.category}`}
        {goal.start_date && ` · starts ${goal.start_date}`}
        {goal.target_date && ` · target ${goal.target_date}`}
        {` · ${Math.round(goal.percent_complete)}% complete`}
      </p>

      {goal.description && (
        <p className="mb-4 max-w-2xl text-sm text-neutral-300">{goal.description}</p>
      )}
      {goal.success_definition && (
        <p className="mb-6 max-w-2xl text-sm text-neutral-500">
          Success: {goal.success_definition}
        </p>
      )}

      <div className="space-y-6">
        {lastFailed && !staged && (
          <div className="rounded border border-red-800 bg-red-950 p-4 text-sm text-red-300">
            <p className="font-medium">Last planning attempt failed</p>
            <p className="mt-1 text-xs">{lastFailed.error_message}</p>
            <p className="mt-1 text-xs text-red-400">
              You can retry below; the failure is logged in planning history.
            </p>
          </div>
        )}

        {staged && stagedPlan ? (
          <PlanPreview
            conversationId={staged.id}
            goalId={goal.id}
            plan={stagedPlan}
          />
        ) : (
          <PlanPanel goalId={goal.id} />
        )}

        {staged && !stagedPlan && (
          <div className="rounded border border-red-800 bg-red-950 p-4 text-sm text-red-300">
            A staged plan exists but its payload is invalid. Regenerate the plan.
          </div>
        )}

        <ConversationHistory conversations={conversationHistory} />

        <GoalEditForm goal={goal} />

        {hasPlan && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
              Milestones
            </h2>
            <ol className="space-y-4">
              {milestones.map((milestone) => (
                <li
                  key={milestone.id}
                  className="rounded border border-neutral-800 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">
                      {milestone.sequence_no}. {milestone.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      {milestone.target_date && (
                        <span className="text-xs text-neutral-500">
                          Target {milestone.target_date}
                        </span>
                      )}
                      <StatusBadge status={milestone.status} />
                    </div>
                  </div>
                  {milestone.success_criteria && (
                    <p className="mb-2 text-xs text-neutral-500">
                      Done when: {milestone.success_criteria}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {(tasksByMilestone.get(milestone.id) ?? []).map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center justify-between rounded bg-neutral-900 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-neutral-200">{task.title}</p>
                          <p className="text-xs text-neutral-500">
                            {task.priority} priority
                            {task.due_date && ` · due ${task.due_date}`}
                            {task.estimated_minutes != null &&
                              ` · ~${task.estimated_minutes} min`}
                          </p>
                        </div>
                        <StatusBadge status={task.status} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        )}

        {risks.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
              Risks
            </h2>
            <ul className="space-y-1">
              {risks.map((risk) => (
                <li
                  key={risk.id}
                  className="rounded bg-neutral-900 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-neutral-200">
                    [{risk.severity}] {risk.title}
                  </span>
                  {risk.mitigation && (
                    <span className="text-neutral-400"> — {risk.mitigation}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
