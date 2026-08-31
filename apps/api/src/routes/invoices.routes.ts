import { Router, type Router as RouterType } from 'express';
import { customerStore } from '../store/customerStore';
import { asyncHandler, createError } from '../middleware/errorHandler';

export const invoicesRouter: RouterType = Router();

// GET /api/invoices
invoicesRouter.get('/', asyncHandler(async (req, res) => {
  const status = req.query['status'] as string | undefined;
  let invoices = customerStore.getAllInvoices();
  if (status) invoices = invoices.filter((i) => i.status === status);
  res.json({ success: true, data: invoices, total: invoices.length });
}));

// GET /api/invoices/overdue
invoicesRouter.get('/overdue', asyncHandler(async (req, res) => {
  const minDays = parseInt((req.query['min_days'] as string | undefined) ?? '0', 10);
  const invoices = customerStore.getOverdueInvoices(minDays);
  res.json({ success: true, data: invoices, total: invoices.length });
}));

// GET /api/invoices/:id
invoicesRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = req.params['id'] ?? '';
  const invoice = customerStore.getInvoice(id);
  if (!invoice) throw createError('Invoice not found', 404);
  const customer = customerStore.getCustomer(invoice.customer_id);
  res.json({ success: true, data: { invoice, customer } });
}));
