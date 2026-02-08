import rateLimit from 'express-rate-limit';
import { env } from '../config';

/** Global rate limiter applied to all routes. */
export const globalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Stricter rate limiter for authentication endpoints. */
export const authLimiter = rateLimit({
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMaxRequests,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate limiter for NASA API proxy endpoints. */
export const nasaApiLimiter = rateLimit({
  windowMs: env.rateLimit.nasaWindowMs,
  max: env.rateLimit.nasaMaxRequests,
  message: {
    success: false,
    message: 'NASA API rate limit exceeded, please wait',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
