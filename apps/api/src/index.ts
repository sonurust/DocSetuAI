import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from '@docsetuai/config';
import { tasksRouter } from './routes/tasks.routes';
import { approvalsRouter } from './routes/approvals.routes';
import { agentsRouter } from './routes/agents.routes';
import { activityRouter } from './routes/activity.routes';
import { customersRouter } from './routes/customers.routes';
import { invoicesRouter } from './routes/invoices.routes';
import { streamRouter } from './routes/stream.routes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { apiKeyAuth, logApiKeyStatus } from './middleware/apiKeyAuth';
import { generalRateLimit, taskRunRateLimit, approvalRateLimit } from './middleware/rateLimiter';
import { seedDemoData } from './seed/demoData';
import { startSubscriber } from './pubsub/subscriber';

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);
app.use(generalRateLimit);

// ── Health check (public — no auth, no rate limit) ────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    runtime_mode: config.runtime_mode,
    timestamp: new Date().toISOString(),
  });
});

// ── Auth guard for all /api/* routes ─────────────────────────────────────────
app.use('/api', apiKeyAuth);

// ── SSE stream (no extra rate limit — long-lived connection) ──────────────────
app.use('/api/tasks', streamRouter);

// ── API Routes (with per-route rate limits) ───────────────────────────────────
app.use('/api/tasks', taskRunRateLimit, tasksRouter);
app.use('/api/approvals', approvalRateLimit, approvalsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Startup ───────────────────────────────────────────────────────────────────
async function start() {
  // Seed demo data into in-memory store
  await seedDemoData();

  // Start Pub/Sub subscriber worker (cloud mode only)
  startSubscriber();

  logApiKeyStatus();

  app.listen(config.port, () => {
    console.log(`\n┌─────────────────────────────────────────────┐`);
    console.log(`│  DocSetuAI API                              │`);
    console.log(`│  http://localhost:${config.port}                     │`);
    console.log(`│  Mode: ${config.runtime_mode.padEnd(36)}│`);
    console.log(`│  Gemini: ${config.gemini_model.padEnd(35)}│`);
    console.log(`└─────────────────────────────────────────────┘\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});

