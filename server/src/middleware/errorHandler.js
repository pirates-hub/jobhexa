import { errorResponse } from '../utils/apiResponse.js';

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.isOperational) {
    return errorResponse(res, err.message, err.statusCode);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return errorResponse(res, messages.join(', '), 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(res, `Duplicate value for ${field}`, 400);
  }

  if (err.name === 'CastError') {
    return errorResponse(res, 'Invalid ID format', 400);
  }

  return errorResponse(res, 'Internal server error', 500);
};

export default errorHandler;
