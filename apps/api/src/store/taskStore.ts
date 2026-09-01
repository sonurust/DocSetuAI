import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import { firestoreRepo } from './firestore.repository';
import type {
  Task,
  AgentExecution,
  Approval,
  Activity,
  TaskStatus,
  ApprovalStatus,
  TaskResult,
  PlanStep,
} from '@docsetuai/types';

class TaskStore extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private executions: Map<string, AgentExecution[]> = new Map();
  private approvals: Map<string, Approval> = new Map();
  private activities: Activity[] = [];

  // ── Tasks ─────────────────────────────────────────────────────────────────

  createTask(goal: string, createdBy = 'user'): Task {
    const task: Task = {
      id: `TASK-${uuid().slice(0, 8).toUpperCase()}`,
      goal,
      status: 'pending',
      created_at: new Date().toISOString(),
      created_by: createdBy,
    };
    this.tasks.set(task.id, task);
    this.executions.set(task.id, []);
    firestoreRepo.saveTask(task).catch(() => {});
    this.emit('task_update', { taskId: task.id, task });
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated: Task = {
      ...task,
      status,
      started_at: status === 'executing' || status === 'planning' ? (task.started_at ?? new Date().toISOString()) : task.started_at,
      completed_at: status === 'completed' || status === 'failed' || status === 'cancelled'
        ? new Date().toISOString()
        : task.completed_at,
    };
    this.tasks.set(id, updated);
    firestoreRepo.saveTask(updated).catch(() => {});
    this.emit('task_update', { taskId: id, task: updated });
    return updated;
  }

  updateTaskPlan(id: string, plan: PlanStep[]): void {
    const task = this.tasks.get(id);
    if (task) {
      const updated = { ...task, plan };
      this.tasks.set(id, updated);
      firestoreRepo.saveTask(updated).catch(() => {});
      this.emit('task_update', { taskId: id, task: updated });
    }
  }

  updatePlanStep(taskId: string, stepId: string, patch: Partial<PlanStep>): void {
    const task = this.tasks.get(taskId);
    if (!task?.plan) return;
    const plan = task.plan.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
    const updated = { ...task, plan };
    this.tasks.set(taskId, updated);
    firestoreRepo.saveTask(updated).catch(() => {});
    this.emit('task_update', { taskId, task: updated });
  }

  setTaskResult(id: string, result: TaskResult): void {
    const task = this.tasks.get(id);
    if (task) {
      const updated = { ...task, result };
      this.tasks.set(id, updated);
      firestoreRepo.saveTask(updated).catch(() => {});
      this.emit('task_update', { taskId: id, task: updated });
    }
  }

  // ── Executions ────────────────────────────────────────────────────────────

  addExecution(taskId: string, exec: AgentExecution): void {
    const list = this.executions.get(taskId) ?? [];
    list.push(exec);
    this.executions.set(taskId, list);
    this.emit('execution_update', { taskId, execution: exec, executions: list });
  }

  getExecutions(taskId: string): AgentExecution[] {
    return this.executions.get(taskId) ?? [];
  }

  updateExecution(taskId: string, execId: string, patch: Partial<AgentExecution>): void {
    const list = this.executions.get(taskId) ?? [];
    const idx = list.findIndex((e) => e.id === execId);
    const current = list[idx];
    if (idx !== -1 && current) {
      list[idx] = { ...current, ...patch };
    }
    this.executions.set(taskId, list);
    this.emit('execution_update', { taskId, execution: list[idx], executions: list });
  }

  // ── Approvals ─────────────────────────────────────────────────────────────

  addApproval(approval: Approval): void {
    this.approvals.set(approval.id, approval);
    firestoreRepo.saveApproval(approval).catch(() => {});
    this.emit('approval_update', {
      taskId: approval.task_id,
      approval,
      approvals: this.getApprovalsByTask(approval.task_id),
    });
  }

  getApproval(id: string): Approval | undefined {
    return this.approvals.get(id);
  }

  getAllApprovals(): Approval[] {
    return Array.from(this.approvals.values()).sort(
      (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime(),
    );
  }

  getPendingApprovals(): Approval[] {
    return this.getAllApprovals().filter((a) => a.status === 'pending');
  }

  getApprovalsByTask(taskId: string): Approval[] {
    return Array.from(this.approvals.values()).filter((a) => a.task_id === taskId);
  }

  updateApprovalStatus(
    id: string,
    status: ApprovalStatus,
    approvedBy = 'user',
    rejectionReason?: string,
  ): Approval | undefined {
    const approval = this.approvals.get(id);
    if (!approval) return undefined;
    const updated: Approval = {
      ...approval,
      status,
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
      rejection_reason: rejectionReason,
    };
    this.approvals.set(id, updated);
    firestoreRepo.saveApproval(updated).catch(() => {});
    this.emit('approval_update', {
      taskId: updated.task_id,
      approval: updated,
      approvals: this.getApprovalsByTask(updated.task_id),
    });
    return updated;
  }

  approveAll(approvedBy = 'user'): number {
    const pending = this.getPendingApprovals();
    for (const a of pending) {
      this.updateApprovalStatus(a.id, 'approved', approvedBy);
    }
    return pending.length;
  }

  // ── Activities ────────────────────────────────────────────────────────────

  addActivity(activity: Activity): void {
    this.activities.unshift(activity);
    if (this.activities.length > 500) this.activities.splice(500);
    firestoreRepo.logActivity(activity).catch(() => {});
    if (activity.task_id) {
      this.emit('activity', {
        taskId: activity.task_id,
        activity,
        activities: this.getActivitiesByTask(activity.task_id),
      });
    }
  }

  getAllActivities(limit = 100): Activity[] {
    return this.activities.slice(0, limit);
  }

  getActivitiesByTask(taskId: string): Activity[] {
    return this.activities.filter((a) => a.task_id === taskId);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  getStats() {
    const allTasks = this.getAllTasks();
    const today = new Date().toDateString();
    return {
      active_agents: allTasks.filter((t) =>
        ['planning', 'executing', 'awaiting_approval'].includes(t.status),
      ).length,
      tasks_running: allTasks.filter((t) => t.status === 'executing').length,
      completed_today: allTasks.filter(
        (t) => t.status === 'completed' && t.completed_at && new Date(t.completed_at).toDateString() === today,
      ).length,
      awaiting_approval: this.getPendingApprovals().length,
      total_tasks: allTasks.length,
    };
  }
}

export const taskStore = new TaskStore();
