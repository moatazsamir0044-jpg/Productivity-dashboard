import type { GoalConversation } from '@/types/domain';

// CLAUDE.md lists "Conversation history / planning history" as a required
// primary screen/section — every exchange with Claude about this goal,
// including failures and rejections, stays visible instead of disappearing
// once its status changes.

const STATUS_LABEL: Record<GoalConversation['status'], string> = {
  pending: 'In progress',
  needs_clarification: 'Claude asked a question',
  staged: 'Staged for approval',
  approved: 'Approved',
  rejected: 'Rejected',
  failed: 'Failed',
};

export function ConversationHistory({ conversations }: { conversations: GoalConversation[] }) {
  if (conversations.length === 0) {
    return null;
  }

  return (
    <details className="rounded border border-neutral-800">
      <summary className="cursor-pointer px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-900">
        Planning history with Claude ({conversations.length})
      </summary>
      <ul className="divide-y divide-neutral-800 border-t border-neutral-800">
        {conversations.map((c) => (
          <li key={c.id} className="px-4 py-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wide text-neutral-500">
                {c.conversation_type.replace(/_/g, ' ')}
              </span>
              <span className="shrink-0 text-xs text-neutral-500">
                {new Date(c.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mb-1 text-sm text-neutral-300">{c.raw_prompt}</p>
            <p className="text-xs text-neutral-500">
              {STATUS_LABEL[c.status] ?? c.status}
              {c.error_message && ` — ${c.error_message}`}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}
