import { z } from 'zod';
import { isoDate } from '@/lib/validation/plan';

// Zod schema for Claude's "Goal clarification" structured output (CLAUDE.md
// "Claude workflow modes"). This is the goal-intake step, before any
// milestone/task planning happens: Claude turns a freeform goal description
// into the structured fields the `goals` table needs, or asks clarifying
// questions first. Same pattern as lib/validation/plan.ts — one schema
// drives both the Claude tool input_schema and response validation.

export const goalDraftSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  success_definition: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  start_date: isoDate.optional(),
  target_date: isoDate.optional(),
  estimated_effort_hours: z.number().positive().max(10000).optional(),
});

// Claude either returns a goal draft ready for review or asks clarification
// questions — never both.
export const goalIntakeResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('draft'),
    draft: goalDraftSchema,
  }),
  z.object({
    kind: z.literal('clarification'),
    questions: z.array(z.string().min(1)).min(1).max(8),
  }),
]);

export type GoalDraft = z.infer<typeof goalDraftSchema>;
export type GoalIntakeResponse = z.infer<typeof goalIntakeResponseSchema>;
