'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/db/server';

// Check-ins are the progress-logging primitive: a quick note against a goal
// (optionally a specific task), with a blocker flag and a next step. Daily
// and weekly reviews read from these.

const checkInSchema = z.object({
  note: z.string().trim().min(1, 'Write a short note about your progress.').max(2000),
  task_id: z.string().uuid().nullable(),
  blocker_flag: z.boolean(),
  next_step: z.string().trim().max(500).nullable(),
});

export interface CheckInState {
  error: string | null;
  saved: boolean;
}

export const initialCheckInState: CheckInState = { error: null, saved: false };

export async function createCheckIn(
  goalId: string,
  _prev: CheckInState,
  formData: FormData
): Promise<CheckInState> {
  const parsed = checkInSchema.safeParse({
    note: formData.get('note'),
    task_id: formData.get('task_id') || null,
    blocker_flag: formData.get('blocker_flag') === 'on',
    next_step: formData.get('next_step') || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, saved: false };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated.', saved: false };
  }

  const { error } = await supabase.from('check_ins').insert({
    goal_id: goalId,
    user_id: user.id,
    ...parsed.data,
  });
  if (error) {
    return { error: `Could not save check-in: ${error.message}`, saved: false };
  }

  revalidatePath(`/goals/${goalId}`);
  revalidatePath('/dashboard');
  return { error: null, saved: true };
}
