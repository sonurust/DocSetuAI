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
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { seedDemoData } from './seed/demoData';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    runtime_mode: config.runtime_mode,
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/tasks', tasksRouter);
app.use('/api/approvals', approvalsRouter);
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

  app.listen(config.port, () => {
    console.log(`\n┌─────────────────────────────────────────────┐`);
    console.log(`│  DocSetuAI API                               │`);
    console.log(`│  http://localhost:${config.port}                       │`);
    console.log(`│  Mode: ${config.runtime_mode.padEnd(36)}│`);
    console.log(`└─────────────────────────────────────────────┘\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});
