/**
 * Centralized Error Handling Middleware
 * 
 * Catches all errors passed via next(err) and returns structured JSON responses.
 * Handles Mongoose-specific errors (validation, cast, duplicate key) gracefully.
 */

const logger = require('../utils/logger');
const { errorResponse } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Handle Mongoose/MongoDB specific errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const fieldMap = err.keyValue || err.keyPattern || {};
    const field = Object.keys(fieldMap)[0] || 'field';
    message = field === 'rollNumber' || field === 'className'
      ? `Roll number collision detected in destination class. Please select 'Auto Generate Roll Numbers' to assign 1, 2, 3... automatically.`
      : `Duplicate value for field: ${field}`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired! Please log in again.';
  }

  // Log error with context
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (statusCode === 500) {
      logger.error(err.stack);
  }

  return errorResponse(
    res, 
    message, 
    statusCode, 
    (process.env.NODE_ENV === 'development' && statusCode === 500) ? err.stack : errors
  );
};

module.exports = errorHandler;


