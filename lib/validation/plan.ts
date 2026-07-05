import { z } from 'zod';

// Zod schemas for Claude structured planning output.
//
// The same schema is used to build the Claude tool input_schema (via
// zod-to-JSON-schema conversion in lib/ai/claude.ts) and to validate the
// model response before staging. Keep it flat and stable (CLAUDE.md
// "Structured output requirements").

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date');

export const plannedTaskSchema = z.object({
  // Plan-local identifier so dependencies can reference tasks before they
  // have database ids. Must be unique across the whole plan.
  ref: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  action_type: z.string().max(100).optional(),
  due_date: isoDate.optional(),
  estimated_minutes: z.number().int().positive().max(60 * 40).optional(),
  depends_on_refs: z.array(z.string().min(1)).default([]),
});

export const plannedMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  success_criteria: z.string().max(2000).optional(),
  sequence_no: z.number().int().min(1),
  target_date: isoDate.optional(),
  tasks: z.array(plannedTaskSchema).min(1),
});

export const plannedRiskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  mitigation: z.string().max(2000).optional(),
});

export const planSchema = z.object({
  summary: z.string().max(2000).optional(),
  milestones: z.array(plannedMilestoneSchema).min(1),
  risks: z.array(plannedRiskSchema).default([]),
});

// Claude either returns a plan or asks clarification questions — never both.
export const planningResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('plan'),
    plan: planSchema,
  }),
  z.object({
    kind: z.literal('clarification'),
    questions: z.array(z.string().min(1)).min(1).max(8),
  }),
]);

export type PlannedTask = z.infer<typeof plannedTaskSchema>;
export type PlannedMilestone = z.infer<typeof plannedMilestoneSchema>;
export type PlannedRisk = z.infer<typeof plannedRiskSchema>;
export type Plan = z.infer<typeof planSchema>;
export type PlanningResponse = z.infer<typeof planningResponseSchema>;
