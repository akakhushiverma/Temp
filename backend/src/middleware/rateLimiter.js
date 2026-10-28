'use strict';

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter: 100 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again after 15 minutes.',
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Stricter limiter for repo ingestion (expensive GitHub API calls).
 * 10 requests per 15 minutes per IP.
 */
const ingestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Repo ingestion rate limit exceeded (10 per 15 minutes). Please wait and retry.',
  },
});

module.exports = { apiLimiter, ingestLimiter };
