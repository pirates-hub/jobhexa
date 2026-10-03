import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/apiResponse.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg);
    return errorResponse(res, messages.join(', '), 400);
  }
  next();
};

export default validate;
