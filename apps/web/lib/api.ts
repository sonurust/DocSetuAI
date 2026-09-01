import type { Task, Approval, Activity, Customer, Invoice } from '@docsetuai/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
    headers['X-API-Key'] = API_KEY;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    cache: 'no-store',
    ...options,
    headers,
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

  // AI Telemetry & Dev Logs
  getAiLogs: (taskId?: string, limit?: number) =>
    request<{ success: boolean; data: import('@docsetuai/types').AiLogEntry[]; total: number }>(
      `/api/logs/ai${taskId ? `?task_id=${taskId}` : ''}${limit ? `&limit=${limit}` : ''}`,
    ),
  clearAiLogs: () =>
    request<{ success: boolean; message: string }>('/api/logs/ai/clear', { method: 'POST' }),

  // Real-time SSE Stream
  subscribeToTaskStream: (
    taskId: string,
    callbacks: {
      onConnected?: (data: TaskDetailResponse['data']) => void;
      onTaskUpdate?: (data: TaskDetailResponse['data']) => void;
      onExecutionUpdate?: (data: { execution: import('@docsetuai/types').AgentExecution; executions: import('@docsetuai/types').AgentExecution[] }) => void;
      onApprovalUpdate?: (data: { approval: Approval; approvals: Approval[] }) => void;
      onActivity?: (data: { activity: Activity; activities: Activity[] }) => void;
      onAiLog?: (log: import('@docsetuai/types').AiLogEntry) => void;
      onComplete?: (data: { status: string }) => void;
      onError?: (err: Event) => void;
    },
  ): () => void => {
    const es = new EventSource(`${BASE_URL}/api/tasks/${taskId}/stream`);

    if (callbacks.onConnected) {
      es.addEventListener('connected', (e) => {
        try {
          callbacks.onConnected?.(JSON.parse(e.data));
        } catch {}
      });
    }

    if (callbacks.onTaskUpdate) {
      es.addEventListener('task_update', (e) => {
        try {
          callbacks.onTaskUpdate?.(JSON.parse(e.data));
        } catch {}
      });
    }

    if (callbacks.onExecutionUpdate) {
      es.addEventListener('execution_update', (e) => {
        try {
          callbacks.onExecutionUpdate?.(JSON.parse(e.data));
        } catch {}
      });
    }

    if (callbacks.onApprovalUpdate) {
      es.addEventListener('approval_update', (e) => {
        try {
          callbacks.onApprovalUpdate?.(JSON.parse(e.data));
        } catch {}
      });
    }

    if (callbacks.onActivity) {
      es.addEventListener('activity', (e) => {
        try {
          callbacks.onActivity?.(JSON.parse(e.data));
        } catch {}
      });
    }

    if (callbacks.onAiLog) {
      es.addEventListener('ai_log', (e) => {
        try {
          callbacks.onAiLog?.(JSON.parse(e.data));
        } catch {}
      });
    }

    if (callbacks.onComplete) {
      es.addEventListener('complete', (e) => {
        try {
          callbacks.onComplete?.(JSON.parse(e.data));
        } catch {}
        es.close();
      });
    }

    if (callbacks.onError) {
      es.onerror = callbacks.onError;
    }

    // Return cleanup function
    return () => {
      es.close();
    };
  },
};
