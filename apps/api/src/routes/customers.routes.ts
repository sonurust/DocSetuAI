import { Router, type Router as RouterType } from 'express';
import { customerStore } from '../store/customerStore';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { getCustomerHistory, calculateCustomerPriority } from '../tools/customer.tools';

export const customersRouter: RouterType = Router();

// GET /api/customers
customersRouter.get('/', asyncHandler(async (_req, res) => {
  const customers = customerStore.getAllCustomers();
  res.json({ success: true, data: customers, total: customers.length });
}));

// GET /api/customers/:id
customersRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = req.params['id'] ?? '';
  const customer = customerStore.getCustomer(id);
  if (!customer) throw createError('Customer not found', 404);

  const history = getCustomerHistory(customer.id);
  const priority = calculateCustomerPriority(customer.id);
  const invoices = customerStore.getInvoicesByCustomer(customer.id);

  res.json({ success: true, data: { customer, history, priority, invoices } });
}));
