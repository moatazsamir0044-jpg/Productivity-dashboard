import { describe, expect, it } from 'vitest';
import { validatePlanRules } from '@/lib/domain/plan-rules';
import type { Plan } from '@/lib/validation/plan';

const goal = { start_date: '2026-07-10', target_date: '2026-09-01' };

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    summary: undefined,
    milestones: [
      {
        title: 'Milestone A',
        description: undefined,
        success_criteria: undefined,
        sequence_no: 1,
        target_date: '2026-08-01',
        tasks: [
          {
            ref: 'a1',
            title: 'Task A1',
            description: undefined,
            priority: 'medium',
            action_type: undefined,
            due_date: '2026-07-20',
            estimated_minutes: 60,
            depends_on_refs: [],
          },
        ],
      },
      {
        title: 'Milestone B',
        description: undefined,
        success_criteria: undefined,
        sequence_no: 2,
        target_date: '2026-08-20',
        tasks: [
          {
            ref: 'b1',
            title: 'Task B1',
            description: undefined,
            priority: 'medium',
            action_type: undefined,
            due_date: undefined,
            estimated_minutes: undefined,
            depends_on_refs: ['a1'],
          },
        ],
      },
    ],
    risks: [],
    ...overrides,
  };
}

describe('validatePlanRules', () => {
  it('passes a well-formed plan', () => {
    const result = validatePlanRules(makePlan(), goal);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('flags non-chronological milestone dates', () => {
    const plan = makePlan();
    plan.milestones[1].target_date = '2026-07-15'; // before milestone A
    const result = validatePlanRules(plan, goal);
    expect(result.errors.some((e) => e.includes('dated before'))).toBe(true);
  });

  it('flags unresolved dependency refs', () => {
    const plan = makePlan();
    plan.milestones[1].tasks[0].depends_on_refs = ['missing-ref'];
    const result = validatePlanRules(plan, goal);
    expect(result.errors.some((e) => e.includes('unknown ref'))).toBe(true);
  });

  it('flags self-dependencies', () => {
    const plan = makePlan();
    plan.milestones[0].tasks[0].depends_on_refs = ['a1'];
    const result = validatePlanRules(plan, goal);
    expect(result.errors.some((e) => e.includes('depends on itself'))).toBe(true);
  });

  it('flags duplicate task refs', () => {
    const plan = makePlan();
    plan.milestones[1].tasks[0].ref = 'a1';
    const result = validatePlanRules(plan, goal);
    expect(result.errors.some((e) => e.includes('refs must be unique'))).toBe(true);
  });

  it('flags duplicate sequence numbers', () => {
    const plan = makePlan();
    plan.milestones[1].sequence_no = 1;
    const result = validatePlanRules(plan, goal);
    expect(result.errors.some((e) => e.includes('sequence numbers must be unique'))).toBe(true);
  });

  it('rejects tasks due before the goal start date', () => {
    const plan = makePlan();
    plan.milestones[0].tasks[0].due_date = '2026-07-01';
    const result = validatePlanRules(plan, goal);
    expect(result.errors.some((e) => e.includes('before the goal start date'))).toBe(true);
  });

  it('warns on duplicate milestone titles', () => {
    const plan = makePlan();
    plan.milestones[1].title = 'Milestone A';
    const result = validatePlanRules(plan, goal);
    expect(result.warnings.some((w) => w.includes('Duplicate milestone title'))).toBe(true);
  });

  it('warns when a milestone lands after the goal target date', () => {
    const plan = makePlan();
    plan.milestones[1].target_date = '2026-10-01';
    const result = validatePlanRules(plan, goal);
    expect(result.warnings.some((w) => w.includes('after the goal target date'))).toBe(true);
  });

  it('rejects an empty plan', () => {
    const result = validatePlanRules({ milestones: [], risks: [] } as unknown as Plan, goal);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
