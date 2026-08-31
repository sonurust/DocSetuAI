import { buildSeedData } from '../seed/demoData';
import { customerStore } from '../store/customerStore';
import {
  getOverdueInvoices,
  getInvoice,
} from '../tools/billing.tools';
import {
  getCustomer,
  getCustomerHistory,
  calculateCustomerPriority,
} from '../tools/customer.tools';

beforeAll(() => {
  const { customers, invoices } = buildSeedData();
  customerStore.seed(customers, invoices);
});

describe('Billing Tools', () => {
  it('returns overdue invoices with correct status', () => {
    const invoices = getOverdueInvoices();
    expect(invoices.length).toBeGreaterThan(0);
    for (const inv of invoices) {
      expect(inv.status).toBe('overdue');
    }
  });

  it('returns exactly 20 overdue invoices from seed data', () => {
    const invoices = getOverdueInvoices();
    expect(invoices).toHaveLength(20);
  });

  it('filters by min days overdue', () => {
    const invoices7 = getOverdueInvoices(7);
    const invoices15 = getOverdueInvoices(15);
    expect(invoices7.length).toBeGreaterThanOrEqual(invoices15.length);
    for (const inv of invoices15) {
      expect(inv.days_overdue).toBeGreaterThanOrEqual(15);
    }
  });

  it('sorts overdue invoices by days_overdue descending', () => {
    const invoices = getOverdueInvoices();
    for (let i = 0; i < invoices.length - 1; i++) {
      const invA = invoices[i]!;
      const invB = invoices[i + 1]!;
      expect(invA.days_overdue).toBeGreaterThanOrEqual(invB.days_overdue);
    }
  });

  it('returns a valid invoice by id', () => {
    const overdue = getOverdueInvoices();
    const first = overdue[0]!;
    const found = getInvoice(first.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(first.id);
    expect(found?.amount).toBe(first.amount);
  });

  it('returns null for non-existent invoice', () => {
    expect(getInvoice('INV-INVALID')).toBeNull();
  });
});

describe('Customer Tools', () => {
  it('returns a customer by id', () => {
    const overdue = getOverdueInvoices();
    const first = overdue[0]!;
    const customer = getCustomer(first.customer_id);
    expect(customer).not.toBeNull();
    expect(customer?.id).toBe(first.customer_id);
    expect(customer?.email).toContain('@');
  });

  it('returns null for unknown customer', () => {
    expect(getCustomer('CUS-INVALID')).toBeNull();
  });

  it('calculates correct payment history', () => {
    const overdue = getOverdueInvoices();
    const first = overdue[0]!;
    const history = getCustomerHistory(first.customer_id);
    expect(history.overdue_count).toBeGreaterThan(0);
    expect(history.total_outstanding).toBeGreaterThan(0);
    expect(history.total_invoices).toBeGreaterThanOrEqual(history.overdue_count);
  });

  it('returns priority score between 0 and 100', () => {
    const customers = customerStore.getAllCustomers();
    for (const customer of customers.slice(0, 10)) {
      const priority = calculateCustomerPriority(customer.id);
      expect(priority).toBeGreaterThanOrEqual(0);
      expect(priority).toBeLessThanOrEqual(100);
    }
  });

  it('returns 0 priority for unknown customer', () => {
    expect(calculateCustomerPriority('CUS-INVALID')).toBe(0);
  });
});

describe('Invoice Selection', () => {
  it('selects invoices with more than 7 days overdue', () => {
    const invoices = getOverdueInvoices(7);
    for (const inv of invoices) {
      expect(inv.days_overdue).toBeGreaterThanOrEqual(7);
    }
  });

  it('all overdue invoices have required fields', () => {
    const invoices = getOverdueInvoices();
    for (const inv of invoices) {
      expect(inv.id).toBeTruthy();
      expect(inv.customer_id).toBeTruthy();
      expect(inv.amount).toBeGreaterThan(0);
      expect(inv.currency).toBe('INR');
      expect(inv.due_date).toBeTruthy();
    }
  });
});
