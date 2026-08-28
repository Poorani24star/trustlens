/**
 * 404 Not Found Middleware
 * Handles requests to unknown routes.
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};

/**
 * Global Error Handler Middleware
 * Catches all unhandled server errors and returns a formatted JSON error response.
 */
const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack || err);
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

module.exports = {
  notFound,
  errorHandler
};
