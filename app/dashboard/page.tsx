import Link from 'next/link';
import { createClient } from '@/lib/db/server';
import { AppShell } from '@/components/ui/app-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { TaskRow } from '@/components/tasks/task-row';
import { WeekBoard } from '@/components/tasks/week-board';
import { todayISO, weekDaysISO } from '@/lib/utils/dates';
import type { Goal, Task } from '@/types/domain';

// The Today screen is the top of the execution loop: plans are approved on
// the goal page, tasks get scheduled onto days, and this screen answers
// "what do I do today?" — today's scheduled/due tasks first, then anything
// that slipped, then the shape of the week.

type TaskWithGoal = Task & { goals: { title: string } | null };

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayISO();
  const weekDays = weekDaysISO(today);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  // Single round of parallel queries to keep the Today screen fast.
  const [todayRes, slippedRes, weekRes, unscheduledRes, goalsRes] =
    await Promise.all([
      // Today's plan: scheduled for today or hard-due today. Done tasks stay
      // visible so the day shows progress, not an emptying list.
      supabase
        .from('tasks')
        .select('*, goals(title)')
        .or(`scheduled_for.eq.${today},due_date.eq.${today}`)
        .neq('status', 'cancelled')
        .order('status', { ascending: true })
        .limit(30),
      // Slipped: scheduled or due before today and still not done.
      supabase
        .from('tasks')
        .select('*, goals(title)')
        .or(`scheduled_for.lt.${today},due_date.lt.${today}`)
        .not('status', 'in', '("done","cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(20),
      supabase
        .from('tasks')
        .select('*')
        .gte('scheduled_for', weekStart)
        .lte('scheduled_for', weekEnd)
        .neq('status', 'cancelled')
        .limit(100),
      // Backlog to pull from when planning the week: open tasks with no day.
      supabase
        .from('tasks')
        .select('*, goals(title)')
        .is('scheduled_for', null)
        .in('status', ['backlog', 'todo', 'in_progress', 'waiting'])
        .order('priority', { ascending: false })
        .limit(10),
      supabase
        .from('goals')
        .select('*')
        .in('status', ['active', 'awaiting_approval', 'planning', 'draft'])
        .order('updated_at', { ascending: false })
        .limit(10),
    ]);

  const todaysTasks = (todayRes.data ?? []) as TaskWithGoal[];
  // A task can be both due today and scheduled earlier; keep it in Today only.
  const todayIds = new Set(todaysTasks.map((t) => t.id));
  const slipped = ((slippedRes.data ?? []) as TaskWithGoal[]).filter(
    (t) => !todayIds.has(t.id)
  );
  const weekTasks = (weekRes.data ?? []) as Task[];
  const unscheduled = ((unscheduledRes.data ?? []) as TaskWithGoal[]).filter(
    (t) => !todayIds.has(t.id)
  );
  const goals = (goalsRes.data ?? []) as Goal[];

  const doneToday = todaysTasks.filter((t) => t.status === 'done').length;

  return (
    <AppShell email={user?.email}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Today</h1>
          {todaysTasks.length > 0 && (
            <p className="text-xs text-neutral-500">
              {doneToday} of {todaysTasks.length} done
            </p>
          )}
        </div>
        <Link
          href="/goals/new"
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          New goal
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
          Today&apos;s plan ({todaysTasks.length})
        </h2>
        {todaysTasks.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nothing scheduled for today. Pick tasks below and assign them a day.
          </p>
        ) : (
          <ul className="space-y-2">
            {todaysTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                weekDays={weekDays}
                today={today}
                goalTitle={task.goals?.title}
                showGoalLink
              />
            ))}
          </ul>
        )}
      </section>

      {slipped.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-red-400">
            Slipped ({slipped.length})
          </h2>
          <p className="mb-3 text-xs text-neutral-500">
            Scheduled or due before today and still open. Finish them or move
            them to a new day.
          </p>
          <ul className="space-y-2">
            {slipped.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                weekDays={weekDays}
                today={today}
                goalTitle={task.goals?.title}
                showGoalLink
              />
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
          This week
        </h2>
        <WeekBoard weekDays={weekDays} tasks={weekTasks} today={today} />
      </section>

      {unscheduled.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
            Not scheduled yet ({unscheduled.length})
          </h2>
          <p className="mb-3 text-xs text-neutral-500">
            Open tasks without a day. Assign each one to a day of this week to
            build your plan.
          </p>
          <ul className="space-y-2">
            {unscheduled.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                weekDays={weekDays}
                today={today}
                goalTitle={task.goals?.title}
                showGoalLink
              />
            ))}
          </ul>
        </section>
      )}

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
                    <p className="text-xs text-neutral-500">
                      {Math.round(goal.percent_complete)}% complete
                      {goal.target_date && ` · target ${goal.target_date}`}
                    </p>
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
