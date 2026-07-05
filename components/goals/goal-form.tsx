'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createGoal, type GoalFormState } from '@/lib/domain/goal-actions';

const initialState: GoalFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
    >
      {pending ? 'Creating…' : 'Create goal'}
    </button>
  );
}

const inputClass =
  'w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none';
const labelClass = 'mb-1 block text-sm text-neutral-300';

export function GoalForm() {
  const [state, formAction] = useFormState(createGoal, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label htmlFor="title" className={labelClass}>
          Title *
        </label>
        <input id="title" name="title" required maxLength={200} className={inputClass} />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className={inputClass}
          placeholder="What is this goal about? Context helps Claude plan better."
        />
      </div>

      <div>
        <label htmlFor="success_definition" className={labelClass}>
          What does success look like?
        </label>
        <textarea
          id="success_definition"
          name="success_definition"
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <input id="category" name="category" maxLength={100} className={inputClass} />
        </div>
        <div>
          <label htmlFor="priority" className={labelClass}>
            Priority
          </label>
          <select id="priority" name="priority" defaultValue="medium" className={inputClass}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="start_date" className={labelClass}>
            Start date
          </label>
          <input id="start_date" name="start_date" type="date" className={inputClass} />
        </div>
        <div>
          <label htmlFor="target_date" className={labelClass}>
            Target date
          </label>
          <input id="target_date" name="target_date" type="date" className={inputClass} />
        </div>
        <div>
          <label htmlFor="estimated_effort_hours" className={labelClass}>
            Effort (hours)
          </label>
          <input
            id="estimated_effort_hours"
            name="estimated_effort_hours"
            type="number"
            min={1}
            step={1}
            className={inputClass}
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
