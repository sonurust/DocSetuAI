import { taskStore } from '../store/taskStore';
import { buildSeedData } from '../seed/demoData';
import { customerStore } from '../store/customerStore';

beforeAll(() => {
  const { customers, invoices } = buildSeedData();
  customerStore.seed(customers, invoices);
});

beforeEach(() => {
  // Reset task store between tests
  (taskStore as any).tasks = new Map();
  (taskStore as any).executions = new Map();
  (taskStore as any).approvals = new Map();
  (taskStore as any).activities = [];
});

describe('Task Store', () => {
  it('creates a task with correct initial state', () => {
    const task = taskStore.createTask('Recover overdue payments');
    expect(task.id).toMatch(/^TASK-/);
    expect(task.status).toBe('pending');
    expect(task.goal).toBe('Recover overdue payments');
    expect(task.created_at).toBeTruthy();
  });

  it('retrieves a created task', () => {
    const task = taskStore.createTask('Test goal');
    const found = taskStore.getTask(task.id);
    expect(found).not.toBeUndefined();
    expect(found?.id).toBe(task.id);
  });

  it('updates task status correctly', () => {
    const task = taskStore.createTask('Test goal');
    taskStore.updateTaskStatus(task.id, 'planning');
    expect(taskStore.getTask(task.id)?.status).toBe('planning');
    taskStore.updateTaskStatus(task.id, 'executing');
    expect(taskStore.getTask(task.id)?.status).toBe('executing');
    taskStore.updateTaskStatus(task.id, 'completed');
    const completed = taskStore.getTask(task.id);
    expect(completed?.status).toBe('completed');
    expect(completed?.completed_at).toBeTruthy();
  });

  it('returns all tasks sorted by created_at desc', () => {
    taskStore.createTask('Task A');
    taskStore.createTask('Task B');
    taskStore.createTask('Task C');
    const tasks = taskStore.getAllTasks();
    expect(tasks.length).toBe(3);
    for (let i = 0; i < tasks.length - 1; i++) {
      const taskA = tasks[i]!;
      const taskB = tasks[i + 1]!;
      expect(new Date(taskA.created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(taskB.created_at).getTime(),
      );
    }
  });
});

describe('Approval Flow', () => {
  it('creates and retrieves a pending approval', () => {
    const task = taskStore.createTask('Test approval flow');

    const approval = {
      id: 'TEST-APPROVAL-1',
      task_id: task.id,
      customer_id: 'CUS-1000',
      action: 'send_payment_reminder',
      payload: {
        customer: { id: 'CUS-1000', name: 'Test User', company: 'Test Corp', email: 'test@test.com' },
        invoice: { id: 'INV-2000', amount: 50000, currency: 'INR', days_overdue: 10 },
        message: 'Please pay your invoice',
        channel: 'email' as const,
      },
      status: 'pending' as const,
      requested_at: new Date().toISOString(),
    };

    taskStore.addApproval(approval);
    const found = taskStore.getApproval('TEST-APPROVAL-1');
    expect(found).not.toBeUndefined();
    expect(found?.status).toBe('pending');
  });

  it('approves a pending approval', () => {
    const task = taskStore.createTask('Test approval');
    const approval = {
      id: 'APPROVE-TEST',
      task_id: task.id,
      customer_id: 'CUS-1000',
      action: 'send_payment_reminder',
      payload: {
        customer: { id: 'CUS-1000', name: 'Test', company: 'Test Co', email: 'x@x.com' },
        invoice: { id: 'INV-X', amount: 1000, currency: 'INR', days_overdue: 5 },
        message: 'Pay now',
        channel: 'email' as const,
      },
      status: 'pending' as const,
      requested_at: new Date().toISOString(),
    };
    taskStore.addApproval(approval);
    const updated = taskStore.updateApprovalStatus('APPROVE-TEST', 'approved', 'test-user');
    expect(updated?.status).toBe('approved');
    expect(updated?.approved_by).toBe('test-user');
    expect(updated?.approved_at).toBeTruthy();
  });

  it('rejects a pending approval with reason', () => {
    const task = taskStore.createTask('Test reject');
    const approval = {
      id: 'REJECT-TEST',
      task_id: task.id,
      customer_id: 'CUS-1001',
      action: 'send_payment_reminder',
      payload: {
        customer: { id: 'CUS-1001', name: 'Test2', company: 'Test Co2', email: 'y@y.com' },
        invoice: { id: 'INV-Y', amount: 2000, currency: 'INR', days_overdue: 8 },
        message: 'Pay now',
        channel: 'email' as const,
      },
      status: 'pending' as const,
      requested_at: new Date().toISOString(),
    };
    taskStore.addApproval(approval);
    const updated = taskStore.updateApprovalStatus('REJECT-TEST', 'rejected', 'admin', 'Message tone too harsh');
    expect(updated?.status).toBe('rejected');
    expect(updated?.rejection_reason).toBe('Message tone too harsh');
  });

  it('getPendingApprovals returns only pending', () => {
    const task = taskStore.createTask('Multi approval test');
    for (let i = 0; i < 3; i++) {
      taskStore.addApproval({
        id: `MULTI-${i}`,
        task_id: task.id,
        customer_id: `CUS-${i}`,
        action: 'send_payment_reminder',
        payload: {
          customer: { id: `CUS-${i}`, name: `Name ${i}`, company: `Co ${i}`, email: `c${i}@c.com` },
          invoice: { id: `INV-${i}`, amount: 1000 * (i + 1), currency: 'INR', days_overdue: i + 5 },
          message: 'Pay',
          channel: 'email' as const,
        },
        status: 'pending',
        requested_at: new Date().toISOString(),
      });
    }
    taskStore.updateApprovalStatus('MULTI-0', 'approved', 'user');
    const pending = taskStore.getPendingApprovals();
    expect(pending.length).toBe(2);
    expect(pending.every((a) => a.status === 'pending')).toBe(true);
  });
});

describe('Stats', () => {
  it('returns correct stats with running tasks', () => {
    const task = taskStore.createTask('Test stats');
    taskStore.updateTaskStatus(task.id, 'executing');
    const stats = taskStore.getStats();
    expect(stats.tasks_running).toBe(1);
    expect(stats.total_tasks).toBeGreaterThan(0);
  });
});
