import { v4 as uuid } from 'uuid';
import { taskStore } from '../store/taskStore';
import { customerStore } from '../store/customerStore';
import { getLLMAdapter } from '../llm/factory';
import { getOverdueInvoices, getInvoice, getInvoicesByCustomer } from '../tools/billing.tools';
import { getCustomer, getCustomerHistory, calculateCustomerPriority } from '../tools/customer.tools';
import { sendEmail } from '../tools/communication.tools';
import type {
  Task,
  AgentExecution,
  Approval,
  ApprovalPayload,
  Activity,
  TaskResult,
} from '@docsetuai/types';

// ── Agent class helpers (inline until workspace packages are linked) ──────────
// These mirror the logic in agents/* — the packages act as the source of truth
// for consumers outside apps/api once they are published or workspace-linked.

// ── Shared helpers ────────────────────────────────────────────────────────────

function logActivity(
  taskId: string,
  type: Activity['type'],
  description: string,
  metadata?: Record<string, unknown>,
): void {
  taskStore.addActivity({
    id: uuid(),
    task_id: taskId,
    type,
    description,
    metadata,
    created_at: new Date().toISOString(),
  });
  console.log(`[Activity:${taskId}] ${description}`);
}

function startExec(taskId: string, agent: string, action: string, input?: Record<string, unknown>): AgentExecution {
  const exec: AgentExecution = {
    id: uuid(),
    task_id: taskId,
    agent,
    action,
    status: 'running',
    input,
    started_at: new Date().toISOString(),
  };
  taskStore.addExecution(taskId, exec);
  return exec;
}

function finishExec(
  taskId: string,
  exec: AgentExecution,
  output?: Record<string, unknown>,
  error?: string,
): void {
  const completedAt = new Date().toISOString();
  const durationMs = new Date(completedAt).getTime() - new Date(exec.started_at).getTime();
  taskStore.updateExecution(taskId, exec.id, {
    status: error ? 'failed' : 'completed',
    output,
    error,
    completed_at: completedAt,
    duration_ms: durationMs,
  });
}

function markStep(taskId: string, stepId: string, status: 'running' | 'completed' | 'failed') {
  taskStore.updatePlanStep(taskId, stepId, {
    status,
    ...(status === 'running' ? { started_at: new Date().toISOString() } : {}),
    ...(status === 'completed' || status === 'failed' ? { completed_at: new Date().toISOString() } : {}),
  });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Agent instances ───────────────────────────────────────────────────────────

// Agent helpers — thin wrappers around tool functions
const billingOps = { findOverdueInvoices: getOverdueInvoices };
const customerOps = { getCustomer, getCustomerHistory, calculatePriority: calculateCustomerPriority };
const followups = new Map<string, { customerId: string; taskId: string; scheduledFor: string; type: string }>();

function autoScheduleFollowup(customerId: string, taskId: string, daysOverdue: number, invoiceId: string) {
  const id = `FUP-${Date.now().toString(36).toUpperCase()}`;
  const daysFromNow = daysOverdue > 20 ? 3 : 7;
  const type = daysOverdue > 20 ? 'escalation' : 'payment_reminder';
  followups.set(id, {
    customerId,
    taskId,
    scheduledFor: new Date(Date.now() + daysFromNow * 86_400_000).toISOString(),
    type,
  });
  return id;
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function runTask(task: Task): Promise<void> {
  const taskId = task.id;
  const llm = getLLMAdapter();

  // Communication is delegated to LLM adapter + sendEmail tool directly

  try {
    // ── Phase 1: Planning ──────────────────────────────────────────────────
    taskStore.updateTaskStatus(taskId, 'planning');
    logActivity(taskId, 'task_started', `Task started: "${task.goal}"`);

    const planExec = startExec(taskId, 'OrchestratorAgent', 'generate_plan', { goal: task.goal });
    const plan = await llm.generatePlan(task.goal);
    taskStore.updateTaskPlan(taskId, plan.steps);
    finishExec(taskId, planExec, { steps: plan.steps.length, goal_summary: plan.goal_summary });
    logActivity(taskId, 'agent_completed', `Plan created: ${plan.steps.length} steps`, {
      steps: plan.steps.map((s) => s.label),
    });
    await delay(500);

    // ── Phase 2: BillingAgent — find overdue invoices ──────────────────────
    const minDays = task.goal.toLowerCase().includes('7 day') ? 7
      : task.goal.toLowerCase().includes('14 day') ? 14
      : task.goal.toLowerCase().includes('30 day') ? 30
      : 0;

    const step0 = plan.steps[0];
    if (step0) markStep(taskId, step0.id, 'running');
    taskStore.updateTaskStatus(taskId, 'executing');
    logActivity(taskId, 'agent_started', 'BillingAgent: scanning for overdue invoices');

    const billingExec = startExec(taskId, 'BillingAgent', 'find_overdue_invoices', { min_days_overdue: minDays });
    await delay(600);
    const overdueInvoices = billingOps.findOverdueInvoices(minDays);
    finishExec(taskId, billingExec, { count: overdueInvoices.length, min_days: minDays });
    if (step0) markStep(taskId, step0.id, 'completed');
    logActivity(taskId, 'tool_called', `BillingAgent → find_overdue_invoices(): ${overdueInvoices.length} invoices found`, {
      invoice_count: overdueInvoices.length,
    });

    if (overdueInvoices.length === 0) {
      taskStore.updateTaskStatus(taskId, 'completed');
      taskStore.setTaskResult(taskId, {
        invoices_analyzed: 0,
        customers_processed: 0,
        messages_generated: 0,
        messages_approved: 0,
        messages_sent: 0,
        followups_created: 0,
        estimated_recovery: 0,
        currency: 'INR',
        execution_time_ms: 0,
        status: 'success',
        summary: 'No overdue invoices found matching the criteria.',
      });
      logActivity(taskId, 'task_completed', 'No overdue invoices found. Task complete.');
      return;
    }

    // ── Phase 3: CustomerAgent — profile & score each customer ─────────────
    const step1 = plan.steps[1];
    const step2 = plan.steps[2];
    const step3 = plan.steps[3];

    if (step1) markStep(taskId, step1.id, 'running');
    logActivity(taskId, 'agent_started', `CustomerAgent: analysing ${overdueInvoices.length} customers`);

    interface CustomerProfileInternal {
      customer: NonNullable<ReturnType<typeof getCustomer>>;
      invoice: (typeof overdueInvoices)[0];
      priority: number;
    }

    const profiles: CustomerProfileInternal[] = [];

    for (const invoice of overdueInvoices) {
      const custExec = startExec(taskId, 'CustomerAgent', 'build_customer_profile', { customer_id: invoice.customer_id });
      await delay(80);
      const customer = customerOps.getCustomer(invoice.customer_id);
      if (!customer) { finishExec(taskId, custExec, undefined, 'Customer not found'); continue; }
      const history = customerOps.getCustomerHistory(customer.id);
      const priority = customerOps.calculatePriority(customer.id);
      finishExec(taskId, custExec, { name: customer.name, priority, outstanding: history.total_outstanding });
      profiles.push({ customer, invoice, priority });
    }

    if (step1) markStep(taskId, step1.id, 'completed');
    if (step2) { markStep(taskId, step2.id, 'running'); await delay(200); markStep(taskId, step2.id, 'completed'); }
    if (step3) { markStep(taskId, step3.id, 'running'); await delay(200); markStep(taskId, step3.id, 'completed'); }
    logActivity(taskId, 'agent_completed', `CustomerAgent: ${profiles.length} customers analysed, priorities calculated`);

    // Sort by priority (highest first)
    profiles.sort((a, b) => b.priority - a.priority);

    // ── Phase 4: CommunicationAgent — generate personalised messages ───────
    const step4 = plan.steps[4];
    if (step4) markStep(taskId, step4.id, 'running');
    logActivity(taskId, 'agent_started', 'CommunicationAgent: generating personalized payment messages');

    const approvalRequests: Array<{
      approval: Approval;
      customer: CustomerProfileInternal['customer'];
      invoice: CustomerProfileInternal['invoice'];
    }> = [];

    for (const profile of profiles) {
      const daysOverdue = profile.invoice.days_overdue;
      const tone = daysOverdue <= 7 ? 'gentle' : daysOverdue <= 14 ? 'firm' : daysOverdue <= 30 ? 'urgent' : 'escalation';
      const msgExec = startExec(taskId, 'CommunicationAgent', 'generate_payment_message', {
        customer_id: profile.customer.id,
        invoice_id: profile.invoice.id,
        tone,
      });
      await delay(150);
      const message = await llm.generatePaymentMessage({
        customerName: profile.customer.name,
        company: profile.customer.company,
        invoiceId: profile.invoice.id,
        amount: profile.invoice.amount,
        currency: profile.invoice.currency,
        daysOverdue: profile.invoice.days_overdue,
      });
      finishExec(taskId, msgExec, { message_length: message.length, tone });

      const approval: Approval = {
        id: uuid(),
        task_id: taskId,
        customer_id: profile.customer.id,
        action: 'send_payment_reminder',
        payload: {
          customer: {
            id: profile.customer.id,
            name: profile.customer.name,
            company: profile.customer.company,
            email: profile.customer.email,
          },
          invoice: {
            id: profile.invoice.id,
            amount: profile.invoice.amount,
            currency: profile.invoice.currency,
            days_overdue: profile.invoice.days_overdue,
          },
          message,
          channel: (profile.customer.preferred_channel ?? 'email') as ApprovalPayload['channel'],
        },
        status: 'pending',
        requested_at: new Date().toISOString(),
      };
      taskStore.addApproval(approval);
      approvalRequests.push({ approval, customer: profile.customer, invoice: profile.invoice });
    }

    if (step4) markStep(taskId, step4.id, 'completed');
    logActivity(taskId, 'agent_completed', `CommunicationAgent: ${approvalRequests.length} messages generated`);

    // ── Phase 5: Human-in-the-Loop approval gate ───────────────────────────
    const step5 = plan.steps[5];
    if (step5) markStep(taskId, step5.id, 'running');
    taskStore.updateTaskStatus(taskId, 'awaiting_approval');
    logActivity(taskId, 'approval_requested', `Human approval requested for ${approvalRequests.length} messages`);

    const maxWaitMs = 10 * 60 * 1000;
    const pollInterval = 2000;
    let waited = 0;
    while (waited < maxWaitMs) {
      const pendingCount = taskStore.getApprovalsByTask(taskId).filter((a) => a.status === 'pending').length;
      if (pendingCount === 0) break;
      await delay(pollInterval);
      waited += pollInterval;
    }

    const resolvedApprovals = taskStore.getApprovalsByTask(taskId);
    const approved = resolvedApprovals.filter((a) => a.status === 'approved');
    const rejected = resolvedApprovals.filter((a) => a.status === 'rejected');

    if (step5) markStep(taskId, step5.id, 'completed');
    logActivity(taskId, 'approval_received', `Approvals resolved: ${approved.length} approved, ${rejected.length} rejected`);

    // ── Phase 6: CommunicationAgent — dispatch approved emails ─────────────
    const step6 = plan.steps[6];
    if (step6) markStep(taskId, step6.id, 'running');
    taskStore.updateTaskStatus(taskId, 'executing');
    logActivity(taskId, 'agent_started', `CommunicationAgent: sending ${approved.length} approved messages`);

    let sentCount = 0;
    let sendFailures = 0;

    for (const approval of approved) {
      const sendExec = startExec(taskId, 'CommunicationAgent', 'send_email', {
        customer_id: approval.customer_id,
        email: approval.payload.customer.email,
      });
      try {
        await sendEmail({
          customerId: approval.customer_id,
          email: approval.payload.customer.email,
          subject: `Payment Reminder: Invoice ${approval.payload.invoice.id}`,
          body: approval.payload.message,
        });
        finishExec(taskId, sendExec, { email: approval.payload.customer.email });
        sentCount++;
        logActivity(taskId, 'email_sent', `Email sent to ${approval.payload.customer.company}`, {
          customer_id: approval.customer_id,
          invoice_id: approval.payload.invoice.id,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        finishExec(taskId, sendExec, undefined, errMsg);
        sendFailures++;
        logActivity(taskId, 'error', `Email delivery failed for ${approval.payload.customer.company}: ${errMsg}`, {
          customer_id: approval.customer_id,
        });
      }
    }

    if (step6) markStep(taskId, step6.id, 'completed');
    logActivity(taskId, 'agent_completed', `${sentCount} emails sent, ${sendFailures} failures`);

    // ── Phase 7: FollowupAgent — schedule follow-ups ───────────────────────
    const step7 = plan.steps[7];
    if (step7) markStep(taskId, step7.id, 'running');
    logActivity(taskId, 'agent_started', 'FollowupAgent: scheduling follow-ups');

    let followupCount = 0;
    for (const { customer, invoice } of profiles) {
      autoScheduleFollowup(customer.id, taskId, invoice.days_overdue, invoice.id);
      followupCount++;
      logActivity(taskId, 'followup_created', `Follow-up scheduled for ${customer.company}`);
    }

    if (step7) markStep(taskId, step7.id, 'completed');

    // ── Phase 8: VerificationAgent — audit & final report ──────────────────
    const step8 = plan.steps[8];
    if (step8) markStep(taskId, step8.id, 'running');
    await delay(300);

    const executions = taskStore.getExecutions(taskId);
    const totalRecovery = approved.reduce((sum, a) => sum + a.payload.invoice.amount, 0);
    const failedExecs = executions.filter((e) => e.status === 'failed').length;

    const taskResult: TaskResult = {
      invoices_analyzed: overdueInvoices.length,
      customers_processed: profiles.length,
      messages_generated: approvalRequests.length,
      messages_approved: approved.length,
      messages_sent: sentCount,
      followups_created: followupCount,
      estimated_recovery: totalRecovery,
      currency: 'INR',
      execution_time_ms: Date.now() - new Date(task.started_at ?? task.created_at).getTime(),
      status: sendFailures === 0 && failedExecs === 0 ? 'success' : 'partial',
      summary: `Processed ${overdueInvoices.length} overdue invoices. ${sentCount} payment reminders sent. Estimated recovery: ₹${totalRecovery.toLocaleString('en-IN')}.`,
    };

    taskStore.setTaskResult(taskId, taskResult);
    if (step8) markStep(taskId, step8.id, 'completed');

    logActivity(taskId, 'verification_completed', 'Verification complete', {
      sent: sentCount,
      total_recovery: totalRecovery,
    });

    taskStore.updateTaskStatus(taskId, 'completed');
    logActivity(taskId, 'task_completed', `Task completed. ${sentCount}/${approvalRequests.length} messages sent.`);

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Orchestrator] Task ${taskId} failed:`, err);
    taskStore.updateTaskStatus(taskId, 'failed');
    logActivity(taskId, 'task_failed', `Task failed: ${message}`);
  }
}
