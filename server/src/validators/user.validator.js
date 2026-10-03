import { body } from 'express-validator';

export const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('qualification.highest')
    .optional()
    .isIn(['10th', '12th', 'graduate', 'postgraduate', 'phd', 'diploma', 'engineering', 'medical'])
    .withMessage('Invalid qualification level'),
  body('category')
    .optional()
    .isIn(['general', 'obc', 'sc', 'st', 'ews', 'pwd', 'ex-serviceman'])
    .withMessage('Invalid category'),
];
