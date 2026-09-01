import { v4 as uuid } from 'uuid';
import { taskStore } from '../store/taskStore';
import { customerStore } from '../store/customerStore';
import { aiLogStore } from '../store/aiLogStore';
import { config } from '@docsetuai/config';
import { getLLMAdapter } from '../llm/factory';
import { firestoreRepo } from '../store/firestore.repository';
import { getOverdueInvoices, getInvoice, getInvoicesByCustomer } from '../tools/billing.tools';
import { getCustomer, getCustomerHistory, calculateCustomerPriority } from '../tools/customer.tools';
import { sendEmail } from '../tools/communication.tools';
import { createFollowup } from '../tools/followup.tools';
import type {
  Task,
  AgentExecution,
  Approval,
  ApprovalPayload,
  Activity,
  TaskResult,
} from '@docsetuai/types';

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

  // Log to AI Developer Inspector stream
  aiLogStore.log({
    task_id: taskId,
    agent: exec.agent,
    action: exec.action,
    model: config.gemini_model,
    request_payload: exec.input ?? {},
    response_payload: output ?? null,
    latency_ms: durationMs,
    status: error ? 'error' : 'success',
    error,
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

// ── Cancellation registry ──────────────────────────────────────────────────────

const cancelledTasks: Set<string> = new Set();

export function cancelTask(taskId: string): void {
  cancelledTasks.add(taskId);
}

function isCancelled(taskId: string): boolean {
  return cancelledTasks.has(taskId);
}

// Guard: throws if the task was cancelled mid-execution
function assertNotCancelled(taskId: string): void {
  if (isCancelled(taskId)) {
    throw new Error(`Task ${taskId} was cancelled`);
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function runTask(task: Task): Promise<void> {
  const taskId = task.id;
  const llm = getLLMAdapter();

  // Cleanup any stale cancel flag from a previous run
  cancelledTasks.delete(taskId);

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

    assertNotCancelled(taskId);

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
    const overdueInvoices = getOverdueInvoices(minDays);
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

    assertNotCancelled(taskId);

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
      previousInteractions: string[];
    }

    const profiles: CustomerProfileInternal[] = [];

    for (const invoice of overdueInvoices) {
      assertNotCancelled(taskId);

      const custExec = startExec(taskId, 'CustomerAgent', 'build_customer_profile', { customer_id: invoice.customer_id });
      await delay(80);
      const customer = getCustomer(invoice.customer_id);
      if (!customer) { finishExec(taskId, custExec, undefined, 'Customer not found'); continue; }

      const history = getCustomerHistory(customer.id);
      const priority = calculateCustomerPriority(customer.id);

      // ── Persistent memory: load prior interactions from Firestore ──────
      let previousInteractions: string[] = [];
      const memory = await firestoreRepo.getCustomerMemory(customer.id);
      if (memory?.interactions?.length) {
        previousInteractions = memory.interactions
          .slice(-3) // last 3 interactions
          .map((i) => `${i.date}: ${i.description}${i.outcome ? ` (${i.outcome})` : ''}`);
      }

      finishExec(taskId, custExec, {
        name: customer.name,
        priority,
        outstanding: history.total_outstanding,
        has_memory: previousInteractions.length > 0,
      });
      profiles.push({ customer, invoice, priority, previousInteractions });
    }

    if (step1) markStep(taskId, step1.id, 'completed');
    if (step2) { markStep(taskId, step2.id, 'running'); await delay(200); markStep(taskId, step2.id, 'completed'); }
    if (step3) { markStep(taskId, step3.id, 'running'); await delay(200); markStep(taskId, step3.id, 'completed'); }
    logActivity(taskId, 'agent_completed', `CustomerAgent: ${profiles.length} customers analysed, priorities calculated`);

    // Sort by priority (highest first)
    profiles.sort((a, b) => b.priority - a.priority);

    assertNotCancelled(taskId);

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
      assertNotCancelled(taskId);

      const daysOverdue = profile.invoice.days_overdue;
      const tone = daysOverdue <= 7 ? 'gentle' : daysOverdue <= 14 ? 'firm' : daysOverdue <= 30 ? 'urgent' : 'escalation';
      const msgExec = startExec(taskId, 'CommunicationAgent', 'generate_payment_message', {
        customer_id: profile.customer.id,
        invoice_id: profile.invoice.id,
        tone,
        has_prior_interactions: profile.previousInteractions.length > 0,
      });
      await delay(150);

      // Pass customer memory (prior interactions) to Gemini for contextual drafting
      const message = await llm.generatePaymentMessage({
        customerName: profile.customer.name,
        company: profile.customer.company,
        invoiceId: profile.invoice.id,
        amount: profile.invoice.amount,
        currency: profile.invoice.currency,
        daysOverdue: profile.invoice.days_overdue,
        previousInteractions: profile.previousInteractions,
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
      // Respect cancellation even during the approval wait
      if (isCancelled(taskId)) {
        taskStore.updateTaskStatus(taskId, 'cancelled');
        logActivity(taskId, 'task_failed', 'Task cancelled during approval gate');
        return;
      }
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
      assertNotCancelled(taskId);

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

        // Save interaction to customer memory
        await firestoreRepo.saveCustomerMemory({
          customer_id: approval.customer_id,
          interactions: [{
            date: new Date().toISOString().split('T')[0] ?? '',
            type: 'payment_reminder',
            description: `Payment reminder sent for invoice ${approval.payload.invoice.id} (₹${approval.payload.invoice.amount.toLocaleString('en-IN')})`,
            outcome: 'sent',
          }],
          preferred_channel: 'email',
          risk_level: 'medium',
          notes: [],
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
      assertNotCancelled(taskId);

      const daysFromNow = invoice.days_overdue > 20 ? 3 : 7;
      const type: 'payment_reminder' | 'escalation' = invoice.days_overdue > 20 ? 'escalation' : 'payment_reminder';

      // Use the real tool (persists to Firestore)
      createFollowup({
        customerId: customer.id,
        taskId,
        daysFromNow,
        type,
        notes: `Auto-scheduled after invoice ${invoice.id} reminder. Days overdue: ${invoice.days_overdue}`,
      });
      followupCount++;
      logActivity(taskId, 'followup_created', `Follow-up scheduled for ${customer.company}`, {
        customer_id: customer.id,
        invoice_id: invoice.id,
        days_from_now: daysFromNow,
        type,
      });
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
    const isCancelErr = message.includes('was cancelled');
    console.error(`[Orchestrator] Task ${taskId} ${isCancelErr ? 'cancelled' : 'failed'}:`, err);
    taskStore.updateTaskStatus(taskId, isCancelErr ? 'cancelled' : 'failed');
    logActivity(taskId, isCancelErr ? 'task_failed' : 'task_failed', `Task ${isCancelErr ? 'cancelled' : 'failed'}: ${message}`);
  } finally {
    cancelledTasks.delete(taskId);
  }
}
