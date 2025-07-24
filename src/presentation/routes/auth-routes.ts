/**
 * Authentication Routes
 * Defines authentication-related API endpoints
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { container } from '../../infrastructure/container';

// Get controller from dependency injection container
const authController = container.getAuthController();

const router = Router();

// Validation rules
const signUpValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .isLength({ min: 2, max: 50 })
    .trim()
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .isLength({ min: 2, max: 50 })
    .trim()
    .withMessage('Last name must be between 2 and 50 characters'),
  body('country')
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('Country must be between 2 and 100 characters'),
  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'KES', 'NGN', 'GHS', 'UGX', 'TZS'])
    .withMessage('Please provide a valid currency code'),
];

const verificationValidation = [
  body('userId')
    .isUUID()
    .withMessage('Please provide a valid user ID'),
  body('token')
    .isLength({ min: 6 })
    .withMessage('Token must be at least 6 characters long'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Routes
router.post('/signup', signUpValidation, validateRequest, authController.signUp.bind(authController));

router.post('/verify-email', verificationValidation, validateRequest, authController.verifyEmail.bind(authController));

router.post('/verify-sms', verificationValidation, validateRequest, authController.verifySMS.bind(authController));

router.post('/login', loginValidation, validateRequest, authController.login.bind(authController));

export default router; 