'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generatePlan } from '@/lib/ai/claude';
import { validatePlanRules } from '@/lib/domain/plan-rules';
import { createClient } from '@/lib/db/server';
import { planSchema } from '@/lib/validation/plan';

// Plan generation, staging, and approval. This is the workflow described in
// CLAUDE.md "Plan Persistence Workflow": nothing reaches production tables
// until schema validation, business-rule validation, and user approval have
// all passed. Approval itself is atomic via the approve_staged_plan RPC.

export interface PlanRequestState {
  status:
    | 'idle'
    | 'staged'
    | 'needs_clarification'
    | 'failed';
  error: string | null;
  questions: string[] | null;
  warnings: string[] | null;
}

export const initialPlanRequestState: PlanRequestState = {
  status: 'idle',
  error: null,
  questions: null,
  warnings: null,
};

export async function requestPlan(
  goalId: string,
  _prev: PlanRequestState,
  formData: FormData
): Promise<PlanRequestState> {
  const promptInput = z
    .string()
    .trim()
    .min(1, 'Describe what you want to plan.')
    .max(8000)
    .safeParse(formData.get('prompt'));
  if (!promptInput.success) {
    return { ...initialPlanRequestState, status: 'failed', error: promptInput.error.issues[0].message };
  }
  const prompt = promptInput.data;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ...initialPlanRequestState, status: 'failed', error: 'Not authenticated.' };
  }

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single();
  if (goalError || !goal) {
    return { ...initialPlanRequestState, status: 'failed', error: 'Goal not found.' };
  }

  // Record the conversation first so every AI interaction is auditable,
  // including failures.
  const { data: conversation, error: convError } = await supabase
    .from('goal_conversations')
    .insert({
      user_id: user.id,
      goal_id: goalId,
      conversation_type: 'initial_plan',
      raw_prompt: prompt,
      status: 'pending',
    })
    .select('id')
    .single();
  if (convError || !conversation) {
    return {
      ...initialPlanRequestState,
      status: 'failed',
      error: `Could not record planning request: ${convError?.message}`,
    };
  }

  await supabase.from('goals').update({ status: 'planning' }).eq('id', goalId);

  const result = await generatePlan(goal, prompt);

  if (!result.ok) {
    // AI failures are logged on the conversation row, separately from
    // ordinary validation errors (which never reach this point).
    console.error(`[ai-failure] conversation=${conversation.id} kind=${result.failure.kind}: ${result.failure.message}`);
    await supabase
      .from('goal_conversations')
      .update({
        status: 'failed',
        ai_response_raw: result.raw,
        error_message: `${result.failure.kind}: ${result.failure.message}`,
      })
      .eq('id', conversation.id);
    await supabase.from('goals').update({ status: 'draft' }).eq('id', goalId);
    revalidatePath(`/goals/${goalId}`);
    return {
      ...initialPlanRequestState,
      status: 'failed',
      error: result.failure.message,
    };
  }

  if (result.response.kind === 'clarification') {
    await supabase
      .from('goal_conversations')
      .update({
        status: 'needs_clarification',
        ai_response_raw: result.raw,
        ai_response_json: result.response,
      })
      .eq('id', conversation.id);
    await supabase.from('goals').update({ status: 'draft' }).eq('id', goalId);
    revalidatePath(`/goals/${goalId}`);
    return {
      ...initialPlanRequestState,
      status: 'needs_clarification',
      questions: result.response.questions,
    };
  }

  // Business-rule validation on top of schema validation.
  const rules = validatePlanRules(result.response.plan, goal);
  if (rules.errors.length > 0) {
    await supabase
      .from('goal_conversations')
      .update({
        status: 'failed',
        ai_response_raw: result.raw,
        ai_response_json: result.response,
        error_message: `Business-rule validation failed: ${rules.errors.join(' | ')}`,
      })
      .eq('id', conversation.id);
    await supabase.from('goals').update({ status: 'draft' }).eq('id', goalId);
    revalidatePath(`/goals/${goalId}`);
    return {
      ...initialPlanRequestState,
      status: 'failed',
      error: `The generated plan failed validation: ${rules.errors.join(' ')}`,
    };
  }

  const { error: stageError } = await supabase
    .from('goal_conversations')
    .update({
      status: 'staged',
      ai_response_raw: result.raw,
      ai_response_json: result.response,
    })
    .eq('id', conversation.id);
  if (stageError) {
    return {
      ...initialPlanRequestState,
      status: 'failed',
      error: `Could not stage plan: ${stageError.message}`,
    };
  }

  await supabase
    .from('goals')
    .update({ status: 'awaiting_approval' })
    .eq('id', goalId);

  revalidatePath(`/goals/${goalId}`);
  return {
    ...initialPlanRequestState,
    status: 'staged',
    warnings: rules.warnings.length > 0 ? rules.warnings : null,
  };
}

export async function approvePlan(
  conversationId: string,
  goalId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Re-validate the staged payload before persisting: never trust stored
  // JSON blindly, even our own.
  const { data: conversation, error: convError } = await supabase
    .from('goal_conversations')
    .select('id, status, ai_response_json')
    .eq('id', conversationId)
    .single();
  if (convError || !conversation) {
    return { error: 'Staged plan not found.' };
  }
  if (conversation.status !== 'staged') {
    return { error: `Plan is ${conversation.status}, not staged.` };
  }
  const payload = conversation.ai_response_json as { plan?: unknown } | null;
  const revalidated = planSchema.safeParse(payload?.plan);
  if (!revalidated.success) {
    return { error: 'Staged plan payload is no longer valid; regenerate the plan.' };
  }

  const { error } = await supabase.rpc('approve_staged_plan', {
    p_conversation_id: conversationId,
  });
  if (error) {
    return { error: `Approval failed: ${error.message}` };
  }

  revalidatePath(`/goals/${goalId}`);
  revalidatePath('/goals');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function rejectPlan(
  conversationId: string,
  goalId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('goal_conversations')
    .update({ status: 'rejected' })
    .eq('id', conversationId)
    .eq('status', 'staged');
  if (error) {
    return { error: `Could not reject plan: ${error.message}` };
  }

  await supabase
    .from('goals')
    .update({ status: 'draft' })
    .eq('id', goalId)
    .eq('status', 'awaiting_approval');

  revalidatePath(`/goals/${goalId}`);
  return { error: null };
}
