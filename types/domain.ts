// Shared domain types. Keep in sync with supabase/migrations enums and
// lib/validation schemas (see CLAUDE.md "State Model").

export const GOAL_STATUSES = [
  'draft',
  'planning',
  'awaiting_approval',
  'active',
  'paused',
  'completed',
  'archived',
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const MILESTONE_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
  'blocked',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const TASK_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'waiting',
  'done',
  'cancelled',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITY_LEVELS = ['low', 'medium', 'high'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const CONVERSATION_TYPES = [
  'clarification',
  'initial_plan',
  'replan',
  'next_action',
  'progress_summary',
  'daily_review',
  'weekly_review',
] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export const CONVERSATION_STATUSES = [
  'pending',
  'needs_clarification',
  'staged',
  'approved',
  'rejected',
  'failed',
] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const TASK_SOURCES = ['ai_plan', 'ai_replan', 'manual'] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

export const RISK_SEVERITIES = ['low', 'medium', 'high'] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  success_definition: string | null;
  category: string | null;
  priority: PriorityLevel;
  status: GoalStatus;
  target_date: string | null;
  start_date: string | null;
  percent_complete: number;
  estimated_effort_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface GoalConversation {
  id: string;
  user_id: string;
  goal_id: string | null;
  conversation_type: ConversationType;
  raw_prompt: string;
  ai_response_raw: string | null;
  ai_response_json: unknown;
  status: ConversationStatus;
  error_message: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  success_criteria: string | null;
  sequence_no: number;
  target_date: string | null;
  status: MilestoneStatus;
  percent_complete: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  goal_id: string;
  milestone_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  priority: PriorityLevel;
  action_type: string | null;
  due_date: string | null;
  status: TaskStatus;
  percent_complete: number;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  scheduled_for: string | null;
  source: TaskSource;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'blocks' | 'informs';
}

export interface CheckIn {
  id: string;
  goal_id: string;
  task_id: string | null;
  user_id: string;
  note: string;
  progress_delta: number | null;
  blocker_flag: boolean;
  next_step: string | null;
  created_at: string;
}

export interface Risk {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  severity: RiskSeverity;
  mitigation: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  goal_id: string | null;
  task_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}
