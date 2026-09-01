import { Router, type Router as RouterType } from 'express';
import { aiLogStore } from '../store/aiLogStore';

export const aiLogsRouter: RouterType = Router();

/**
 * GET /api/logs/ai
 * Returns recent Gemini AI request and response logs
 */
aiLogsRouter.get('/', (req, res) => {
  const taskId = req.query.task_id as string | undefined;
  const limit = Math.min(parseInt((req.query.limit as string) || '100', 10), 300);
  const logs = aiLogStore.getLogs(taskId, limit);

  res.json({
    success: true,
    data: logs,
    total: logs.length,
  });
});

/**
 * POST /api/logs/ai/clear
 * Clears recorded logs
 */
aiLogsRouter.post('/clear', (_req, res) => {
  aiLogStore.clear();
  res.json({ success: true, message: 'AI logs cleared' });
});
