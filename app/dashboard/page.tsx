import Link from 'next/link';
import { createClient } from '@/lib/db/server';
import { AppShell } from '@/components/ui/app-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Goal, Task } from '@/types/domain';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);

  // Single round of parallel queries to keep the Today screen fast.
  const [goalsRes, dueTodayRes, overdueRes] = await Promise.all([
    supabase
      .from('goals')
      .select('*')
      .in('status', ['active', 'awaiting_approval', 'planning', 'draft'])
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('tasks')
      .select('*')
      .eq('due_date', today)
      .not('status', 'in', '("done","cancelled")')
      .order('priority', { ascending: false })
      .limit(20),
    supabase
      .from('tasks')
      .select('*')
      .lt('due_date', today)
      .not('status', 'in', '("done","cancelled")')
      .order('due_date', { ascending: true })
      .limit(20),
  ]);

  const goals = (goalsRes.data ?? []) as Goal[];
  const dueToday = (dueTodayRes.data ?? []) as Task[];
  const overdue = (overdueRes.data ?? []) as Task[];

  return (
    <AppShell email={user?.email}>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Today</h1>
        <Link
          href="/goals/new"
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          New goal
        </Link>
      </div>

      {overdue.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-red-400">
            Overdue ({overdue.length})
          </h2>
          <TaskList tasks={overdue} highlightOverdue />
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
          Due today ({dueToday.length})
        </h2>
        {dueToday.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing due today.</p>
        ) : (
          <TaskList tasks={dueToday} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
          Goals in motion
        </h2>
        {goals.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No goals yet.{' '}
            <Link href="/goals/new" className="text-indigo-400 hover:underline">
              Create your first goal
            </Link>{' '}
            to get started.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-800 rounded border border-neutral-800">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Link
                  href={`/goals/${goal.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-900"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{goal.title}</p>
                    {goal.target_date && (
                      <p className="text-xs text-neutral-500">
                        Target: {goal.target_date}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={goal.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function TaskList({
  tasks,
  highlightOverdue = false,
}: {
  tasks: Task[];
  highlightOverdue?: boolean;
}) {
  return (
    <ul className="divide-y divide-neutral-800 rounded border border-neutral-800">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <Link
              href={`/goals/${task.goal_id}`}
              className="text-sm font-medium text-white hover:underline"
            >
              {task.title}
            </Link>
            {task.due_date && (
              <p
                className={`text-xs ${highlightOverdue ? 'text-red-400' : 'text-neutral-500'}`}
              >
                Due {task.due_date}
              </p>
            )}
          </div>
          <StatusBadge status={task.status} />
        </li>
      ))}
    </ul>
  );
}
