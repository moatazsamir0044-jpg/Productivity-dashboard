'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { goalInputSchema } from '@/lib/validation/goal';

export interface GoalFormState {
  error: string | null;
}

function parseGoalForm(formData: FormData) {
  return goalInputSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    success_definition: formData.get('success_definition'),
    category: formData.get('category'),
    priority: formData.get('priority') ?? 'medium',
    target_date: formData.get('target_date'),
    start_date: formData.get('start_date'),
    estimated_effort_hours: formData.get('estimated_effort_hours') ?? '',
  });
}

export async function createGoal(
  _prev: GoalFormState,
  formData: FormData
): Promise<GoalFormState> {
  const parsed = parseGoalForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated.' };
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({ ...parsed.data, user_id: user.id, status: 'draft' })
    .select('id')
    .single();

  if (error) {
    return { error: `Could not create goal: ${error.message}` };
  }

  revalidatePath('/goals');
  redirect(`/goals/${data.id}`);
}

export async function updateGoal(
  goalId: string,
  _prev: GoalFormState,
  formData: FormData
): Promise<GoalFormState> {
  const parsed = parseGoalForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('goals')
    .update(parsed.data)
    .eq('id', goalId);

  if (error) {
    return { error: `Could not update goal: ${error.message}` };
  }

  revalidatePath(`/goals/${goalId}`);
  revalidatePath('/goals');
  return { error: null };
}

export async function deleteGoal(goalId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('goals').delete().eq('id', goalId);
  if (error) {
    throw new Error(`Could not delete goal: ${error.message}`);
  }
  revalidatePath('/goals');
  redirect('/goals');
}

export async function updateGoalStatus(
  goalId: string,
  status: 'active' | 'paused' | 'completed' | 'archived'
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('goals')
    .update({ status })
    .eq('id', goalId);
  if (error) {
    throw new Error(`Could not update goal status: ${error.message}`);
  }
  revalidatePath(`/goals/${goalId}`);
  revalidatePath('/goals');
  revalidatePath('/dashboard');
}
