'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/db/server';
import {
  computeMilestoneStatus,
  computePercentComplete,
} from '@/lib/domain/progress';
import { TASK_STATUSES, type MilestoneStatus, type TaskStatus } from '@/types/domain';

// Direct user edits to task execution state. These persist immediately
// without staging (CLAUDE.md "Approval Rules": minor edits made directly by
// the user may persist immediately if they do not originate from new AI
// planning output). RLS scopes every write to goals the user owns.

const taskStatusSchema = z.enum(TASK_STATUSES);
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date');

function revalidateTaskViews(goalId: string) {
  revalidatePath('/dashboard');
  revalidatePath('/goals');
  revalidatePath(`/goals/${goalId}`);
}

// Recompute milestone and goal rollups after a task status change, so the
// dashboard always reflects real completion state.
async function rollUpProgress(
  supabase: ReturnType<typeof createClient>,
  goalId: string,
  milestoneId: string | null
) {
  const { data: goalTasks } = await supabase
    .from('tasks')
    .select('status, milestone_id')
    .eq('goal_id', goalId);
  if (!goalTasks) return;

  await supabase
    .from('goals')
    .update({ percent_complete: computePercentComplete(goalTasks) })
    .eq('id', goalId);

  if (milestoneId) {
    const { data: milestone } = await supabase
      .from('milestones')
      .select('status')
      .eq('id', milestoneId)
      .single();
    if (!milestone) return;
    const milestoneTasks = goalTasks.filter((t) => t.milestone_id === milestoneId);
    await supabase
      .from('milestones')
      .update({
        percent_complete: computePercentComplete(milestoneTasks),
        status: computeMilestoneStatus(
          milestoneTasks,
          milestone.status as MilestoneStatus
        ),
      })
      .eq('id', milestoneId);
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<{ error: string | null }> {
  const parsed = taskStatusSchema.safeParse(status);
  if (!parsed.success) {
    return { error: `Invalid task status "${status}".` };
  }

  const supabase = createClient();
  const { data: task, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: parsed.data,
      percent_complete: parsed.data === 'done' ? 100 : 0,
    })
    .eq('id', taskId)
    .select('goal_id, milestone_id')
    .single();
  if (updateError || !task) {
    return { error: `Could not update task: ${updateError?.message ?? 'not found'}` };
  }

  await rollUpProgress(supabase, task.goal_id, task.milestone_id);
  revalidateTaskViews(task.goal_id);
  return { error: null };
}

export async function scheduleTask(
  taskId: string,
  scheduledFor: string | null
): Promise<{ error: string | null }> {
  if (scheduledFor !== null) {
    const parsed = isoDateSchema.safeParse(scheduledFor);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }
  }

  const supabase = createClient();
  const { data: task, error } = await supabase
    .from('tasks')
    .update({ scheduled_for: scheduledFor })
    .eq('id', taskId)
    .select('goal_id')
    .single();
  if (error || !task) {
    return { error: `Could not schedule task: ${error?.message ?? 'not found'}` };
  }

  revalidateTaskViews(task.goal_id);
  return { error: null };
}
