/**
 * Authentication Middleware
 * Verifies user authentication using Supabase Auth
 */

import { Request, Response, NextFunction } from 'express';
import { SupabaseAuthService } from '../../infrastructure/external_apis/supabase-auth';
import logger from '../../shared/logging';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        country?: string;
        currency?: string;
        phone?: string;
      };
    }
  }
}

export class AuthMiddleware {
  constructor(private supabaseAuthService: SupabaseAuthService) {}

  /**
   * Middleware to authenticate requests using Bearer token
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Authorization header with Bearer token is required',
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Set the token in Supabase client for this request
      this.supabaseAuthService.setAuthToken(token);

      // Get current user
      const { user, error } = await this.supabaseAuthService.getCurrentUser();

      if (error) {
        logger.warn('Authentication failed', { error });
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
        });
        return;
      }

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Attach user to request object
      const userData: typeof req.user = {
        id: user.id,
        email: user.email,
      };


      if (user.user_metadata?.country) userData.country = user.user_metadata.country;
      if (user.user_metadata?.currency) userData.currency = user.user_metadata.currency;
      if (user.user_metadata?.phone) userData.phone = user.user_metadata.phone;

      req.user = userData;

      logger.debug('User authenticated', { userId: user.id, email: user.email });
      next();
    } catch (error) {
      logger.error('Authentication middleware error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  /**
   * Optional authentication middleware - doesn't fail if no token provided
   */
  optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue without authentication
        next();
        return;
      }

      const token = authHeader.substring(7);

      // Set the token in Supabase client for this request
      this.supabaseAuthService.setAuthToken(token);

      // Get current user
      const { user, error } = await this.supabaseAuthService.getCurrentUser();

      if (!error && user) {
        // Attach user to request object if authentication successful
        const userData: typeof req.user = {
          id: user.id,
          email: user.email,
        };


        if (user.user_metadata?.country) userData.country = user.user_metadata.country;
        if (user.user_metadata?.currency) userData.currency = user.user_metadata.currency;
        if (user.user_metadata?.phone) userData.phone = user.user_metadata.phone;

        req.user = userData;

        logger.debug('User authenticated (optional)', { userId: user.id, email: user.email });
      }

      next();
    } catch (error) {
      logger.error('Optional authentication middleware error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Continue without authentication on error
      next();
    }
  };
} 