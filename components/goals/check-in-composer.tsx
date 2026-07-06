'use client';

import { useRef, useState, useTransition } from 'react';
import {
  createCheckIn,
  initialCheckInState,
  type CheckInState,
} from '@/lib/domain/check-in-actions';
import type { Task } from '@/types/domain';

// Quick progress logging against a goal: note + optional task + blocker flag
// + next step. This feeds the daily/weekly review workflows.
export function CheckInComposer({
  goalId,
  tasks,
}: {
  goalId: string;
  tasks: Task[];
}) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<CheckInState>(initialCheckInState);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCheckIn(goalId, initialCheckInState, formData);
      setState(result);
      if (result.saved) formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded border border-neutral-800 p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-white">Log a check-in</h3>
      <textarea
        name="note"
        rows={2}
        required
        placeholder="What happened? e.g. Finished Day A — bench felt strong at 60kg."
        className="mb-2 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600"
      />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select
          name="task_id"
          defaultValue=""
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-300"
        >
          <option value="">Whole goal</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
        <input
          name="next_step"
          placeholder="Next step (optional)"
          className="min-w-48 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600"
        />
        <label className="flex items-center gap-1.5 text-xs text-neutral-400">
          <input type="checkbox" name="blocker_flag" className="accent-red-600" />
          Blocker
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save check-in'}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-400">{state.error}</p>}
      {state.saved && !state.error && (
        <p className="text-xs text-emerald-400">Check-in saved.</p>
      )}
    </form>
  );
}
