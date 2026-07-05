'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { generateGoalDraft } from '@/lib/ai/claude';
import { validateGoalDraftRules } from '@/lib/domain/goal-draft-rules';
import { createClient } from '@/lib/db/server';
import { goalDraftSchema, type GoalDraft } from '@/lib/validation/goal-draft';

// Goal intake: the front door of the app. The user talks to Claude first
// ("Goal clarification" mode); only an approved draft becomes a `goals` row.
// Mirrors the plan staging/approval flow in lib/domain/plan-actions.ts, one
// step earlier — the conversation exists before any goal record does, which
// goal_conversations.goal_id (nullable) supports directly.

export interface GoalIntakeState {
  status: 'idle' | 'staged' | 'needs_clarification' | 'failed';
  conversationId: string | null;
  error: string | null;
  questions: string[] | null;
  draft: GoalDraft | null;
  warnings: string[] | null;
}

export const initialGoalIntakeState: GoalIntakeState = {
  status: 'idle',
  conversationId: null,
  error: null,
  questions: null,
  draft: null,
  warnings: null,
};

export async function requestGoalDraft(
  _prev: GoalIntakeState,
  formData: FormData
): Promise<GoalIntakeState> {
  const promptInput = z
    .string()
    .trim()
    .min(1, 'Describe the goal you want to work on.')
    .max(8000)
    .safeParse(formData.get('prompt'));
  if (!promptInput.success) {
    return { ...initialGoalIntakeState, status: 'failed', error: promptInput.error.issues[0].message };
  }
  const prompt = promptInput.data;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ...initialGoalIntakeState, status: 'failed', error: 'Not authenticated.' };
  }

  // Record the conversation before the goal exists, so every AI interaction
  // is auditable, including failures and abandoned drafts.
  const { data: conversation, error: convError } = await supabase
    .from('goal_conversations')
    .insert({
      user_id: user.id,
      goal_id: null,
      conversation_type: 'clarification',
      raw_prompt: prompt,
      status: 'pending',
    })
    .select('id')
    .single();
  if (convError || !conversation) {
    return {
      ...initialGoalIntakeState,
      status: 'failed',
      error: `Could not record planning request: ${convError?.message}`,
    };
  }

  const result = await generateGoalDraft(prompt);

  if (!result.ok) {
    console.error(`[ai-failure] conversation=${conversation.id} kind=${result.failure.kind}: ${result.failure.message}`);
    await supabase
      .from('goal_conversations')
      .update({
        status: 'failed',
        ai_response_raw: result.raw,
        error_message: `${result.failure.kind}: ${result.failure.message}`,
      })
      .eq('id', conversation.id);
    return { ...initialGoalIntakeState, status: 'failed', error: result.failure.message };
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
    return {
      ...initialGoalIntakeState,
      status: 'needs_clarification',
      conversationId: conversation.id,
      questions: result.response.questions,
    };
  }

  // Business-rule validation on top of schema validation.
  const rules = validateGoalDraftRules(result.response.draft);
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
    return {
      ...initialGoalIntakeState,
      status: 'failed',
      error: `The generated goal draft failed validation: ${rules.errors.join(' ')}`,
    };
  }

  await supabase
    .from('goal_conversations')
    .update({
      status: 'staged',
      ai_response_raw: result.raw,
      ai_response_json: result.response,
    })
    .eq('id', conversation.id);

  return {
    ...initialGoalIntakeState,
    status: 'staged',
    conversationId: conversation.id,
    draft: result.response.draft,
    warnings: rules.warnings.length > 0 ? rules.warnings : null,
  };
}

export interface ApproveGoalDraftState {
  error: string | null;
}

export async function approveGoalDraft(
  conversationId: string,
  _prev: ApproveGoalDraftState,
  formData: FormData
): Promise<ApproveGoalDraftState> {
  const parsed = goalDraftSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    success_definition: formData.get('success_definition') || undefined,
    category: formData.get('category') || undefined,
    priority: formData.get('priority') ?? 'medium',
    start_date: formData.get('start_date') || undefined,
    target_date: formData.get('target_date') || undefined,
    estimated_effort_hours: formData.get('estimated_effort_hours')
      ? Number(formData.get('estimated_effort_hours'))
      : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Re-validate business rules on the (possibly user-edited) final values
  // before persisting — never trust a staged payload blindly, even our own.
  const rules = validateGoalDraftRules(parsed.data);
  if (rules.errors.length > 0) {
    return { error: rules.errors.join(' ') };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated.' };
  }

  const { data: conversation, error: convError } = await supabase
    .from('goal_conversations')
    .select('id, status, goal_id')
    .eq('id', conversationId)
    .single();
  if (convError || !conversation) {
    return { error: 'Staged goal draft not found.' };
  }
  if (conversation.status !== 'staged' || conversation.goal_id !== null) {
    return { error: `Draft is ${conversation.status}, not a pending goal draft.` };
  }

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .insert({ ...parsed.data, user_id: user.id, status: 'draft' })
    .select('id')
    .single();
  if (goalError || !goal) {
    return { error: `Could not create goal: ${goalError?.message}` };
  }

  await supabase
    .from('goal_conversations')
    .update({ status: 'approved', approved_at: new Date().toISOString(), goal_id: goal.id })
    .eq('id', conversationId);

  revalidatePath('/goals');
  redirect(`/goals/${goal.id}`);
}

export async function rejectGoalDraft(conversationId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('goal_conversations')
    .update({ status: 'rejected' })
    .eq('id', conversationId)
    .eq('status', 'staged')
    .is('goal_id', null);
  if (error) {
    return { error: `Could not reject draft: ${error.message}` };
  }
  return { error: null };
}
