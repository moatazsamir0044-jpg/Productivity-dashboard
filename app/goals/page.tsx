import Link from 'next/link';
import { createClient } from '@/lib/db/server';
import { AppShell } from '@/components/ui/app-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Goal } from '@/types/domain';

export default async function GoalsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('updated_at', { ascending: false });

  const goals = (data ?? []) as Goal[];

  return (
    <AppShell email={user?.email}>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">All goals</h1>
        <Link
          href="/goals/new"
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          New goal
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          Could not load goals: {error.message}
        </p>
      )}

      {goals.length === 0 && !error ? (
        <p className="text-sm text-neutral-500">
          No goals yet. Create one and let Claude break it into an execution plan.
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
                  <p className="text-xs text-neutral-500">
                    {goal.category && <span>{goal.category} · </span>}
                    Priority {goal.priority}
                    {goal.target_date && <span> · Target {goal.target_date}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500">
                    {Math.round(goal.percent_complete)}%
                  </span>
                  <StatusBadge status={goal.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
