import type { LLMAdapter } from './llm.interface';
import type { AgentPlan, LLMMessage } from '@docsetuai/types';
import { aiLogStore } from '../store/aiLogStore';
import { v4 as uuid } from 'uuid';

const PAYMENT_RECOVERY_PLAN: AgentPlan = {
  goal_summary: 'Recover overdue payments from customers with past-due invoices',
  estimated_duration_ms: 64000,
  steps: [
    { id: uuid(), label: 'Find overdue invoices', agent: 'BillingAgent', status: 'pending' },
    { id: uuid(), label: 'Retrieve customer profiles', agent: 'CustomerAgent', status: 'pending' },
    { id: uuid(), label: 'Analyse payment history', agent: 'CustomerAgent', status: 'pending' },
    { id: uuid(), label: 'Calculate customer priority', agent: 'CustomerAgent', status: 'pending' },
    { id: uuid(), label: 'Generate personalized messages', agent: 'CommunicationAgent', status: 'pending' },
    { id: uuid(), label: 'Request human approval', agent: 'OrchestratorAgent', status: 'pending' },
    { id: uuid(), label: 'Send approved communications', agent: 'CommunicationAgent', status: 'pending' },
    { id: uuid(), label: 'Schedule follow-ups', agent: 'FollowupAgent', status: 'pending' },
    { id: uuid(), label: 'Verify execution results', agent: 'VerificationAgent', status: 'pending' },
  ],
};

const FOLLOWUP_PLAN: AgentPlan = {
  goal_summary: 'Follow up with inactive customers to re-engage',
  estimated_duration_ms: 45000,
  steps: [
    { id: uuid(), label: 'Identify inactive customers', agent: 'CustomerAgent', status: 'pending' },
    { id: uuid(), label: 'Analyse engagement history', agent: 'CustomerAgent', status: 'pending' },
    { id: uuid(), label: 'Generate re-engagement messages', agent: 'CommunicationAgent', status: 'pending' },
    { id: uuid(), label: 'Request human approval', agent: 'OrchestratorAgent', status: 'pending' },
    { id: uuid(), label: 'Send communications', agent: 'CommunicationAgent', status: 'pending' },
    { id: uuid(), label: 'Verify results', agent: 'VerificationAgent', status: 'pending' },
  ],
};

export class MockLLMAdapter implements LLMAdapter {
  async generatePlan(goal: string): Promise<AgentPlan> {
    const startTime = Date.now();
    await sleep(400);

    const lower = goal.toLowerCase();
    let plan: AgentPlan;

    if (lower.includes('overdue') || lower.includes('payment') || lower.includes('invoice') || lower.includes('recover')) {
      plan = clonePlan(PAYMENT_RECOVERY_PLAN, goal);
    } else if (lower.includes('inactive') || lower.includes('follow') || lower.includes('churn')) {
      plan = clonePlan(FOLLOWUP_PLAN, goal);
    } else {
      plan = {
        goal_summary: goal,
        estimated_duration_ms: 30000,
        steps: [
          { id: uuid(), label: 'Analyse business data', agent: 'CustomerAgent', status: 'pending' },
          { id: uuid(), label: 'Generate action items', agent: 'CommunicationAgent', status: 'pending' },
          { id: uuid(), label: 'Request human approval', agent: 'OrchestratorAgent', status: 'pending' },
          { id: uuid(), label: 'Execute approved actions', agent: 'CommunicationAgent', status: 'pending' },
          { id: uuid(), label: 'Verify results', agent: 'VerificationAgent', status: 'pending' },
        ],
      };
    }

    aiLogStore.log({
      agent: 'OrchestratorAgent',
      action: 'generate_plan',
      model: 'gemini-3.6-flash (mock-fallback)',
      system_instruction: 'Generate a structured multi-agent operational plan',
      request_payload: { goal },
      response_payload: plan,
      latency_ms: Date.now() - startTime,
      status: 'success',
    });

    return plan;
  }

  async generatePaymentMessage(params: {
    customerName: string;
    company: string;
    invoiceId: string;
    amount: number;
    currency: string;
    daysOverdue: number;
    previousInteractions?: string[];
  }): Promise<string> {
    const startTime = Date.now();
    await sleep(200);

    const { customerName, company, invoiceId, amount, currency, daysOverdue, previousInteractions } = params;

    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(amount);

    const urgency = daysOverdue > 20 ? 'urgent' : daysOverdue > 10 ? 'firm' : 'friendly';
    let message = '';

    if (urgency === 'friendly') {
      message = `Dear ${customerName},

I hope this message finds you well. We wanted to bring to your attention that invoice ${invoiceId} for ${formattedAmount} is currently ${daysOverdue} days overdue.

We understand that business can get busy, and we appreciate the ongoing relationship with ${company}. We would appreciate if you could arrange for the payment at your earliest convenience.

Please feel free to reach out if you have any questions or if there's anything we can assist with.

Warm regards,
DocSetuAI Collections Team`;
    } else if (urgency === 'firm') {
      const prevNote = previousInteractions?.length
        ? `\n\nAs per our previous communications, `
        : '';
      message = `Dear ${customerName},${prevNote}

This is a reminder that invoice ${invoiceId} for ${formattedAmount} from ${company} is now ${daysOverdue} days past its due date.

We kindly request that you settle this outstanding amount within the next 3 business days to avoid any service interruption.

If payment has already been made, please disregard this message and share the payment confirmation.

Regards,
DocSetuAI Collections Team`;
    } else {
      message = `Dear ${customerName},

URGENT: Invoice ${invoiceId} for ${formattedAmount} from ${company} is now ${daysOverdue} days overdue.

This requires your immediate attention. Failure to settle this amount within 48 hours may result in service suspension and may affect your credit terms.

Please contact us immediately to discuss payment arrangements.

DocSetuAI Collections Team`;
    }

    aiLogStore.log({
      agent: 'CommunicationAgent',
      action: 'generate_payment_message',
      model: 'gemini-3.6-flash (mock-fallback)',
      system_instruction: 'Generate tone-adapted payment reminder body',
      request_payload: params,
      response_payload: { message },
      latency_ms: Date.now() - startTime,
      status: 'success',
    });

    return message;
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    const startTime = Date.now();
    await sleep(100);
    if (!messages.length) return '';
    const last = messages[messages.length - 1];
    if (!last) return '';
    const response = `Acknowledged: "${last.content.slice(0, 60)}..."`;

    aiLogStore.log({
      agent: 'ChatAgent',
      action: 'chat',
      model: 'gemini-3.6-flash (mock-fallback)',
      request_payload: { messages },
      response_payload: { response },
      latency_ms: Date.now() - startTime,
      status: 'success',
    });

    return response;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function clonePlan(template: AgentPlan, goal: string): AgentPlan {
  return {
    ...template,
    goal_summary: goal || template.goal_summary,
    steps: template.steps.map((s) => ({ ...s, id: uuid() })),
  };
}
