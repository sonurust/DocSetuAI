/**
 * API Key Authentication Middleware
 *
 * Protects all /api/* routes with a shared API key.
 * The key is set via the API_KEY environment variable.
 *
 * In demo mode (RUNTIME_MODE=demo), auth is skipped so devs can run locally
 * without configuration. In cloud mode, the key is required.
 *
 * Header format:
 *   Authorization: Bearer <api_key>
 *   OR
 *   X-API-Key: <api_key>
 *
 * To generate a key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import type { Request, Response, NextFunction } from 'express';
import { config } from '@docsetuai/config';

const API_KEY = process.env['API_KEY'] ?? '';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  // Skip auth in demo mode for local development convenience
  if (config.runtime_mode === 'demo') {
    next();
    return;
  }

  // Skip auth if no API_KEY is configured (graceful — warns on startup)
  if (!API_KEY) {
    next();
    return;
  }

  // Extract key from header
  const authHeader = req.headers['authorization'];
  const xApiKey = req.headers['x-api-key'];

  let providedKey: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7).trim();
  } else if (typeof xApiKey === 'string') {
    providedKey = xApiKey.trim();
  }

  if (!providedKey) {
    res.status(401).json({
      success: false,
      error: 'Missing API key. Use Authorization: Bearer <key> or X-API-Key: <key>',
      status: 401,
    });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const valid = timingSafeEqual(providedKey, API_KEY);

  if (!valid) {
    res.status(403).json({
      success: false,
      error: 'Invalid API key',
      status: 403,
    });
    return;
  }

  next();
}

/**
 * Simple constant-time string comparison.
 * Prevents timing side-channel attacks on the API key comparison.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return result === 0;
}

export function logApiKeyStatus(): void {
  if (config.runtime_mode === 'demo') {
    console.log('[Auth] Demo mode — API key auth disabled');
  } else if (!API_KEY) {
    console.warn('[Auth] ⚠️  API_KEY not set — all /api/* routes are unprotected!');
  } else {
    console.log('[Auth] ✅ API key auth enabled (cloud mode)');
  }
}
