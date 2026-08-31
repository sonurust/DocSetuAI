import type { Customer, Invoice } from '@docsetuai/types';
import { customerStore } from '../store/customerStore';

export interface CustomerProfile {
  customer: Customer;
  invoices: Invoice[];
  payment_history: PaymentHistorySummary;
  priority_score: number;
}

export interface PaymentHistorySummary {
  total_invoices: number;
  paid_count: number;
  overdue_count: number;
  average_days_late: number;
  total_outstanding: number;
}

export function getCustomer(customerId: string): Customer | null {
  return customerStore.getCustomer(customerId) ?? null;
}

export function getCustomerHistory(customerId: string): PaymentHistorySummary {
  const invoices = customerStore.getInvoicesByCustomer(customerId);
  const paid = invoices.filter((i) => i.status === 'paid');
  const overdue = invoices.filter((i) => i.status === 'overdue');
  const outstanding = overdue.reduce((sum, i) => sum + i.amount, 0);

  return {
    total_invoices: invoices.length,
    paid_count: paid.length,
    overdue_count: overdue.length,
    average_days_late: overdue.length > 0
      ? Math.round(overdue.reduce((s, i) => s + i.days_overdue, 0) / overdue.length)
      : 0,
    total_outstanding: outstanding,
  };
}

export function calculateCustomerPriority(customerId: string): number {
  const customer = customerStore.getCustomer(customerId);
  if (!customer) return 0;

  const history = getCustomerHistory(customerId);
  const invoices = customerStore.getInvoicesByCustomer(customerId);
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');

  let score = 0;

  // Outstanding amount (higher amount = higher priority)
  const totalOverdue = overdueInvoices.reduce((s, i) => s + i.amount, 0);
  score += Math.min(40, (totalOverdue / 10000) * 2);

  // Days overdue (longer overdue = higher priority)
  const maxDays = Math.max(...overdueInvoices.map((i) => i.days_overdue), 0);
  score += Math.min(25, maxDays * 0.8);

  // Risk score from customer profile
  score += customer.risk_score * 0.2;

  // Payment history penalty
  if (history.average_days_late > 0) score += 10;

  return Math.min(100, Math.round(score));
}
