'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  requestPlan,
  initialPlanRequestState,
  type PlanRequestState,
} from '@/lib/domain/plan-actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
    >
      {pending ? 'Claude is planning…' : 'Generate plan with Claude'}
    </button>
  );
}

// Prompt box that sends the goal to Claude for plan generation. The result
// is staged server-side; this panel only reports the outcome state.
export function PlanPanel({ goalId }: { goalId: string }) {
  const boundAction = requestPlan.bind(null, goalId);
  const [state, formAction] = useFormState<PlanRequestState, FormData>(
    boundAction,
    initialPlanRequestState
  );

  return (
    <div className="rounded border border-neutral-800 p-4">
      <h2 className="mb-1 text-sm font-semibold text-white">Claude planning</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Describe what you want planned. The generated plan is staged for your
        review — nothing is saved to the dashboard until you approve it.
      </p>

      <form action={formAction} className="space-y-3">
        <textarea
          name="prompt"
          rows={3}
          required
          maxLength={8000}
          placeholder="e.g. Break this goal into a realistic 6-week plan. I can spend ~5 hours per week."
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        />
        <SubmitButton />
      </form>

      {state.status === 'failed' && state.error && (
        <p className="mt-4 rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          Planning failed: {state.error}
        </p>
      )}

      {state.status === 'needs_clarification' && state.questions && (
        <div className="mt-4 rounded border border-amber-800 bg-amber-950 p-3 text-sm text-amber-200">
          <p className="mb-2 font-medium">
            Claude needs more detail before it can plan responsibly:
          </p>
          <ul className="list-inside list-disc space-y-1">
            {state.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-400">
            Answer these in a new prompt above (or edit the goal description).
          </p>
        </div>
      )}

      {state.status === 'staged' && (
        <div className="mt-4 rounded border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-200">
          <p>Plan staged. Review it below and approve to persist it.</p>
          {state.warnings && (
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-300">
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
