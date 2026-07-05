'use client';

import { useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  approveGoalDraft,
  rejectGoalDraft,
  type ApproveGoalDraftState,
} from '@/lib/domain/goal-intake-actions';
import type { GoalDraft } from '@/lib/validation/goal-draft';

const inputClass =
  'w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none';
const labelClass = 'mb-1 block text-sm text-neutral-300';

function ApproveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
    >
      {pending ? 'Creating…' : 'Approve & create goal'}
    </button>
  );
}

// Staging view for Claude's goal-intake draft: exactly what would be created,
// editable, and nothing is persisted until "Approve" is pressed.
export function GoalDraftPreview({
  conversationId,
  draft,
  warnings,
}: {
  conversationId: string;
  draft: GoalDraft;
  warnings: string[] | null;
}) {
  const boundApprove = approveGoalDraft.bind(null, conversationId);
  const initialState: ApproveGoalDraftState = { error: null };
  const [state, formAction] = useFormState(boundApprove, initialState);

  const [isRejecting, startTransition] = useTransition();
  const [rejectError, setRejectError] = useState<string | null>(null);

  function handleReject() {
    setRejectError(null);
    startTransition(async () => {
      const result = await rejectGoalDraft(conversationId);
      if (result.error) setRejectError(result.error);
    });
  }

  return (
    <div className="rounded border border-amber-800 bg-amber-950/30 p-4">
      <h2 className="mb-1 text-sm font-semibold text-amber-300">
        Claude drafted this goal — review before creating it
      </h2>
      <p className="mb-4 text-xs text-neutral-400">
        Nothing is saved yet. Edit anything below, then approve to create the
        goal, or reject and describe it differently.
      </p>

      {(state.error || rejectError) && (
        <p className="mb-4 rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {state.error ?? rejectError}
        </p>
      )}

      {warnings && (
        <ul className="mb-4 list-inside list-disc space-y-1 text-xs text-amber-300">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <form action={formAction} className="max-w-xl space-y-4">
        <div>
          <label htmlFor="draft-title" className={labelClass}>
            Title *
          </label>
          <input
            id="draft-title"
            name="title"
            required
            maxLength={200}
            defaultValue={draft.title}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="draft-description" className={labelClass}>
            Description
          </label>
          <textarea
            id="draft-description"
            name="description"
            rows={3}
            defaultValue={draft.description ?? ''}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="draft-success" className={labelClass}>
            Success definition
          </label>
          <textarea
            id="draft-success"
            name="success_definition"
            rows={2}
            defaultValue={draft.success_definition ?? ''}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="draft-category" className={labelClass}>
              Category
            </label>
            <input
              id="draft-category"
              name="category"
              maxLength={100}
              defaultValue={draft.category ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="draft-priority" className={labelClass}>
              Priority
            </label>
            <select
              id="draft-priority"
              name="priority"
              defaultValue={draft.priority}
              className={inputClass}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="draft-start" className={labelClass}>
              Start date
            </label>
            <input
              id="draft-start"
              name="start_date"
              type="date"
              defaultValue={draft.start_date ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="draft-target" className={labelClass}>
              Target date
            </label>
            <input
              id="draft-target"
              name="target_date"
              type="date"
              defaultValue={draft.target_date ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="draft-effort" className={labelClass}>
              Effort (hours)
            </label>
            <input
              id="draft-effort"
              name="estimated_effort_hours"
              type="number"
              min={1}
              step={1}
              defaultValue={draft.estimated_effort_hours ?? ''}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <ApproveButton />
          <button
            type="button"
            onClick={handleReject}
            disabled={isRejecting}
            className="text-sm text-neutral-400 hover:text-neutral-300 disabled:opacity-50"
          >
            {isRejecting ? 'Rejecting…' : 'Reject and start over'}
          </button>
        </div>
      </form>
    </div>
  );
}
