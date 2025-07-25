/**
 * Sign Up Use Case
 * Orchestrates user registration using Supabase Auth
 */

import { Wallet } from '../entities/wallet';
import { SupportedToken } from '../entities/supported-token';
import { WalletRepository } from '../repositories/wallet-repository';
import { TokenRepository } from '../repositories/token-repository';
import { VaultService } from '../../application/interfaces/vault-service';
import { NotificationService } from '../../application/interfaces/notification-service';
import { SupabaseAuthService, SignUpData } from '../../infrastructure/external_apis/supabase-auth';

export interface SignUpRequest {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  currency: string;
}

export interface SignUpResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    country: string;
    currency: string;
    phone: string;
    createdAt: string;
  };
  wallet: Wallet;
  requiresEmailConfirmation: boolean;
}

export interface SignUpResult {
  success: boolean;
  data?: SignUpResponse;
  error?: string;
}

export class SignUpUseCase {
  constructor(
    private supabaseAuthService: SupabaseAuthService,
    private walletRepository: WalletRepository,
    private tokenRepository: TokenRepository,
    private vaultService: VaultService,
    private notificationService: NotificationService
  ) {}

  async execute(request: SignUpRequest): Promise<SignUpResult> {
    try {
      // 1. Validate input
      this.validateSignUpRequest(request);

      // 2. Sign up user with Supabase Auth
      const signUpData: SignUpData = {
        email: request.email.toLowerCase().trim(),
        phone: request.phone.trim(),
        password: request.password,
        firstName: request.firstName.trim(),
        lastName: request.lastName.trim(),
        country: request.country.trim(),
        currency: request.currency.toUpperCase().trim(),
      };

      const { user: supabaseUser, error: authError, isNewUser } = await this.supabaseAuthService.signUp(signUpData);

      if (authError) {
        return {
          success: false,
          error: authError,
        };
      }

      // Check if this is an existing user
      if (!isNewUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      if (!supabaseUser) {
        return {
          success: false,
          error: 'Failed to create user account',
        };
      }

      // 3. Get supported tokens
      const supportedTokens = await this.tokenRepository.findActiveTokens();

      // 4. Create wallet and addresses for each token
      const wallet = await this.createWalletWithAddresses(supabaseUser.id, supportedTokens);

      // 5. Send welcome notifications
      await this.sendWelcomeNotifications(supabaseUser, signUpData);

      // 6. Prepare response
      const responseData: SignUpResponse = {
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          firstName: signUpData.firstName,
          lastName: signUpData.lastName,
          country: signUpData.country,
          currency: signUpData.currency,
          phone: signUpData.phone,
          createdAt: supabaseUser.created_at,
        },
        wallet,
        requiresEmailConfirmation: !supabaseUser.email_confirmed_at || false,
      };

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign up failed',
      };
    }
  }

  private validateSignUpRequest(request: SignUpRequest): void {
    if (!request.email || !request.phone || !request.password) {
      throw new Error('Email, phone, and password are required');
    }

    if (!request.firstName || !request.lastName) {
      throw new Error('First name and last name are required');
    }

    if (!request.country || !request.currency) {
      throw new Error('Country and currency are required');
    }

    if (request.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Email validation temporarily deactivated - using express-validator isEmail() instead
    // const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // if (!emailRegex.test(request.email)) {
    //   throw new Error('Invalid email address');
    // }

    // Phone validation
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(request.phone) || request.phone.length < 10) {
      throw new Error('Invalid phone number');
    }
  }

  private async createWalletWithAddresses(userId: string, tokens: SupportedToken[]): Promise<Wallet> {
    // Create wallet
    const wallet = Wallet.create(userId, crypto.randomUUID());

    // For each supported token, create addresses and store in vault
    for (const token of tokens) {
      await this.createTokenAddresses(wallet, token);
    }

    // Save wallet to database
    return await this.walletRepository.save(wallet);
  }

  private async createTokenAddresses(wallet: Wallet, token: SupportedToken): Promise<void> {
    // Generate addresses for each token using key derivation
    const addresses = await this.generateTokenAddresses(wallet.walletId, token.symbol);

    // Store addresses and private keys in vault
    await this.vaultService.storeWalletKeys(wallet.walletId, token.symbol, addresses);
  }

  private async generateTokenAddresses(_walletId: string, tokenSymbol: string): Promise<any[]> {
    // This would integrate with actual crypto libraries for key derivation
    // For now, returning mock data structure
    return [
      {
        address: `mock_${tokenSymbol}_address_1`,
        privateKey: `mock_${tokenSymbol}_private_key_1`,
        derivationIndex: 0,
      },
    ];
  }

  private async sendWelcomeNotifications(supabaseUser: any, userData: SignUpData): Promise<void> {
    const fullName = `${userData.firstName} ${userData.lastName}`;

    // Send welcome email
    await this.notificationService.sendEmailWelcome(supabaseUser.email, fullName);

    // Send welcome SMS
    await this.notificationService.sendSMSWelcome(userData.phone, fullName);
  }
} 