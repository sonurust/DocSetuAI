export interface Followup {
  id: string;
  customer_id: string;
  task_id: string;
  scheduled_for: string;
  type: 'payment_reminder' | 'status_check' | 'escalation';
  notes: string;
  created_at: string;
}

const followups: Map<string, Followup> = new Map();

export function createFollowup(params: {
  customerId: string;
  taskId: string;
  daysFromNow: number;
  type: Followup['type'];
  notes: string;
}): Followup {
  const id = `FUP-${Date.now().toString(36).toUpperCase()}`;
  const scheduledFor = new Date(Date.now() + params.daysFromNow * 86400000).toISOString();

  const followup: Followup = {
    id,
    customer_id: params.customerId,
    task_id: params.taskId,
    scheduled_for: scheduledFor,
    type: params.type,
    notes: params.notes,
    created_at: new Date().toISOString(),
  };

  followups.set(id, followup);
  return followup;
}

export function getFollowupsByTask(taskId: string): Followup[] {
  return Array.from(followups.values()).filter((f) => f.task_id === taskId);
}
