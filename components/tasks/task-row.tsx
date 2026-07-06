'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { scheduleTask, updateTaskStatus } from '@/lib/domain/task-actions';
import { formatDayLabel } from '@/lib/utils/dates';
import { TASK_STATUSES, type Task, type TaskStatus } from '@/types/domain';

// The core execution control: every task list in the app renders these rows.
// One click toggles done; the selects change status or move the task to a
// day of the current week (tasks.scheduled_for) without leaving the page.
export function TaskRow({
  task,
  weekDays,
  today,
  goalTitle,
  showGoalLink = false,
}: {
  task: Task;
  weekDays: string[];
  today: string;
  goalTitle?: string | null;
  showGoalLink?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDone = task.status === 'done';
  const isOverdue =
    !isDone &&
    task.status !== 'cancelled' &&
    ((task.due_date !== null && task.due_date < today) ||
      (task.scheduled_for !== null && task.scheduled_for < today));

  function run(action: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  // Keep an out-of-week scheduled date selectable so it isn't silently lost.
  const scheduleOptions =
    task.scheduled_for && !weekDays.includes(task.scheduled_for)
      ? [task.scheduled_for, ...weekDays]
      : weekDays;

  return (
    <li
      className={`rounded border border-neutral-800 bg-neutral-900 px-3 py-2 ${
        isPending ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isDone}
          disabled={isPending}
          onChange={() =>
            run(() => updateTaskStatus(task.id, isDone ? 'todo' : 'done'))
          }
          aria-label={isDone ? 'Mark as todo' : 'Mark as done'}
          className="h-4 w-4 shrink-0 accent-emerald-600"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm ${
              isDone ? 'text-neutral-500 line-through' : 'text-neutral-200'
            }`}
          >
            {task.title}
          </p>
          <p className={`text-xs ${isOverdue ? 'text-red-400' : 'text-neutral-500'}`}>
            {showGoalLink && goalTitle && (
              <>
                <Link
                  href={`/goals/${task.goal_id}`}
                  className="hover:text-neutral-300 hover:underline"
                >
                  {goalTitle}
                </Link>
                {' · '}
              </>
            )}
            {task.priority} priority
            {task.due_date && ` · due ${task.due_date}`}
            {task.estimated_minutes != null && ` · ~${task.estimated_minutes} min`}
            {isOverdue && ' · overdue'}
          </p>
        </div>
        <select
          value={task.status}
          disabled={isPending}
          onChange={(e) =>
            run(() => updateTaskStatus(task.id, e.target.value as TaskStatus))
          }
          aria-label="Task status"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-300"
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={task.scheduled_for ?? ''}
          disabled={isPending}
          onChange={(e) => run(() => scheduleTask(task.id, e.target.value || null))}
          aria-label="Scheduled day"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-300"
        >
          <option value="">No day</option>
          {scheduleOptions.map((day) => (
            <option key={day} value={day}>
              {formatDayLabel(day)}
              {day === today ? ' (today)' : ''}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </li>
  );
}
