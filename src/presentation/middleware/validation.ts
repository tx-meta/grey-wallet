/**
 * Validation Middleware
 * Handles request validation using express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ErrorResponseBuilder } from '../../shared/utils/error-response';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {


    const errorDetails = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      code: 'VALIDATION_ERROR',
    }));

    const errorResponse = ErrorResponseBuilder.validationError(
      'Validation failed. Please check your input and try again.',
      errorDetails,
      'VALIDATION_ERROR'
    );

    res.status(400).json(errorResponse);
    return;
  }

  next();
}; 