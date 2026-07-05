import { describe, expect, it } from 'vitest';
import { validateGoalDraftRules } from '@/lib/domain/goal-draft-rules';
import type { GoalDraft } from '@/lib/validation/goal-draft';

function makeDraft(overrides: Partial<GoalDraft> = {}): GoalDraft {
  return {
    title: 'Run a half marathon',
    priority: 'medium',
    ...overrides,
  };
}

describe('validateGoalDraftRules', () => {
  it('passes a draft with no dates', () => {
    const result = validateGoalDraftRules(makeDraft());
    expect(result.errors).toHaveLength(0);
  });

  it('passes a draft with a chronological start and target date', () => {
    const result = validateGoalDraftRules(
      makeDraft({ start_date: '2026-07-06', target_date: '2026-10-04' })
    );
    expect(result.errors).toHaveLength(0);
  });

  it('flags a target date before the start date', () => {
    const result = validateGoalDraftRules(
      makeDraft({ start_date: '2026-10-04', target_date: '2026-07-06' })
    );
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
