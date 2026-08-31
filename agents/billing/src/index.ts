import type { Invoice } from '@docsetuai/types';

export interface BillingAgentConfig {
  getOverdueInvoices: (minDays: number) => Invoice[];
  getInvoice: (id: string) => Invoice | null;
  getInvoicesByCustomer: (customerId: string) => Invoice[];
}

export class BillingAgent {
  readonly name = 'BillingAgent';

  constructor(private readonly tools: BillingAgentConfig) {}

  /**
   * Scans AR ledger for invoices overdue beyond the given threshold.
   */
  findOverdueInvoices(minDaysOverdue = 0): Invoice[] {
    console.log(`[${this.name}] Scanning for overdue invoices (min ${minDaysOverdue} days)`);
    const invoices = this.tools.getOverdueInvoices(minDaysOverdue);
    console.log(`[${this.name}] Found ${invoices.length} overdue invoices`);
    return invoices;
  }

  getInvoice(invoiceId: string): Invoice | null {
    return this.tools.getInvoice(invoiceId);
  }

  getCustomerInvoices(customerId: string): Invoice[] {
    return this.tools.getInvoicesByCustomer(customerId);
  }

  /**
   * Summarises total outstanding amount across a set of invoices.
   */
  calcTotalOutstanding(invoices: Invoice[]): number {
    return invoices.reduce((sum, inv) => sum + inv.amount, 0);
  }
}

export const AGENT_NAME = 'BillingAgent';
