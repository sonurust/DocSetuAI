/**
 * Rate Limiting Middleware
 *
 * Protects the API from abuse and runaway loops.
 * Uses express-rate-limit with in-memory store (sufficient for Cloud Run
 * single-instance; for multi-instance, switch the store to Redis).
 *
 * Limits:
 *   - General API:  100 req / 15 min  per IP
 *   - Task run:      10 req / 15 min  per IP  (prevents task flooding)
 *   - Approval ops: 200 req / 15 min  per IP  (human interaction is bursty)
 */

import rateLimit from 'express-rate-limit';

const windowMs = 15 * 60 * 1000; // 15 minutes

// General API rate limit
export const generalRateLimit = rateLimit({
  windowMs,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again after 15 minutes.',
    status: 429,
  },
  skip: (req) => req.path === '/health', // never throttle health checks
});

// Task creation and run endpoints
export const taskRunRateLimit = rateLimit({
  windowMs,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many task executions. Maximum 10 per 15 minutes per IP.',
    status: 429,
  },
});

// Approval interactions (humans clicking approve/reject)
export const approvalRateLimit = rateLimit({
  windowMs,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many approval requests.',
    status: 429,
  },
});
