/**
 * Supabase Authentication Service
 * Handles user authentication and management through Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../../../shared/config';
import logger from '../../../shared/logging';

export interface SupabaseUser {
  id: string;
  email: string;
  phone?: string;
  email_confirmed_at?: string;
  user_metadata?: {
    firstName?: string;
    lastName?: string;
    country?: string;
    currency?: string;
    phone?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  currency: string;
}

export class SupabaseAuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
  }

  /**
   * Set authentication token for the current session
   */
  setAuthToken(token: string): void {
    this.supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });
  }

  /**
   * Sign up a new user with Supabase Auth
   */
  async signUp(data: SignUpData): Promise<{ user: SupabaseUser | null; error: string | null; isNewUser: boolean }> {
    try {
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            country: data.country,
            currency: data.currency,
            phone: data.phone,
          },
        },
      });

      if (error) {
        logger.error('Supabase sign up error', { 
          error: error.message, 
          errorCode: error.status,
          errorDetails: error
        });
        
        // Check if this is a duplicate user error
        if (error.message.includes('User already registered')) {
          return { user: null, error: 'User with this email already exists', isNewUser: false };
        }
        
        return { user: null, error: error.message, isNewUser: false };
      }

      if (authData.user) {
        // Check if this is actually a new user by looking at the creation timestamp
        // If the user was created more than 10 seconds ago, it's likely an existing user
        const userCreatedAt = new Date(authData.user.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - userCreatedAt.getTime();
        const isNewUser = timeDiff < 10000; // If created within last 10 seconds, consider it new
        
        if (isNewUser) {
          logger.info('New user signed up successfully with Supabase', { userId: authData.user.id });
        } else {
          logger.warn('Existing user returned during sign up', { userId: authData.user.id });
        }
        
        return { user: authData.user as SupabaseUser, error: null, isNewUser };
      }

      return { user: null, error: 'No user data returned from Supabase', isNewUser: false };
    } catch (error) {
      logger.error('Supabase sign up exception', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { user: null, error: 'Internal server error', isNewUser: false };
    }
  }

  /**
   * Sign in user with email and password
   */
  async signIn(email: string, password: string): Promise<{ user: SupabaseUser | null; session: any; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('Supabase sign in error', { error: error.message });
        return { user: null, session: null, error: error.message };
      }

      logger.info('User signed in successfully', { userId: data.user?.id });
      return { 
        user: data.user as SupabaseUser, 
        session: data.session, 
        error: null 
      };
    } catch (error) {
      logger.error('Supabase sign in exception', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { user: null, session: null, error: 'Internal server error' };
    }
  }

  /**
   * Get current user session
   */
  async getCurrentUser(): Promise<{ user: SupabaseUser | null; error: string | null }> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error) {
        logger.error('Get current user error', { error: error.message });
        return { user: null, error: error.message };
      }

      return { user: user as SupabaseUser, error: null };
    } catch (error) {
      logger.error('Get current user exception', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { user: null, error: 'Internal server error' };
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        logger.error('Sign out error', { error: error.message });
        return { error: error.message };
      }

      logger.info('User signed out successfully');
      return { error: null };
    } catch (error) {
      logger.error('Sign out exception', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { error: 'Internal server error' };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ user: SupabaseUser | null; session: any; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        logger.error('Token refresh error', { error: error.message });
        return { user: null, session: null, error: error.message };
      }

      logger.info('Token refreshed successfully', { userId: data.user?.id });
      return { 
        user: data.user as SupabaseUser, 
        session: data.session, 
        error: null 
      };
    } catch (error) {
      logger.error('Token refresh exception', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { user: null, session: null, error: 'Internal server error' };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${config.server.corsOrigin}/reset-password`,
      });

      if (error) {
        logger.error('Password reset error', { error: error.message });
        return { error: error.message };
      }

      logger.info('Password reset email sent', { email });
      return { error: null };
    } catch (error) {
      logger.error('Password reset exception', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { error: 'Internal server error' };
    }
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata(userId: string, metadata: any): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        data: metadata,
      });

      if (error) {
        logger.error('Update user metadata error', { error: error.message });
        return { error: error.message };
      }

      logger.info('User metadata updated successfully', { userId });
      return { error: null };
    } catch (error) {
      logger.error('Update user metadata exception', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { error: 'Internal server error' };
    }
  }
} 