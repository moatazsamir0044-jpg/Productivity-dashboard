import type { MilestoneStatus, Task, TaskStatus } from '@/types/domain';

// Pure progress-rollup logic: task statuses drive milestone and goal
// percent_complete. Kept free of database access so it is directly testable
// (CLAUDE.md "Testing Priorities": task status updates, review calculations).
//
// Rules:
// - Cancelled tasks are excluded from the denominator entirely.
// - percent = done / countable * 100 (0 when there are no countable tasks).
// - A milestone is completed when every countable task is done, not_started
//   when nothing has been touched, in_progress otherwise. A manually set
//   'blocked' status is preserved until the milestone actually completes,
//   so a routine status change never silently clears a blocker.

type StatusLike = Pick<Task, 'status'>;

const STARTED_STATUSES: TaskStatus[] = ['in_progress', 'waiting', 'done'];

export function computePercentComplete(tasks: StatusLike[]): number {
  const countable = tasks.filter((t) => t.status !== 'cancelled');
  if (countable.length === 0) return 0;
  const done = countable.filter((t) => t.status === 'done').length;
  return Math.round((done / countable.length) * 10000) / 100;
}

export function computeMilestoneStatus(
  tasks: StatusLike[],
  current: MilestoneStatus
): MilestoneStatus {
  const countable = tasks.filter((t) => t.status !== 'cancelled');
  if (countable.length > 0 && countable.every((t) => t.status === 'done')) {
    return 'completed';
  }
  if (current === 'blocked') {
    return 'blocked';
  }
  if (countable.some((t) => STARTED_STATUSES.includes(t.status))) {
    return 'in_progress';
  }
  return 'not_started';
}
