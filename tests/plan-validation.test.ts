import { describe, expect, it } from 'vitest';
import { planningResponseSchema } from '@/lib/validation/plan';

const validPlan = {
  kind: 'plan',
  plan: {
    summary: 'Two-milestone plan',
    milestones: [
      {
        title: 'Foundation',
        sequence_no: 1,
        target_date: '2026-08-01',
        tasks: [
          {
            ref: 'm1-t1',
            title: 'Set up environment',
            priority: 'high',
            estimated_minutes: 60,
            depends_on_refs: [],
          },
          {
            ref: 'm1-t2',
            title: 'Draft outline',
            depends_on_refs: ['m1-t1'],
          },
        ],
      },
    ],
    risks: [],
  },
};

describe('planningResponseSchema', () => {
  it('accepts a valid plan response', () => {
    const result = planningResponseSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
    if (result.success && result.data.kind === 'plan') {
      // Defaults are applied during parsing.
      expect(result.data.plan.milestones[0].tasks[1].priority).toBe('medium');
    }
  });

  it('accepts a clarification response', () => {
    const result = planningResponseSchema.safeParse({
      kind: 'clarification',
      questions: ['What is the deadline?', 'How many hours per week?'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty plan (no milestones)', () => {
    const result = planningResponseSchema.safeParse({
      kind: 'plan',
      plan: { milestones: [], risks: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a milestone with no tasks', () => {
    const result = planningResponseSchema.safeParse({
      kind: 'plan',
      plan: {
        milestones: [{ title: 'Empty', sequence_no: 1, tasks: [] }],
        risks: [],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed dates', () => {
    const bad = structuredClone(validPlan);
    bad.plan.milestones[0].tasks[0] = {
      ...bad.plan.milestones[0].tasks[0],
      // @ts-expect-error deliberately invalid
      due_date: '01/08/2026',
    };
    const result = planningResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects a clarification with no questions', () => {
    const result = planningResponseSchema.safeParse({
      kind: 'clarification',
      questions: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown kinds', () => {
    const result = planningResponseSchema.safeParse({ kind: 'freeform', text: 'do stuff' });
    expect(result.success).toBe(false);
  });
});
