import type { GoalStatus, MilestoneStatus, TaskStatus } from '@/types/domain';

type AnyStatus = GoalStatus | MilestoneStatus | TaskStatus;

const STATUS_STYLES: Record<AnyStatus, string> = {
  // goal
  draft: 'bg-neutral-800 text-neutral-300',
  planning: 'bg-sky-950 text-sky-300',
  awaiting_approval: 'bg-amber-950 text-amber-300',
  active: 'bg-emerald-950 text-emerald-300',
  paused: 'bg-neutral-800 text-neutral-400',
  completed: 'bg-emerald-950 text-emerald-300',
  archived: 'bg-neutral-800 text-neutral-500',
  // milestone
  not_started: 'bg-neutral-800 text-neutral-300',
  in_progress: 'bg-sky-950 text-sky-300',
  blocked: 'bg-red-950 text-red-300',
  // task
  backlog: 'bg-neutral-800 text-neutral-400',
  todo: 'bg-neutral-800 text-neutral-300',
  waiting: 'bg-amber-950 text-amber-300',
  done: 'bg-emerald-950 text-emerald-300',
  cancelled: 'bg-neutral-800 text-neutral-500',
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
