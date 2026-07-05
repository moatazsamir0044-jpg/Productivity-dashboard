'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  requestGoalDraft,
  initialGoalIntakeState,
  type GoalIntakeState,
} from '@/lib/domain/goal-intake-actions';
import { GoalDraftPreview } from '@/components/planning/goal-draft-preview';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
    >
      {pending ? 'Claude is thinking…' : 'Ask Claude'}
    </button>
  );
}

// The front door of the app: the user talks to Claude first. Claude either
// asks clarifying questions or drafts the goal for review — nothing is
// created in the dashboard until the draft is approved.
export function GoalIntakePanel() {
  const [state, formAction] = useFormState<GoalIntakeState, FormData>(
    requestGoalDraft,
    initialGoalIntakeState
  );

  if (state.status === 'staged' && state.conversationId && state.draft) {
    return (
      <GoalDraftPreview
        conversationId={state.conversationId}
        draft={state.draft}
        warnings={state.warnings}
      />
    );
  }

  return (
    <div className="rounded border border-neutral-800 p-4">
      <h2 className="mb-1 text-sm font-semibold text-white">Talk to Claude</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Describe the goal in your own words. Claude will ask clarifying
        questions or draft the goal for your review — nothing is created
        until you approve it.
      </p>

      <form action={formAction} className="space-y-3">
        <textarea
          name="prompt"
          rows={4}
          required
          maxLength={8000}
          placeholder="e.g. I want to run a half marathon in October. I've never run more than 5k and can train 4 days a week."
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        />
        <SubmitButton />
      </form>

      {state.status === 'failed' && state.error && (
        <p className="mt-4 rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      {state.status === 'needs_clarification' && state.questions && (
        <div className="mt-4 rounded border border-amber-800 bg-amber-950 p-3 text-sm text-amber-200">
          <p className="mb-2 font-medium">Claude needs more detail first:</p>
          <ul className="list-inside list-disc space-y-1">
            {state.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-400">
            Answer these in a new message above.
          </p>
        </div>
      )}
    </div>
  );
}
