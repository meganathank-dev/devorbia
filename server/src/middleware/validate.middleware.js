const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) schema.body.parse(req.body);
    if (schema.query) schema.query.parse(req.query);
    if (schema.params) schema.params.parse(req.params);
    
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors
        }
      });
    }
    next(error);
  }
};

module.exports = { validate };
