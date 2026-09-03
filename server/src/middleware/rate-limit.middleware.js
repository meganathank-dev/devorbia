const rateLimit = require('express-rate-limit');

// Rate limiter specifically for authentication endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'test' ? 100 : 15), // Limit each IP
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS', // Custom code or use existing pattern
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
      }
    });
  }
});

module.exports = {
  authLimiter,
};
