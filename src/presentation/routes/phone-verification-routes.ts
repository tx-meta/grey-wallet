/**
 * Phone Verification Routes
 * Defines phone OTP verification endpoints
 */

import { Router } from 'express';
import { container } from '../../infrastructure/container';

// Get phone verification controller and auth middleware from dependency injection container
const phoneVerificationController = container.getPhoneVerificationController();
const authMiddleware = container.getAuthMiddleware();

const router = Router();

// Apply authentication middleware to all phone verification routes
router.use(authMiddleware.authenticate);

// POST /api/phone/send-otp - Send OTP to user's phone
router.post('/send-otp', phoneVerificationController.sendOTP.bind(phoneVerificationController));

// POST /api/phone/verify-otp - Verify OTP and mark phone as verified
router.post('/verify-otp', phoneVerificationController.verifyOTP.bind(phoneVerificationController));

export default router; 