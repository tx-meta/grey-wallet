/**
 * Standardized Error Response Utility
 * Provides consistent error response formats across the application
 */

export interface ErrorDetail {
  field?: string;
  message: string;
  code: string;
}

export interface StandardErrorResponse {
  success: false;
  message: string;
  errors?: ErrorDetail[];
  code: string;
  timestamp: string;
  path?: string;
}

export interface ValidationErrorResponse extends StandardErrorResponse {
  errors: ErrorDetail[];
}

export class ErrorResponseBuilder {
  /**
   * Create a basic error response
   */
  static create(message: string, code: string = 'ERROR'): StandardErrorResponse {
    return {
      success: false,
      message,
      code,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a validation error response
   */
  static validationError(message: string, errors: ErrorDetail[], code?: string): ValidationErrorResponse {
    return {
      success: false,
      message,
      errors,
      code: code || 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a field-specific validation error
   */
  static fieldError(field: string, message: string, code: string = 'FIELD_ERROR'): ErrorDetail {
    return {
      field,
      message,
      code,
    };
  }

  /**
   * Create common error responses
   */
  static badRequest(message: string, errors?: ErrorDetail[]): StandardErrorResponse | ValidationErrorResponse {
    if (errors && errors.length > 0) {
      return this.validationError(message, errors, 'BAD_REQUEST');
    }
    return this.create(message, 'BAD_REQUEST');
  }

  static unauthorized(message: string = 'Authentication required'): StandardErrorResponse {
    return this.create(message, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Access denied'): StandardErrorResponse {
    return this.create(message, 'FORBIDDEN');
  }

  static notFound(message: string = 'Resource not found'): StandardErrorResponse {
    return this.create(message, 'NOT_FOUND');
  }

  static conflict(message: string, errors?: ErrorDetail[]): StandardErrorResponse | ValidationErrorResponse {
    if (errors && errors.length > 0) {
      return this.validationError(message, errors, 'CONFLICT');
    }
    return this.create(message, 'CONFLICT');
  }

  static internalError(message: string = 'Internal server error'): StandardErrorResponse {
    return this.create(message, 'INTERNAL_ERROR');
  }

  static tooManyRequests(message: string = 'Too many requests'): StandardErrorResponse {
    return this.create(message, 'TOO_MANY_REQUESTS');
  }
}

/**
 * Common error messages for user-facing responses
 */
export const UserErrorMessages = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before signing in',
  ACCOUNT_LOCKED: 'Account is temporarily locked due to too many failed attempts',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again',
  
  // Sign up errors
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  PHONE_ALREADY_EXISTS: 'An account with this phone number already exists',
  WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  INVALID_EMAIL: 'Please provide a valid email address',
  INVALID_PHONE: 'Please provide a valid phone number',
  INVALID_COUNTRY: 'Please provide a valid country',
  INVALID_CURRENCY: 'Please provide a valid currency code',
  
  // Validation errors
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_FORMAT: (field: string) => `${field} format is invalid`,
  MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field: string, max: number) => `${field} must be no more than ${max} characters`,
  
  // System errors
  SIGNUP_FAILED: 'Failed to create your account. Please try again.',
  LOGIN_FAILED: 'Failed to sign you in. Please try again.',
  WALLET_CREATION_FAILED: 'Failed to create your wallet. Please contact support.',
  NOTIFICATION_FAILED: 'Account created but we couldn\'t send verification. Please contact support.',
  
  // Rate limiting
  TOO_MANY_ATTEMPTS: 'Too many attempts. Please wait before trying again.',
  OTP_EXPIRED: 'Verification code has expired. Please request a new one.',
  OTP_INVALID: 'Invalid verification code. Please check and try again.',
} as const;

/**
 * Map technical errors to user-friendly messages
 */
export const ErrorMessageMapper = {
  // Supabase errors
  'User already registered': UserErrorMessages.EMAIL_ALREADY_EXISTS,
  'User with this email already exists': UserErrorMessages.EMAIL_ALREADY_EXISTS,
  'Invalid login credentials': UserErrorMessages.INVALID_CREDENTIALS,
  'Email not confirmed': UserErrorMessages.EMAIL_NOT_VERIFIED,
  'Too many requests': UserErrorMessages.TOO_MANY_ATTEMPTS,
  'Signup disabled': 'User registration is currently disabled. Please try again later.',
  'Invalid signup data': 'Please check your registration information and try again.',
  
  // Database errors
  'duplicate key value violates unique constraint': 'This information is already in use',
  'violates not-null constraint': 'Required information is missing',
  'unique constraint': 'This information is already in use',
  'users_phone_key': UserErrorMessages.PHONE_ALREADY_EXISTS,
  'users_email_key': UserErrorMessages.EMAIL_ALREADY_EXISTS,
  
  // Network errors
  'ECONNREFUSED': 'Service temporarily unavailable. Please try again.',
  'ETIMEDOUT': 'Request timed out. Please try again.',
  'ENOTFOUND': 'Service temporarily unavailable. Please try again.',
  
  // Default fallback
  'default': 'Something went wrong. Please try again.',
} as const;

/**
 * Map error to user-friendly message
 */
export function mapErrorToUserMessage(error: string): string {
  const lowerError = error.toLowerCase();
  
  for (const [key, message] of Object.entries(ErrorMessageMapper)) {
    if (lowerError.includes(key.toLowerCase())) {
      return message;
    }
  }
  
  return ErrorMessageMapper.default;
}
