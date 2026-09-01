/**
 * Server-Sent Events (SSE) stream endpoint
 *
 * GET /api/tasks/:id/stream
 *
 * Pushes real-time task execution updates to the browser without polling.
 * The client receives events as they happen during the orchestrator pipeline.
 *
 * Event types:
 *   - connected          → handshake
 *   - task_update        → task status change
 *   - execution_update   → agent execution record added/updated
 *   - activity           → new activity log entry
 *   - approval_requested → approval needed
 *   - complete           → task finished (signals client to close)
 */

import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { taskStore } from '../store/taskStore';
import { aiLogStore } from '../store/aiLogStore';
import { asyncHandler, createError } from '../middleware/errorHandler';

export const streamRouter: RouterType = Router();

// Map of taskId → set of active SSE response connections
const connections: Map<string, Set<Response>> = new Map();

/**
 * Register an SSE connection for a task.
 * Called internally by the orchestrator to push events.
 */
export function broadcastTaskUpdate(taskId: string, event: string, data: unknown): void {
  const clients = connections.get(taskId);
  if (!clients || clients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((res) => {
    try {
      res.write(payload);
    } catch {
      // Client disconnected — remove on next cleanup
    }
  });
}

// ── Auto-subscribe to taskStore EventEmitter events ─────────────────────────
taskStore.on('task_update', ({ taskId, task }) => {
  broadcastTaskUpdate(taskId, 'task_update', {
    task,
    executions: taskStore.getExecutions(taskId),
    approvals: taskStore.getApprovalsByTask(taskId),
    activities: taskStore.getActivitiesByTask(taskId),
  });
  if (['completed', 'failed', 'cancelled'].includes(task.status)) {
    broadcastTaskUpdate(taskId, 'complete', { status: task.status });
  }
});

taskStore.on('execution_update', ({ taskId, execution, executions }) => {
  broadcastTaskUpdate(taskId, 'execution_update', { execution, executions });
});

taskStore.on('approval_update', ({ taskId, approval, approvals }) => {
  broadcastTaskUpdate(taskId, 'approval_update', { approval, approvals });
});

taskStore.on('activity', ({ taskId, activity, activities }) => {
  broadcastTaskUpdate(taskId, 'activity', { activity, activities });
});

// Broadcast AI log telemetry to task stream or all connected clients
aiLogStore.on('ai_log', (logEntry) => {
  if (logEntry.task_id) {
    broadcastTaskUpdate(logEntry.task_id, 'ai_log', logEntry);
  } else {
    // Broadcast to all active task streams
    connections.forEach((clients) => {
      const payload = `event: ai_log\ndata: ${JSON.stringify(logEntry)}\n\n`;
      clients.forEach((res) => {
        try {
          res.write(payload);
        } catch {}
      });
    });
  }
});

// GET /api/tasks/:id/stream
streamRouter.get(
  '/:id/stream',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] ?? '';
    const task = taskStore.getTask(id);
    if (!task) throw createError('Task not found', 404);

    // ── SSE headers ─────────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering
    res.flushHeaders();

    // Register this connection
    if (!connections.has(id)) connections.set(id, new Set());
    connections.get(id)!.add(res);

    // Send initial state immediately
    const snapshot = {
      task,
      executions: taskStore.getExecutions(id),
      approvals: taskStore.getApprovalsByTask(id),
      activities: taskStore.getActivitiesByTask(id),
    };
    res.write(`event: connected\ndata: ${JSON.stringify(snapshot)}\n\n`);

    // Keep-alive ping every 25s (prevents proxy/load-balancer timeout)
    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 25000);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      connections.get(id)?.delete(res);
      if (connections.get(id)?.size === 0) connections.delete(id);
    });

    // If task is already in a terminal state, send complete and close
    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      res.write(`event: complete\ndata: ${JSON.stringify({ status: task.status })}\n\n`);
      res.end();
    }
  }),
);
