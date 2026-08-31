import type { Customer, Invoice } from '@docsetuai/types';

class CustomerStore {
  private customers: Map<string, Customer> = new Map();
  private invoices: Map<string, Invoice> = new Map();

  seed(customers: Customer[], invoices: Invoice[]): void {
    this.customers.clear();
    this.invoices.clear();
    customers.forEach((c) => this.customers.set(c.id, c));
    invoices.forEach((i) => this.invoices.set(i.id, i));
  }

  // ── Customers ────────────────────────────────────────────────────────────

  getAllCustomers(): Customer[] {
    return Array.from(this.customers.values());
  }

  getCustomer(id: string): Customer | undefined {
    return this.customers.get(id);
  }

  // ── Invoices ─────────────────────────────────────────────────────────────

  getAllInvoices(): Invoice[] {
    return Array.from(this.invoices.values());
  }

  getInvoice(id: string): Invoice | undefined {
    return this.invoices.get(id);
  }

  getInvoicesByCustomer(customerId: string): Invoice[] {
    return Array.from(this.invoices.values()).filter(
      (i) => i.customer_id === customerId,
    );
  }

  getOverdueInvoices(minDaysOverdue = 0): Invoice[] {
    return Array.from(this.invoices.values())
      .filter((i) => i.status === 'overdue' && i.days_overdue >= minDaysOverdue)
      .sort((a, b) => b.days_overdue - a.days_overdue);
  }

  markInvoicePaid(id: string): Invoice | undefined {
    const invoice = this.invoices.get(id);
    if (invoice) {
      const updated: Invoice = { ...invoice, status: 'paid', days_overdue: 0 };
      this.invoices.set(id, updated);
      return updated;
    }
    return undefined;
  }
}

export const customerStore = new CustomerStore();
