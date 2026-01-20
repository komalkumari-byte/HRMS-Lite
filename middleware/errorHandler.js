/**
 * Centralized error handling middleware
 * Provides consistent error responses across all API endpoints
 */

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Database constraint errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry',
        message: 'A record with this information already exists',
        details: err.message
      });
    }
    if (err.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reference',
        message: 'Referenced record does not exist',
        details: err.message
      });
    }
  }

  // Validation errors
  if (err.name === 'ValidationError' || err.name === 'BadRequestError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message || 'Invalid input data',
      details: err.details || []
    });
  }

  // Authentication errors
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: err.message || 'Authentication required'
    });
  }

  // Not found errors
  if (err.name === 'NotFoundError' || err.status === 404) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: err.message || 'Resource not found'
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

/**
 * Custom error class for better error handling
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}
