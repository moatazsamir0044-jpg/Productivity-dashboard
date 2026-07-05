'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateGoal, deleteGoal, type GoalFormState } from '@/lib/domain/goal-actions';
import type { Goal } from '@/types/domain';

const initialState: GoalFormState = { error: null };

const inputClass =
  'w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none';
const labelClass = 'mb-1 block text-sm text-neutral-300';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}

export function GoalEditForm({ goal }: { goal: Goal }) {
  const boundUpdate = updateGoal.bind(null, goal.id);
  const [state, formAction] = useFormState(boundUpdate, initialState);
  const boundDelete = deleteGoal.bind(null, goal.id);

  return (
    <details className="rounded border border-neutral-800">
      <summary className="cursor-pointer px-4 py-3 text-sm text-neutral-400 hover:bg-neutral-900">
        Edit goal fields manually
      </summary>
      <div className="border-t border-neutral-800 p-4">
        <form action={formAction} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="edit-title" className={labelClass}>
              Title *
            </label>
            <input
              id="edit-title"
              name="title"
              required
              maxLength={200}
              defaultValue={goal.title}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="edit-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="edit-description"
              name="description"
              rows={3}
              defaultValue={goal.description ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="edit-success" className={labelClass}>
              Success definition
            </label>
            <textarea
              id="edit-success"
              name="success_definition"
              rows={2}
              defaultValue={goal.success_definition ?? ''}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-category" className={labelClass}>
                Category
              </label>
              <input
                id="edit-category"
                name="category"
                maxLength={100}
                defaultValue={goal.category ?? ''}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="edit-priority" className={labelClass}>
                Priority
              </label>
              <select
                id="edit-priority"
                name="priority"
                defaultValue={goal.priority}
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
              <label htmlFor="edit-start" className={labelClass}>
                Start date
              </label>
              <input
                id="edit-start"
                name="start_date"
                type="date"
                defaultValue={goal.start_date ?? ''}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="edit-target" className={labelClass}>
                Target date
              </label>
              <input
                id="edit-target"
                name="target_date"
                type="date"
                defaultValue={goal.target_date ?? ''}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="edit-effort" className={labelClass}>
                Effort (hours)
              </label>
              <input
                id="edit-effort"
                name="estimated_effort_hours"
                type="number"
                min={1}
                step={1}
                defaultValue={goal.estimated_effort_hours ?? ''}
                className={inputClass}
              />
            </div>
          </div>

          {state.error && (
            <p className="rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">
              {state.error}
            </p>
          )}

          <div className="flex items-center justify-between">
            <SaveButton />
            <button
              formAction={boundDelete}
              formNoValidate
              className="text-sm text-red-400 hover:text-red-300"
              onClick={(e) => {
                if (!confirm('Delete this goal and everything under it?')) {
                  e.preventDefault();
                }
              }}
            >
              Delete goal
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
