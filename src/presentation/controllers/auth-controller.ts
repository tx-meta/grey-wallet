/**
 * Authentication Controller
 * Handles authentication-related HTTP requests using Supabase Auth
 */

import { Request, Response } from 'express';
import { SignUpUseCase, SignUpRequest } from '../../domain/use_cases/sign-up';
import { SupabaseAuthService } from '../../infrastructure/external_apis/supabase-auth';
import logger from '../../shared/logging';

export class AuthController {
  constructor(
    private signUpUseCase: SignUpUseCase,
    private supabaseAuthService: SupabaseAuthService
  ) {}

  /**
   * POST /api/auth/signup
   * User registration endpoint using Supabase Auth
   */
  async signUp(req: Request, res: Response): Promise<void> {
    try {
      const signUpRequest: SignUpRequest = {
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        country: req.body.country,
        currency: req.body.currency,
      };

      logger.info('Supabase sign up request received', { email: signUpRequest.email });

      const result = await this.signUpUseCase.execute(signUpRequest);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      const { user, addresses, requiresEmailConfirmation } = result.data!;
      
      const responseData = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          country: user.country,
          currency: user.currency,
          phone: user.phone,
          createdAt: user.createdAt,
        },
        addresses: addresses.map(addr => ({
          tokenSymbol: addr.tokenSymbol,
          address: addr.address,
        })),
        requiresEmailConfirmation,
        message: requiresEmailConfirmation 
          ? 'User registered successfully. Please check your email to confirm your account.'
          : 'User registered successfully. Welcome to Grey Wallet!',
      };

      logger.info('User registered successfully with Supabase', { userId: user.id });

      res.status(201).json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      logger.error('Supabase sign up error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/auth/login
   * User login endpoint using Supabase Auth
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      logger.info('Supabase login request', { email });

      const { user, session, error } = await this.supabaseAuthService.signIn(email, password);

      if (error) {
        res.status(401).json({
          success: false,
          message: error,
        });
        return;
      }

      if (!user || !session) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
        return;
      }

      logger.info('User logged in successfully', { userId: user.id });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.user_metadata?.firstName,
            lastName: user.user_metadata?.lastName,
            country: user.user_metadata?.country,
            currency: user.user_metadata?.currency,
            phone: user.user_metadata?.phone,
          },
          session: {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at,
          },
        },
      });
    } catch (error) {
      logger.error('Supabase login error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/auth/logout
   * User logout endpoint using Supabase Auth
   */
  async logout(_req: Request, res: Response): Promise<void> {
    try {
      const { error } = await this.supabaseAuthService.signOut();

      if (error) {
        res.status(400).json({
          success: false,
          message: error,
        });
        return;
      }

      logger.info('User logged out successfully');

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Supabase logout error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/auth/reset-password
   * Password reset endpoint using Supabase Auth
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
        });
        return;
      }

      logger.info('Password reset request', { email });

      const { error } = await this.supabaseAuthService.resetPassword(email);

      if (error) {
        res.status(400).json({
          success: false,
          message: error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully',
      });
    } catch (error) {
      logger.error('Password reset error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user profile using Supabase Auth
   */
  async getCurrentUser(_req: Request, res: Response): Promise<void> {
    try {
      const { user, error } = await this.supabaseAuthService.getCurrentUser();

      if (error) {
        res.status(401).json({
          success: false,
          message: error,
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

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.user_metadata?.firstName,
            lastName: user.user_metadata?.lastName,
            country: user.user_metadata?.country,
            currency: user.user_metadata?.currency,
            phone: user.user_metadata?.phone,
            createdAt: user.created_at,
          },
        },
      });
    } catch (error) {
      logger.error('Get current user error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
} 