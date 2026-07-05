import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { PLANNING_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { planningResponseSchema, type PlanningResponse } from '@/lib/validation/plan';
import type { Goal } from '@/types/domain';

// Server-side Claude integration for structured plan generation.
// The model is forced to answer through a single tool call whose input
// schema is derived from the same Zod schema used for validation, so the
// raw response and the validated payload can never drift apart.

const DEFAULT_MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-5';
const MAX_TOKENS = 8192;

// Wrapping in an object keeps the top-level JSON schema type "object",
// which the tool input_schema requires (the union itself is an anyOf).
const toolInputSchema = z.object({ response: planningResponseSchema });

export type PlanningResult =
  | { ok: true; response: PlanningResponse; raw: string }
  | { ok: false; failure: PlanningFailure; raw: string | null };

export interface PlanningFailure {
  // Distinguishes AI failures from ordinary validation errors for logging.
  kind: 'refusal' | 'truncated' | 'malformed' | 'api_error';
  message: string;
}

export async function generatePlan(
  goal: Pick<Goal, 'title' | 'description' | 'success_definition' | 'category' | 'priority' | 'start_date' | 'target_date' | 'estimated_effort_hours'>,
  userPrompt: string
): Promise<PlanningResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      raw: null,
      failure: {
        kind: 'api_error',
        message: 'ANTHROPIC_API_KEY is not configured on the server.',
      },
    };
  }

  const client = new Anthropic();

  const goalContext = [
    `Goal title: ${goal.title}`,
    goal.description && `Description: ${goal.description}`,
    goal.success_definition && `Success definition: ${goal.success_definition}`,
    goal.category && `Category: ${goal.category}`,
    `Priority: ${goal.priority}`,
    goal.start_date && `Start date: ${goal.start_date}`,
    goal.target_date && `Target date: ${goal.target_date}`,
    goal.estimated_effort_hours != null &&
      `Estimated effort: ${goal.estimated_effort_hours} hours`,
    `Today's date: ${new Date().toISOString().slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join('\n');

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: PLANNING_SYSTEM_PROMPT,
      tools: [
        {
          name: 'submit_planning_response',
          description:
            'Submit the structured planning response: either a full plan or clarification questions.',
          input_schema: z.toJSONSchema(toolInputSchema) as Anthropic.Tool['input_schema'],
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_planning_response' },
      messages: [
        {
          role: 'user',
          content: `${goalContext}\n\nUser request:\n${userPrompt}`,
        },
      ],
    });
  } catch (err) {
    return {
      ok: false,
      raw: null,
      failure: {
        kind: 'api_error',
        message: err instanceof Error ? err.message : 'Unknown Claude API error',
      },
    };
  }

  const raw = JSON.stringify(message.content);

  if (message.stop_reason === 'refusal') {
    return {
      ok: false,
      raw,
      failure: { kind: 'refusal', message: 'Claude declined to generate a plan for this request.' },
    };
  }

  if (message.stop_reason === 'max_tokens') {
    return {
      ok: false,
      raw,
      failure: { kind: 'truncated', message: 'Claude response was cut off before completing the plan.' },
    };
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );

  if (!toolUse) {
    return {
      ok: false,
      raw,
      failure: { kind: 'malformed', message: 'Claude returned no structured tool output.' },
    };
  }

  const parsed = toolInputSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    return {
      ok: false,
      raw,
      failure: {
        kind: 'malformed',
        message: `Structured output failed schema validation: ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
      },
    };
  }

  return { ok: true, response: parsed.data.response, raw };
}
