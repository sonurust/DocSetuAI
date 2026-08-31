import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { taskStore } from '../store/taskStore';
import { asyncHandler, createError } from '../middleware/errorHandler';

export const approvalsRouter: RouterType = Router();

const approveSchema = z.object({ approved_by: z.string().optional().default('user') });
const rejectSchema = z.object({
  approved_by: z.string().optional().default('user'),
  reason: z.string().optional(),
});

// GET /api/approvals
approvalsRouter.get('/', asyncHandler(async (req, res) => {
  const status = req.query['status'] as string | undefined;
  let approvals = taskStore.getAllApprovals();
  if (status) approvals = approvals.filter((a) => a.status === status);
  res.json({ success: true, data: approvals });
}));

// GET /api/approvals/:id
approvalsRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = req.params['id'] ?? '';
  const approval = taskStore.getApproval(id);
  if (!approval) throw createError('Approval not found', 404);
  res.json({ success: true, data: approval });
}));

// POST /api/approvals/:id/approve
approvalsRouter.post('/:id/approve', asyncHandler(async (req, res) => {
  const id = req.params['id'] ?? '';
  const approval = taskStore.getApproval(id);
  if (!approval) throw createError('Approval not found', 404);
  if (approval.status !== 'pending') throw createError('Approval already resolved', 400);

  const parsed = approveSchema.safeParse(req.body);
  const approvedBy = parsed.success ? parsed.data.approved_by : 'user';
  const updated = taskStore.updateApprovalStatus(id, 'approved', approvedBy);

  taskStore.addActivity({
    id: Math.random().toString(36).slice(2),
    task_id: approval.task_id,
    type: 'approval_received',
    description: `Message approved for ${approval.payload.customer.company}`,
    metadata: { approval_id: approval.id, approved_by: approvedBy },
    created_at: new Date().toISOString(),
  });

  res.json({ success: true, data: updated });
}));

// POST /api/approvals/:id/reject
approvalsRouter.post('/:id/reject', asyncHandler(async (req, res) => {
  const id = req.params['id'] ?? '';
  const approval = taskStore.getApproval(id);
  if (!approval) throw createError('Approval not found', 404);
  if (approval.status !== 'pending') throw createError('Approval already resolved', 400);

  const parsed = rejectSchema.safeParse(req.body);
  const approvedBy = parsed.success ? parsed.data.approved_by : 'user';
  const reason = parsed.success ? parsed.data.reason : undefined;
  const updated = taskStore.updateApprovalStatus(id, 'rejected', approvedBy, reason);

  taskStore.addActivity({
    id: Math.random().toString(36).slice(2),
    task_id: approval.task_id,
    type: 'approval_received',
    description: `Message rejected for ${approval.payload.customer.company}${reason ? `: ${reason}` : ''}`,
    metadata: { approval_id: approval.id, rejected_by: approvedBy },
    created_at: new Date().toISOString(),
  });

  res.json({ success: true, data: updated });
}));

// POST /api/approvals/approve-all  (batch approve for demo)
approvalsRouter.post('/approve-all', asyncHandler(async (req, res) => {
  const parsed = approveSchema.safeParse(req.body);
  const approvedBy = parsed.success ? parsed.data.approved_by : 'user';
  const pending = taskStore.getPendingApprovals();
  const updated = pending.map((a) => taskStore.updateApprovalStatus(a.id, 'approved', approvedBy));
  res.json({ success: true, data: updated, count: updated.length });
}));
