import type { Invoice } from '@docsetuai/types';
import { customerStore } from '../store/customerStore';

export function getOverdueInvoices(minDaysOverdue = 0): Invoice[] {
  return customerStore.getOverdueInvoices(minDaysOverdue);
}

export function getInvoice(invoiceId: string): Invoice | null {
  return customerStore.getInvoice(invoiceId) ?? null;
}

export function getInvoicesByCustomer(customerId: string): Invoice[] {
  return customerStore.getInvoicesByCustomer(customerId);
}
