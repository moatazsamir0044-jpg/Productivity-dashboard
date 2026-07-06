import { describe, expect, it } from 'vitest';
import {
  computeMilestoneStatus,
  computePercentComplete,
} from '@/lib/domain/progress';
import type { TaskStatus } from '@/types/domain';

const tasks = (...statuses: TaskStatus[]) => statuses.map((status) => ({ status }));

describe('computePercentComplete', () => {
  it('returns 0 for no tasks', () => {
    expect(computePercentComplete([])).toBe(0);
  });

  it('computes done over countable tasks', () => {
    expect(computePercentComplete(tasks('done', 'todo', 'in_progress', 'done'))).toBe(50);
  });

  it('excludes cancelled tasks from the denominator', () => {
    expect(computePercentComplete(tasks('done', 'cancelled'))).toBe(100);
    expect(computePercentComplete(tasks('todo', 'cancelled'))).toBe(0);
  });

  it('returns 0 when every task is cancelled', () => {
    expect(computePercentComplete(tasks('cancelled', 'cancelled'))).toBe(0);
  });

  it('rounds to two decimals', () => {
    expect(computePercentComplete(tasks('done', 'todo', 'todo'))).toBe(33.33);
  });
});

describe('computeMilestoneStatus', () => {
  it('is not_started when nothing has been touched', () => {
    expect(computeMilestoneStatus(tasks('todo', 'backlog'), 'not_started')).toBe(
      'not_started'
    );
  });

  it('is in_progress once any task has started', () => {
    expect(computeMilestoneStatus(tasks('in_progress', 'todo'), 'not_started')).toBe(
      'in_progress'
    );
    expect(computeMilestoneStatus(tasks('done', 'todo'), 'not_started')).toBe(
      'in_progress'
    );
  });

  it('is completed when every countable task is done', () => {
    expect(computeMilestoneStatus(tasks('done', 'done', 'cancelled'), 'in_progress')).toBe(
      'completed'
    );
  });

  it('never completes on cancelled tasks alone', () => {
    expect(computeMilestoneStatus(tasks('cancelled'), 'in_progress')).not.toBe(
      'completed'
    );
  });

  it('preserves a manual blocked status until actually complete', () => {
    expect(computeMilestoneStatus(tasks('done', 'todo'), 'blocked')).toBe('blocked');
    expect(computeMilestoneStatus(tasks('done', 'done'), 'blocked')).toBe('completed');
  });

  it('reverts to not_started when a done task is reopened', () => {
    expect(computeMilestoneStatus(tasks('todo', 'todo'), 'completed')).toBe(
      'not_started'
    );
  });
});
