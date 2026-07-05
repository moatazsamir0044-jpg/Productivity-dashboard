import type { GoalDraft } from '@/lib/validation/goal-draft';

// Business-rule validation for AI-generated goal drafts (CLAUDE.md
// "Business-rule validation requirements": target dates must be
// chronological). Runs after Zod schema validation and before staging, and
// again before the draft is turned into a `goals` row.

export interface GoalDraftRuleResult {
  errors: string[];
  warnings: string[];
}

export function validateGoalDraftRules(draft: GoalDraft): GoalDraftRuleResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (draft.start_date && draft.target_date && draft.start_date > draft.target_date) {
    errors.push(
      `Target date (${draft.target_date}) is before the start date (${draft.start_date}).`
    );
  }

  return { errors, warnings };
}
