/**
 * Sign In Use Case
 * Orchestrates user authentication using Supabase Auth
 */

// User entity is used in type definitions but not directly in this file
import { UserRepository } from '../repositories/user-repository';
import { SupabaseAuthService } from '../../infrastructure/external_apis/supabase-auth';
import logger from '../../shared/logging';

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: {
    id: string;
    email: string;
    country?: string;
    currency?: string;
    phone: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    createdAt: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

export interface SignInResult {
  success: boolean;
  data?: SignInResponse;
  error?: string;
}

export class SignInUseCase {
  constructor(
    private supabaseAuthService: SupabaseAuthService,
    private userRepository: UserRepository
  ) {}

  async execute(request: SignInRequest): Promise<SignInResult> {
    try {
      // 1. Validate input
      this.validateSignInRequest(request);

      // 2. Normalize email
      const normalizedEmail = request.email.toLowerCase().trim();

      // 3. Authenticate with Supabase
      const { user: supabaseUser, session, error } = await this.supabaseAuthService.signIn(
        normalizedEmail,
        request.password
      );

      if (error) {
        logger.warn('Sign in failed', { email: normalizedEmail, error });
        return {
          success: false,
          error: this.mapSupabaseError(error),
        };
      }

      if (!supabaseUser || !session) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // 4. Get local user data for additional verification
      const localUser = await this.userRepository.findByEmail(normalizedEmail);
      
      if (!localUser) {
        logger.warn('User authenticated with Supabase but not found in local database', { 
          userId: supabaseUser.id,
          email: normalizedEmail 
        });
        return {
          success: false,
          error: 'User account not properly initialized',
        };
      }

      // 5. Check if user is active
      if (!localUser.isActive) {
        return {
          success: false,
          error: 'Account is deactivated. Please contact support.',
        };
      }

      // 6. Sync email verification status with Supabase
      const supabaseEmailVerified = !!supabaseUser.email_confirmed_at;
      if (localUser.isEmailVerified !== supabaseEmailVerified) {
        logger.info('Syncing email verification status with Supabase', { 
          userId: localUser.id,
          localStatus: localUser.isEmailVerified,
          supabaseStatus: supabaseEmailVerified 
        });
        
        localUser.verifyEmail();
        await this.userRepository.update(localUser);
      }

      // 7. Prepare response
      const responseData: SignInResponse = {
        user: {
          id: localUser.id,
          email: localUser.email,

          ...(localUser.country && { country: localUser.country }),
          ...(localUser.currency && { currency: localUser.currency }),
          phone: localUser.phone,
          isEmailVerified: supabaseEmailVerified, // Use Supabase's status
          isPhoneVerified: localUser.isPhoneVerified,
          createdAt: localUser.createdAt.toISOString(),
        },
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at,
        },
      };

      logger.info('User signed in successfully', { 
        userId: localUser.id,
        email: normalizedEmail 
      });

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      logger.error('Sign in use case error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email: request.email 
      });
      
      return {
        success: false,
        error: 'Internal server error',
      };
    }
  }

  private validateSignInRequest(request: SignInRequest): void {
    if (!request.email || !request.password) {
      throw new Error('Email and password are required');
    }

    if (request.email.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }

    if (request.password.trim().length === 0) {
      throw new Error('Password cannot be empty');
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
      throw new Error('Invalid email format');
    }
  }

  private mapSupabaseError(error: string): string {
    // Map Supabase error messages to user-friendly messages
    const errorMappings: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please verify your email address before signing in',
      'User not found': 'Invalid email or password',
      'Too many requests': 'Too many login attempts. Please try again later',
      'Invalid email or password': 'Invalid email or password',
    };

    return errorMappings[error] || error;
  }
} 