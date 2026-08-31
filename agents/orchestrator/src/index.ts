import type { AgentExecution, TaskResult } from '@docsetuai/types';

export interface VerificationReport {
  total_executions: number;
  successful: number;
  failed: number;
  success_rate: number;
  messages_sent: number;
  messages_failed: number;
  estimated_recovery: number;
  currency: string;
  status: 'success' | 'partial' | 'failed';
  summary: string;
  details: string[];
}

export class VerificationAgent {
  readonly name = 'VerificationAgent';

  /**
   * Audits all agent executions for a completed task and generates a structured report.
   */
  audit(params: {
    executions: AgentExecution[];
    sentCount: number;
    sendFailures: number;
    totalMessages: number;
    approvedCount: number;
    totalRecovery: number;
    invoiceCount: number;
    customerCount: number;
    followupCount: number;
    taskStartedAt: string;
  }): TaskResult {
    const {
      executions, sentCount, sendFailures, totalMessages, approvedCount,
      totalRecovery, invoiceCount, customerCount, followupCount, taskStartedAt,
    } = params;

    const failed = executions.filter((e) => e.status === 'failed');
    const successRate = executions.length > 0
      ? Math.round(((executions.length - failed.length) / executions.length) * 100)
      : 100;

    const executionTimeMs = Date.now() - new Date(taskStartedAt).getTime();

    const details: string[] = [
      `${executions.length} agent tool calls executed (${successRate}% success rate)`,
      `${approvedCount}/${totalMessages} messages approved by human reviewer`,
      `${sentCount}/${approvedCount} emails delivered${sendFailures > 0 ? ` (${sendFailures} delivery failures auto-retried)` : ''}`,
      `${followupCount} follow-up actions scheduled`,
      `Estimated AR recovery: ₹${totalRecovery.toLocaleString('en-IN')}`,
    ];

    if (failed.length > 0) {
      details.push(`${failed.length} execution(s) failed: ${failed.map((e) => e.action).join(', ')}`);
    }

    console.log(`[${this.name}] Audit complete: ${sentCount}/${totalMessages} sent, ₹${totalRecovery.toLocaleString('en-IN')} recovery`);

    return {
      invoices_analyzed: invoiceCount,
      customers_processed: customerCount,
      messages_generated: totalMessages,
      messages_approved: approvedCount,
      messages_sent: sentCount,
      followups_created: followupCount,
      estimated_recovery: totalRecovery,
      currency: 'INR',
      execution_time_ms: executionTimeMs,
      status: sendFailures === 0 && failed.length === 0 ? 'success' : 'partial',
      summary: `Processed ${invoiceCount} overdue invoices. ${sentCount} payment reminders sent. Estimated recovery: ₹${totalRecovery.toLocaleString('en-IN')}.`,
    };
  }
}

export const AGENT_NAME = 'VerificationAgent';
