import type { Customer, Invoice } from '@docsetuai/types';

export interface PaymentHistorySummary {
  total_invoices: number;
  paid_count: number;
  overdue_count: number;
  average_days_late: number;
  total_outstanding: number;
}

export interface CustomerProfile {
  customer: Customer;
  invoices: Invoice[];
  payment_history: PaymentHistorySummary;
  priority_score: number;
}

export interface CustomerAgentTools {
  getCustomer: (id: string) => Customer | null;
  getInvoicesByCustomer: (customerId: string) => Invoice[];
}

export class CustomerAgent {
  readonly name = 'CustomerAgent';

  constructor(private readonly tools: CustomerAgentTools) {}

  getCustomer(customerId: string): Customer | null {
    return this.tools.getCustomer(customerId);
  }

  /**
   * Computes payment history summary for a customer.
   */
  getPaymentHistory(customerId: string): PaymentHistorySummary {
    const invoices = this.tools.getInvoicesByCustomer(customerId);
    const paid = invoices.filter((i) => i.status === 'paid');
    const overdue = invoices.filter((i) => i.status === 'overdue');
    const outstanding = overdue.reduce((sum, i) => sum + i.amount, 0);

    return {
      total_invoices: invoices.length,
      paid_count: paid.length,
      overdue_count: overdue.length,
      average_days_late:
        overdue.length > 0
          ? Math.round(overdue.reduce((s, i) => s + i.days_overdue, 0) / overdue.length)
          : 0,
      total_outstanding: outstanding,
    };
  }

  /**
   * Calculates a 0-100 priority score for collection targeting.
   * Factors: outstanding amount, max days overdue, risk score, payment history.
   */
  calculatePriority(customerId: string): number {
    const customer = this.tools.getCustomer(customerId);
    if (!customer) return 0;

    const invoices = this.tools.getInvoicesByCustomer(customerId);
    const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
    const history = this.getPaymentHistory(customerId);

    let score = 0;

    // Outstanding amount (higher amount = higher priority)
    const totalOverdue = overdueInvoices.reduce((s, i) => s + i.amount, 0);
    score += Math.min(40, (totalOverdue / 10000) * 2);

    // Days overdue (longer = higher priority)
    const maxDays = Math.max(...overdueInvoices.map((i) => i.days_overdue), 0);
    score += Math.min(25, maxDays * 0.8);

    // Risk score from customer profile
    score += customer.risk_score * 0.2;

    // Payment history penalty
    if (history.average_days_late > 0) score += 10;

    return Math.min(100, Math.round(score));
  }

  /**
   * Builds full CustomerProfile for a customer + overdue invoice pair.
   */
  buildProfile(customer: Customer, invoice: Invoice): CustomerProfile {
    const invoices = this.tools.getInvoicesByCustomer(customer.id);
    const payment_history = this.getPaymentHistory(customer.id);
    const priority_score = this.calculatePriority(customer.id);
    return { customer, invoices, payment_history, priority_score };
  }
}

export const AGENT_NAME = 'CustomerAgent';
