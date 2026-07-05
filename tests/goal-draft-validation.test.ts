import { describe, expect, it } from 'vitest';
import { goalIntakeResponseSchema } from '@/lib/validation/goal-draft';

const validDraft = {
  kind: 'draft',
  draft: {
    title: 'Run a half marathon',
    description: 'First-time distance runner training for an October race.',
    success_definition: 'Finish a half marathon under 2h30.',
    category: 'health',
    priority: 'high',
    start_date: '2026-07-06',
    target_date: '2026-10-04',
    estimated_effort_hours: 120,
  },
};

describe('goalIntakeResponseSchema', () => {
  it('accepts a valid goal draft response', () => {
    const result = goalIntakeResponseSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  it('applies the default priority when omitted', () => {
    const { priority: _priority, ...withoutPriority } = validDraft.draft;
    const result = goalIntakeResponseSchema.safeParse({
      kind: 'draft',
      draft: withoutPriority,
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.kind === 'draft') {
      expect(result.data.draft.priority).toBe('medium');
    }
  });

  it('accepts a clarification response', () => {
    const result = goalIntakeResponseSchema.safeParse({
      kind: 'clarification',
      questions: ['What does "better shape" mean to you?', 'Do you have a deadline?'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a draft with no title', () => {
    const bad = structuredClone(validDraft);
    bad.draft.title = '';
    const result = goalIntakeResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects malformed dates', () => {
    const bad = structuredClone(validDraft);
    // @ts-expect-error deliberately invalid
    bad.draft.target_date = '10/04/2026';
    const result = goalIntakeResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects a clarification with no questions', () => {
    const result = goalIntakeResponseSchema.safeParse({
      kind: 'clarification',
      questions: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown kinds', () => {
    const result = goalIntakeResponseSchema.safeParse({ kind: 'freeform', text: 'do stuff' });
    expect(result.success).toBe(false);
  });
});
