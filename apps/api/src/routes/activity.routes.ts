import { Router, type Router as RouterType } from 'express';
import { taskStore } from '../store/taskStore';
import { asyncHandler } from '../middleware/errorHandler';

export const activityRouter: RouterType = Router();

// GET /api/activity
activityRouter.get('/', asyncHandler(async (req, res) => {
  const limit = parseInt((req.query['limit'] as string | undefined) ?? '100', 10);
  const taskId = req.query['task_id'] as string | undefined;

  const activities = taskId
    ? taskStore.getActivitiesByTask(taskId)
    : taskStore.getAllActivities(limit);

  res.json({ success: true, data: activities, total: activities.length });
}));
