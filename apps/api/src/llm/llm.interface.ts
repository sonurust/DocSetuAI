import type { AgentPlan, LLMMessage } from '@docsetuai/types';

export interface LLMAdapter {
  generatePlan(goal: string): Promise<AgentPlan>;
  generatePaymentMessage(params: {
    customerName: string;
    company: string;
    invoiceId: string;
    amount: number;
    currency: string;
    daysOverdue: number;
    previousInteractions?: string[];
  }): Promise<string>;
  chat(messages: LLMMessage[]): Promise<string>;
}
