export interface Followup {
  id: string;
  customer_id: string;
  task_id: string;
  scheduled_for: string;
  type: 'payment_reminder' | 'status_check' | 'escalation';
  notes: string;
  created_at: string;
}

export interface ScheduleFollowupParams {
  customerId: string;
  taskId: string;
  daysFromNow: number;
  type: Followup['type'];
  notes: string;
}

export class FollowupAgent {
  readonly name = 'FollowupAgent';
  private followups: Map<string, Followup> = new Map();

  /**
   * Schedules a follow-up action for a customer.
   * Automatically selects escalation type for severely overdue accounts (>20 days).
   */
  schedule(params: ScheduleFollowupParams): Followup {
    const id = `FUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const scheduledFor = new Date(Date.now() + params.daysFromNow * 86_400_000).toISOString();

    const followup: Followup = {
      id,
      customer_id: params.customerId,
      task_id: params.taskId,
      scheduled_for: scheduledFor,
      type: params.type,
      notes: params.notes,
      created_at: new Date().toISOString(),
    };

    this.followups.set(id, followup);
    console.log(`[${this.name}] Scheduled ${params.type} for customer ${params.customerId} on ${scheduledFor}`);
    return followup;
  }

  /**
   * Auto-schedule: derives type and cadence from days overdue.
   */
  autoSchedule(customerId: string, taskId: string, daysOverdue: number, invoiceId: string): Followup {
    const daysFromNow = daysOverdue > 20 ? 3 : 7;
    const type: Followup['type'] = daysOverdue > 20 ? 'escalation' : 'payment_reminder';
    return this.schedule({
      customerId,
      taskId,
      daysFromNow,
      type,
      notes: `Auto follow-up from task ${taskId} for invoice ${invoiceId}`,
    });
  }

  getByTask(taskId: string): Followup[] {
    return Array.from(this.followups.values()).filter((f) => f.task_id === taskId);
  }

  getByCustomer(customerId: string): Followup[] {
    return Array.from(this.followups.values()).filter((f) => f.customer_id === customerId);
  }
}

export const AGENT_NAME = 'FollowupAgent';
