const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error format
  let statusCode = err.statusCode || 500;
  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  };

  // Do not expose stack traces in production
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // Handle specific JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse.error.code = 'INVALID_ACCESS_TOKEN';
    errorResponse.error.message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse.error.code = 'INVALID_ACCESS_TOKEN';
    errorResponse.error.message = 'Token expired';
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = { errorHandler };
