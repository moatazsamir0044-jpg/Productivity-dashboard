import { z } from 'zod';

// Input validation for goal CRUD server actions.

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .refine((v) => v == null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: 'Expected YYYY-MM-DD date',
  });

export const goalInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: optionalTrimmed(4000),
  success_definition: optionalTrimmed(2000),
  category: optionalTrimmed(100),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  target_date: optionalDate,
  start_date: optionalDate,
  estimated_effort_hours: z.coerce
    .number()
    .positive()
    .max(10000)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
});

export type GoalInput = z.infer<typeof goalInputSchema>;
