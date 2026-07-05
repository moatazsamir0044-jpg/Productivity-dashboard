import { createClient } from '@/lib/db/server';
import { AppShell } from '@/components/ui/app-shell';
import { GoalIntakePanel } from '@/components/planning/goal-intake-panel';
import { GoalForm } from '@/components/goals/goal-form';

export default async function NewGoalPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell email={user?.email}>
      <h1 className="mb-2 text-xl font-semibold text-white">New goal</h1>
      <p className="mb-8 max-w-xl text-sm text-neutral-400">
        Claude is the planning engine for this dashboard. Describe the goal
        below and Claude will draft it for your review — or ask what it needs
        to know first. Nothing is created until you approve it.
      </p>

      <div className="max-w-xl">
        <GoalIntakePanel />
      </div>

      <details className="mt-10 max-w-xl rounded border border-neutral-800">
        <summary className="cursor-pointer px-4 py-3 text-sm text-neutral-400 hover:bg-neutral-900">
          Skip Claude — enter goal fields manually
        </summary>
        <div className="border-t border-neutral-800 p-4">
          <GoalForm />
        </div>
      </details>
    </AppShell>
  );
}
