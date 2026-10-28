'use strict';

/**
 * Global error handler middleware.
 * Maps common error types to appropriate HTTP status codes.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log error details server-side
  console.error(`[ErrorHandler] ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err.message || err);

  // Default values
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // CORS error
  if (message.includes('CORS policy')) {
    status = 403;
  }

  // GitHub API rate limit
  if (err.response && err.response.status === 403 && err.response.headers['x-ratelimit-remaining'] === '0') {
    status = 429;
    message = 'GitHub API rate limit exceeded. Provide a GITHUB_TOKEN or wait and retry.';
  }

  // GitHub API not found
  if (err.response && err.response.status === 404) {
    status = 404;
    message = 'GitHub repository or resource not found.';
  }

  // GitHub API unauthorized
  if (err.response && err.response.status === 401) {
    status = 401;
    message = 'GitHub API authentication failed. Check your GITHUB_TOKEN.';
  }

  // Validation errors (manually thrown with status 400)
  if (status === 400) {
    // keep message as-is
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON in request body.';
  }

  const body = {
    error: httpStatusText(status),
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(status).json(body);
}

function httpStatusText(code) {
  const map = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return map[code] || 'Error';
}

module.exports = errorHandler;
