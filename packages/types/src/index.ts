// ─── Status Enums ───────────────────────────────────────────────────────────

export type TaskStatus =
  | 'pending'
  | 'planning'
  | 'executing'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';

export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled';

export type CustomerSegment = 'enterprise' | 'mid_market' | 'smb' | 'startup';

export type ActivityType =
  | 'task_created'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'agent_started'
  | 'agent_completed'
  | 'tool_called'
  | 'approval_requested'
  | 'approval_received'
  | 'email_sent'
  | 'followup_created'
  | 'verification_completed'
  | 'error';

// ─── Domain Entities ─────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  segment: CustomerSegment;
  risk_score: number; // 0–100
  created_at: string;
  // Memory / context
  last_contact?: string;
  preferred_channel?: 'email' | 'phone' | 'whatsapp';
  notes?: string;
}

export interface Invoice {
  id: string;
  customer_id: string;
  amount: number;
  currency: string;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  days_overdue: number;
  description?: string;
}

export interface Task {
  id: string;
  goal: string;
  status: TaskStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  created_by: string;
  plan?: PlanStep[];
  result?: TaskResult;
}

export interface PlanStep {
  id: string;
  label: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
}

export interface TaskResult {
  invoices_analyzed: number;
  customers_processed: number;
  messages_generated: number;
  messages_approved: number;
  messages_sent: number;
  followups_created: number;
  estimated_recovery: number;
  currency: string;
  execution_time_ms: number;
  status: 'success' | 'partial' | 'failed';
  summary: string;
}

export interface AgentExecution {
  id: string;
  task_id: string;
  agent: string;
  action: string;
  status: AgentStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface Approval {
  id: string;
  task_id: string;
  customer_id: string;
  action: string;
  payload: ApprovalPayload;
  status: ApprovalStatus;
  requested_at: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
}

export interface ApprovalPayload {
  customer: Pick<Customer, 'id' | 'name' | 'company' | 'email'>;
  invoice: Pick<Invoice, 'id' | 'amount' | 'currency' | 'days_overdue'>;
  message: string;
  channel: 'email' | 'phone' | 'whatsapp';
}

export interface Activity {
  id: string;
  task_id?: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ─── Agent Memory ─────────────────────────────────────────────────────────────

export interface CustomerMemory {
  customer_id: string;
  interactions: MemoryInteraction[];
  preferred_channel: 'email' | 'phone' | 'whatsapp';
  risk_level: 'low' | 'medium' | 'high';
  last_payment_date?: string;
  notes: string[];
}

export interface MemoryInteraction {
  date: string;
  type: string;
  description: string;
  outcome?: string;
}

// ─── API Request / Response Types ────────────────────────────────────────────

export interface CreateTaskRequest {
  goal: string;
  created_by?: string;
}

export interface RunTaskRequest {
  task_id: string;
}

export interface ApproveRequest {
  approved_by?: string;
}

export interface RejectRequest {
  reason?: string;
  approved_by?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Tool Call Types ──────────────────────────────────────────────────────────

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  called_at: string;
  duration_ms?: number;
}

// ─── LLM / Agent Types ───────────────────────────────────────────────────────

export interface AgentPlan {
  goal_summary: string;
  steps: PlanStep[];
  estimated_duration_ms: number;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
