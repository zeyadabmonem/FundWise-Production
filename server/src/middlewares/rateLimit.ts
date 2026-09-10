import rateLimit from "express-rate-limit";

export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many AI requests. Please wait a few minutes before trying again.",
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again in a few minutes.",
  },
});

export const alternativesRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 product searches per 15 minutes per IP
  // Searches are authenticated, so quotas follow a person rather than a
  // shared mobile carrier/NAT address. The fallback keeps this middleware
  // safe if it is ever mounted before authentication.
  keyGenerator: (req) => String(req.user?.id ?? req.ip ?? 'anonymous'),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many product searches. Please wait a few minutes before trying again.",
  },
});
