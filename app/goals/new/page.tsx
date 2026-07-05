import { createClient } from '@/lib/db/server';
import { AppShell } from '@/components/ui/app-shell';
import { GoalForm } from '@/components/goals/goal-form';

export default async function NewGoalPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell email={user?.email}>
      <h1 className="mb-2 text-xl font-semibold text-white">New goal</h1>
      <p className="mb-8 text-sm text-neutral-400">
        Describe the goal. Once created, you can ask Claude to break it into
        milestones and tasks — nothing is persisted until you approve the plan.
      </p>
      <GoalForm />
    </AppShell>
  );
}
