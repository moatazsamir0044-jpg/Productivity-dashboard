import { formatDayLabel } from '@/lib/utils/dates';
import type { Task } from '@/types/domain';

// Mon–Sun board of the current week: the "plan divided into days" view.
// Read-only by design — scheduling happens on the task rows; this shows the
// shape of the week at a glance, including what's already done.
export function WeekBoard({
  weekDays,
  tasks,
  today,
}: {
  weekDays: string[];
  tasks: Task[];
  today: string;
}) {
  const byDay = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.scheduled_for) continue;
    const list = byDay.get(task.scheduled_for) ?? [];
    list.push(task);
    byDay.set(task.scheduled_for, list);
  }

  return (
    <div className="grid grid-cols-7 gap-2 overflow-x-auto">
      {weekDays.map((day) => {
        const dayTasks = byDay.get(day) ?? [];
        const isToday = day === today;
        return (
          <div
            key={day}
            className={`min-h-24 rounded border p-2 ${
              isToday
                ? 'border-indigo-700 bg-indigo-950/30'
                : 'border-neutral-800 bg-neutral-950'
            }`}
          >
            <p
              className={`mb-2 text-xs font-medium ${
                isToday ? 'text-indigo-300' : 'text-neutral-400'
              }`}
            >
              {formatDayLabel(day)}
            </p>
            <ul className="space-y-1">
              {dayTasks.map((task) => (
                <li
                  key={task.id}
                  className={`rounded px-1.5 py-1 text-xs leading-tight ${
                    task.status === 'done'
                      ? 'bg-emerald-950/60 text-emerald-400 line-through'
                      : task.status === 'in_progress'
                        ? 'bg-sky-950 text-sky-300'
                        : 'bg-neutral-900 text-neutral-300'
                  }`}
                  title={task.title}
                >
                  {task.title}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
