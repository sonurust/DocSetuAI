/**
 * Rate Limiting Middleware
 *
 * Protects the API from abuse and runaway loops while allowing smooth
 * client-side polling, live streaming, and rapid interaction.
 *
 * Limits:
 *   - General API:   1000 req / 15 min  per IP
 *   - Task write:     300 req / 15 min  per IP  (POST /run, POST /tasks)
 *   - Approvals:      600 req / 15 min  per IP
 *   - GET requests:  Always permitted (no throttling on dashboard reads/polling)
 */

import rateLimit from 'express-rate-limit';

const windowMs = 15 * 60 * 1000; // 15 minutes

// General API rate limit (1000 req/15min)
export const generalRateLimit = rateLimit({
  windowMs,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again after 15 minutes.',
    status: 429,
  },
  skip: (req) => req.path === '/health' || req.method === 'GET',
});

// Task creation and run endpoints (300 req/15min, skips GET polling)
export const taskRunRateLimit = rateLimit({
  windowMs,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many task executions. Maximum 300 per 15 minutes per IP.',
    status: 429,
  },
  skip: (req) => req.method === 'GET', // never throttle GET /api/tasks or GET /api/tasks/:id
});

// Approval interactions (600 req/15min, skips GET)
export const approvalRateLimit = rateLimit({
  windowMs,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many approval requests.',
    status: 429,
  },
  skip: (req) => req.method === 'GET',
});
