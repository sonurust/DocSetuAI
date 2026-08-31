import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { taskStore } from '../store/taskStore';
import { runTask } from '../agents/orchestrator.agent';
import { asyncHandler, createError } from '../middleware/errorHandler';
import type { ApiResponse } from '@docsetuai/types';

export const tasksRouter: RouterType = Router();

const createTaskSchema = z.object({
  goal: z.string().min(10, 'Goal must be at least 10 characters').max(1000),
  created_by: z.string().optional().default('user'),
});

// GET /api/tasks
tasksRouter.get('/', asyncHandler(async (_req, res) => {
  const tasks = taskStore.getAllTasks();
  const stats = taskStore.getStats();
  res.json({ success: true, data: tasks, stats });
}));

// GET /api/tasks/stats
tasksRouter.get('/stats', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: taskStore.getStats() });
}));

// GET /api/tasks/:id
tasksRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = req.params['id'] ?? '';
  const task = taskStore.getTask(id);
  if (!task) throw createError('Task not found', 404);

  const executions = taskStore.getExecutions(id);
  const approvals = taskStore.getApprovalsByTask(id);
  const activities = taskStore.getActivitiesByTask(id);

  res.json({ success: true, data: { task, executions, approvals, activities } });
}));

// POST /api/tasks
tasksRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError(parsed.error.errors.map((e) => e.message).join(', '), 400);
  }

  const task = taskStore.createTask(parsed.data.goal, parsed.data.created_by);
  res.status(201).json({ success: true, data: task } satisfies ApiResponse<typeof task>);
}));

// POST /api/tasks/:id/run
tasksRouter.post('/:id/run', asyncHandler(async (req, res) => {
  const id = req.params['id'] ?? '';
  const task = taskStore.getTask(id);
  if (!task) throw createError('Task not found', 404);
  if (task.status !== 'pending') {
    throw createError(`Task is already ${task.status}`, 400);
  }

  // Run in background — do not await
  runTask(task).catch((err) => console.error(`[Route] Task ${task.id} run error:`, err));

  res.json({ success: true, data: task, message: 'Task execution started' });
}));

// POST /api/tasks/:id/cancel
tasksRouter.post('/:id/cancel', asyncHandler(async (req, res) => {
  const id = req.params['id'] ?? '';
  const task = taskStore.getTask(id);
  if (!task) throw createError('Task not found', 404);
  if (['completed', 'failed', 'cancelled'].includes(task.status)) {
    throw createError('Task cannot be cancelled in its current state', 400);
  }
  const updated = taskStore.updateTaskStatus(id, 'cancelled');
  res.json({ success: true, data: updated });
}));
