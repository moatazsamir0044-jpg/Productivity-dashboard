import type { Plan } from '@/lib/validation/plan';
import type { Goal } from '@/types/domain';

// Business-rule validation for AI-generated plans (CLAUDE.md
// "Business-rule validation requirements"). Runs after Zod schema
// validation and before staging.
//
// Errors block staging; warnings are surfaced to the user on the
// plan preview but do not block approval.

export interface PlanRuleResult {
  errors: string[];
  warnings: string[];
}

export function validatePlanRules(
  plan: Plan,
  goal: Pick<Goal, 'start_date' | 'target_date'>
): PlanRuleResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (plan.milestones.length === 0) {
    errors.push('Plan contains no milestones; empty plans must never be persisted.');
    return { errors, warnings };
  }

  // Unique task refs across the whole plan (dependency resolution relies on it).
  const refCounts = new Map<string, number>();
  for (const m of plan.milestones) {
    for (const t of m.tasks) {
      refCounts.set(t.ref, (refCounts.get(t.ref) ?? 0) + 1);
    }
  }
  for (const [ref, count] of refCounts) {
    if (count > 1) {
      errors.push(`Task ref "${ref}" is used ${count} times; refs must be unique.`);
    }
  }

  // Dependency references must resolve to actual tasks (and not self).
  for (const m of plan.milestones) {
    for (const t of m.tasks) {
      for (const dep of t.depends_on_refs) {
        if (!refCounts.has(dep)) {
          errors.push(`Task "${t.title}" depends on unknown ref "${dep}".`);
        } else if (dep === t.ref) {
          errors.push(`Task "${t.title}" depends on itself.`);
        }
      }
    }
  }

  // Milestone target dates must be chronological by sequence_no.
  const sorted = [...plan.milestones].sort((a, b) => a.sequence_no - b.sequence_no);
  let prevDate: string | null = null;
  let prevTitle = '';
  for (const m of sorted) {
    if (m.target_date && prevDate && m.target_date < prevDate) {
      errors.push(
        `Milestone "${m.title}" (target ${m.target_date}) is dated before preceding milestone "${prevTitle}" (${prevDate}).`
      );
    }
    if (m.target_date) {
      prevDate = m.target_date;
      prevTitle = m.title;
    }
  }

  // Sequence numbers must be unique.
  const seqCounts = new Map<number, number>();
  for (const m of plan.milestones) {
    seqCounts.set(m.sequence_no, (seqCounts.get(m.sequence_no) ?? 0) + 1);
  }
  for (const [seq, count] of seqCounts) {
    if (count > 1) {
      errors.push(`Milestone sequence_no ${seq} is used ${count} times; sequence numbers must be unique.`);
    }
  }

  // Dates must not fall outside the goal window.
  const goalStart = goal.start_date;
  const goalTarget = goal.target_date;
  for (const m of plan.milestones) {
    if (m.target_date && goalTarget && m.target_date > goalTarget) {
      warnings.push(`Milestone "${m.title}" is dated after the goal target date (${goalTarget}).`);
    }
    for (const t of m.tasks) {
      if (t.due_date && goalStart && t.due_date < goalStart) {
        errors.push(`Task "${t.title}" is due ${t.due_date}, before the goal start date (${goalStart}).`);
      }
      if (t.due_date && m.target_date && t.due_date > m.target_date) {
        warnings.push(`Task "${t.title}" is due after its milestone "${m.title}" target date.`);
      }
    }
  }

  // Duplicate titles are flagged as warnings.
  const milestoneTitles = new Map<string, number>();
  for (const m of plan.milestones) {
    const key = m.title.trim().toLowerCase();
    milestoneTitles.set(key, (milestoneTitles.get(key) ?? 0) + 1);
  }
  for (const [title, count] of milestoneTitles) {
    if (count > 1) {
      warnings.push(`Duplicate milestone title "${title}" appears ${count} times.`);
    }
  }
  for (const m of plan.milestones) {
    const taskTitles = new Map<string, number>();
    for (const t of m.tasks) {
      const key = t.title.trim().toLowerCase();
      taskTitles.set(key, (taskTitles.get(key) ?? 0) + 1);
    }
    for (const [title, count] of taskTitles) {
      if (count > 1) {
        warnings.push(`Duplicate task title "${title}" appears ${count} times in milestone "${m.title}".`);
      }
    }
  }

  return { errors, warnings };
}
