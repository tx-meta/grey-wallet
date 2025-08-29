/**
 * Test SMS Routes
 * Development/testing routes for SMS functionality (no authentication required)
 * WARNING: Only use in development environment
 */

import { Router } from 'express';
import { CelcomSMSService } from '../../infrastructure/services/celcom-sms-service';
import logger from '../../shared/logging';

export function createTestSMSRoutes(): Router {
  const router = Router();
  
  // Only enable in development environment
  if (process.env['NODE_ENV'] !== 'development') {
    logger.warn('Test SMS routes are disabled in non-development environment');
    return router;
  }

  const smsService = new CelcomSMSService();

  // GET /api/test/sms/health - Test SMS service health
  router.get('/health', async (_req, res) => {
    try {
      const isHealthy = await smsService.isHealthy();
      res.json({
        success: true,
        service: 'SMS',
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('SMS health check failed', { error });
      res.status(500).json({
        success: false,
        error: 'SMS health check failed',
      });
    }
  });

  // POST /api/test/sms/send-otp - Test SMS OTP sending (no auth required)
  router.post('/send-otp', async (req, res) => {
    try {
      const { phone, otp, expiresIn = 300 } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({
          success: false,
          error: 'Phone and OTP are required',
        });
      }

      logger.info('Test SMS OTP request', { phone, otp, expiresIn });

      const result = await smsService.sendSMSOTP(phone, otp, expiresIn);

      if (result.success) {
        return res.json({
          success: true,
          message: 'Test SMS OTP sent successfully',
          data: {
            phone,
            messageId: result.messageId,
            expiresIn,
          },
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Test SMS OTP failed', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to send test SMS OTP',
      });
    }
  });

  // GET /api/test/sms/balance - Test account balance check
  router.get('/balance', async (_req, res) => {
    try {
      const balance = await smsService.getAccountBalance();
      
      return res.json({
        success: true,
        data: {
          balance,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Test SMS balance check failed', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to check SMS account balance',
      });
    }
  });

  // POST /api/test/sms/test-message - Test sending a custom message
  router.post('/test-message', async (req, res) => {
    try {
      const { phone, message } = req.body;

      if (!phone || !message) {
        return res.status(400).json({
          success: false,
          error: 'Phone and message are required',
        });
      }

      logger.info('Test SMS message request', { phone, messageLength: message.length });

      // Use the private sendSMS method for testing
      const result = await (smsService as any).sendSMS(phone, message);

      if (result.success) {
        return res.json({
          success: true,
          message: 'Test SMS sent successfully',
          data: {
            phone,
            messageId: result.messageId,
            messageLength: message.length,
          },
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Test SMS message failed', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to send test SMS message',
      });
    }
  });

  return router;
}
