export interface SendEmailParams {
  customerId: string;
  email: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  success: boolean;
  message_id: string;
  channel: 'email';
  delivered_at: string;
  attempts: number;
  provider: string;
}

export interface GenerateMessageParams {
  customerName: string;
  company: string;
  invoiceId: string;
  amount: number;
  currency: string;
  daysOverdue: number;
}

export interface CommunicationAgentTools {
  generatePaymentMessage: (params: GenerateMessageParams) => Promise<string>;
  sendEmail: (params: SendEmailParams) => Promise<SendEmailResult>;
}

export class CommunicationAgent {
  readonly name = 'CommunicationAgent';

  constructor(private readonly tools: CommunicationAgentTools) {}

  /**
   * Uses Gemini LLM to craft a personalized, tone-aware payment reminder.
   * Automatically adjusts firmness based on days overdue.
   */
  async generatePaymentMessage(params: GenerateMessageParams): Promise<string> {
    console.log(`[${this.name}] Generating message for ${params.company} (${params.daysOverdue} days overdue)`);
    const message = await this.tools.generatePaymentMessage(params);
    console.log(`[${this.name}] Message generated (${message.length} chars)`);
    return message;
  }

  /**
   * Dispatches approved email via configured provider with exponential backoff retry.
   */
  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    console.log(`[${this.name}] Dispatching email to ${params.email}`);
    const result = await this.tools.sendEmail(params);
    console.log(`[${this.name}] Delivered ${result.message_id} (attempt ${result.attempts}, via ${result.provider})`);
    return result;
  }

  /**
   * Determines tone class for a given overdue period.
   */
  static getToneLabel(daysOverdue: number): 'gentle' | 'firm' | 'urgent' | 'escalation' {
    if (daysOverdue <= 7) return 'gentle';
    if (daysOverdue <= 14) return 'firm';
    if (daysOverdue <= 30) return 'urgent';
    return 'escalation';
  }
}

export const AGENT_NAME = 'CommunicationAgent';
