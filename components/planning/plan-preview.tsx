'use client';

import { useState, useTransition } from 'react';
import { approvePlan, rejectPlan } from '@/lib/domain/plan-actions';
import type { Plan } from '@/lib/validation/plan';

// Staging view: shows exactly what will be created before the user approves.
export function PlanPreview({
  conversationId,
  goalId,
  plan,
}: {
  conversationId: string;
  goalId: string;
  plan: Plan;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const taskCount = plan.milestones.reduce((n, m) => n + m.tasks.length, 0);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approvePlan(conversationId, goalId);
      if (result.error) setError(result.error);
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectPlan(conversationId, goalId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="rounded border border-amber-800 bg-amber-950/30 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-amber-300">
            Staged plan awaiting your approval
          </h2>
          <p className="text-xs text-neutral-400">
            Approving creates {plan.milestones.length} milestone
            {plan.milestones.length === 1 ? '' : 's'}, {taskCount} task
            {taskCount === 1 ? '' : 's'}
            {plan.risks.length > 0 &&
              `, and ${plan.risks.length} risk${plan.risks.length === 1 ? '' : 's'}`}
            . Rejecting discards it.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            disabled={isPending}
            className="rounded border border-neutral-600 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPending ? 'Working…' : 'Approve plan'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {plan.summary && (
        <p className="mb-4 text-sm text-neutral-300">{plan.summary}</p>
      )}

      <ol className="space-y-4">
        {[...plan.milestones]
          .sort((a, b) => a.sequence_no - b.sequence_no)
          .map((milestone) => (
            <li
              key={milestone.sequence_no}
              className="rounded border border-neutral-800 bg-neutral-950 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">
                  {milestone.sequence_no}. {milestone.title}
                </h3>
                {milestone.target_date && (
                  <span className="text-xs text-neutral-500">
                    Target {milestone.target_date}
                  </span>
                )}
              </div>
              {milestone.description && (
                <p className="mb-2 text-xs text-neutral-400">
                  {milestone.description}
                </p>
              )}
              {milestone.success_criteria && (
                <p className="mb-2 text-xs text-neutral-500">
                  Done when: {milestone.success_criteria}
                </p>
              )}
              <ul className="space-y-1">
                {milestone.tasks.map((task) => (
                  <li
                    key={task.ref}
                    className="flex items-center justify-between rounded bg-neutral-900 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-neutral-200">{task.title}</p>
                      <p className="text-xs text-neutral-500">
                        {task.priority} priority
                        {task.due_date && ` · due ${task.due_date}`}
                        {task.estimated_minutes != null &&
                          ` · ~${task.estimated_minutes} min`}
                        {task.depends_on_refs.length > 0 &&
                          ` · after ${task.depends_on_refs.join(', ')}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
      </ol>

      {plan.risks.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-white">Risks</h3>
          <ul className="space-y-1">
            {plan.risks.map((risk) => (
              <li
                key={risk.title}
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
        </div>
      )}
    </div>
  );
}
