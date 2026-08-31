import type { Task, Approval, Activity, Customer, Invoice } from '@docsetuai/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface TasksResponse {
  success: boolean;
  data: Task[];
  stats: {
    active_agents: number;
    tasks_running: number;
    completed_today: number;
    awaiting_approval: number;
    total_tasks: number;
  };
}

export interface TaskDetailResponse {
  success: boolean;
  data: {
    task: Task;
    executions: import('@docsetuai/types').AgentExecution[];
    approvals: Approval[];
    activities: Activity[];
  };
}

export const api = {
  // Tasks
  getTasks: () => request<TasksResponse>('/api/tasks'),
  getTask: (id: string) => request<TaskDetailResponse>(`/api/tasks/${id}`),
  getStats: () => request<{ success: boolean; data: TasksResponse['stats'] }>('/api/tasks/stats'),
  createTask: (goal: string) =>
    request<{ success: boolean; data: Task }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ goal }),
    }),
  runTask: (id: string) =>
    request<{ success: boolean; data: Task }>(`/api/tasks/${id}/run`, { method: 'POST' }),
  cancelTask: (id: string) =>
    request<{ success: boolean; data: Task }>(`/api/tasks/${id}/cancel`, { method: 'POST' }),

  // Approvals
  getApprovals: (status?: string) =>
    request<{ success: boolean; data: Approval[] }>(`/api/approvals${status ? `?status=${status}` : ''}`),
  approveApproval: (id: string) =>
    request<{ success: boolean; data: Approval }>(`/api/approvals/${id}/approve`, { method: 'POST' }),
  rejectApproval: (id: string, reason?: string) =>
    request<{ success: boolean; data: Approval }>(`/api/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  approveAll: () =>
    request<{ success: boolean; count: number }>('/api/approvals/approve-all', { method: 'POST' }),

  // Activity
  getActivity: (taskId?: string) =>
    request<{ success: boolean; data: Activity[] }>(
      `/api/activity${taskId ? `?task_id=${taskId}` : ''}`,
    ),

  // Customers & Invoices
  getCustomers: () => request<{ success: boolean; data: Customer[] }>('/api/customers'),
  getInvoices: (status?: string) =>
    request<{ success: boolean; data: Invoice[] }>(`/api/invoices${status ? `?status=${status}` : ''}`),
  getOverdueInvoices: (minDays?: number) =>
    request<{ success: boolean; data: Invoice[] }>(
      `/api/invoices/overdue${minDays ? `?min_days=${minDays}` : ''}`,
    ),

  // Agents
  getAgents: () => request<{ success: boolean; data: unknown[] }>('/api/agents'),

  // Health
  health: () => request<{ status: string; runtime_mode: string }>('/health'),
};
