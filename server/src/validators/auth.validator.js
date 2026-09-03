const { z } = require('zod');

// We strictly only validate email and password.
// Any extraneous fields like `role`, `status`, `userId` will be stripped or ignored by Zod parsing by default 
// (or if we want to be strict, we can use .strict() but often ignoring is fine. We will use .strict() to prevent weird data).
const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }), // Ensure no extra fields like `role` can be passed to the body, Zod drops them
};

// Refresh schema doesn't necessarily need body validation if the token is exclusively in a cookie,
// but if we were to accept anything else, we'd validate it here.
const refreshSchema = {
  // Empty schema - we only rely on the cookie
  body: z.object({}).strict().optional(),
};

module.exports = {
  loginSchema,
  refreshSchema,
};
