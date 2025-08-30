/**
 * Sign Up Use Case
 * Orchestrates user registration using Supabase Auth
 */

import { Wallet } from '../entities/wallet';
import { SupportedToken } from '../entities/supported-token';
import { User } from '../entities/user';
import { UserRepository } from '../repositories/user-repository';
import { WalletRepository } from '../repositories/wallet-repository';
import { TokenRepository } from '../repositories/token-repository';
import { VaultService } from '../../application/interfaces/vault-service';
import { NotificationService } from '../../application/interfaces/notification-service';
import { SupabaseAuthService, SignUpData } from '../../infrastructure/external_apis/supabase-auth';
import { generateMnemonic, encryptMnemonic, decryptMnemonic } from '../../shared/utils/crypto';
import { getDerivationStrategy } from '../derivation/DerivationRegistry';
import logger from '../../shared/logging';
import { UserErrorMessages, mapErrorToUserMessage } from '../../shared/utils/error-response';

export interface SignUpRequest {
  email: string;
  phone: string;
  password: string;
  country?: string;
  currency?: string;
  agreedToTerms: boolean;
  termsVersion: string;
}

export interface SignUpResponse {
  user: {
    id: string;
    email: string;
    country?: string;
    currency?: string;
    phone: string;
    createdAt: string;
  };
  addresses: { tokenSymbol: string; address: string }[];
  requiresEmailConfirmation: boolean;
}

export interface SignUpResult {
  success: boolean;
  data?: SignUpResponse;
  error?: string;
  code?: string;
}

export class SignUpUseCase {
  constructor(
    private supabaseAuthService: SupabaseAuthService,
    private userRepository: UserRepository,
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
        ...(request.country && { country: request.country.trim() }),
        ...(request.currency && { currency: request.currency.toUpperCase().trim() }),
      };

      const { user: supabaseUser, error: authError, isNewUser } = await this.supabaseAuthService.signUp(signUpData);

      // Check if this is an existing user first (handled gracefully by Supabase service)
      if (!isNewUser) {
        logger.warn('Sign up attempted with existing email', { email: signUpData.email });
        return {
          success: false,
          error: UserErrorMessages.EMAIL_ALREADY_EXISTS,
          code: 'USER_EXISTS',
        };
      }

      if (authError) {
        const userMessage = mapErrorToUserMessage(authError);
        logger.warn('Sign up failed with Supabase error', { 
          error: authError, 
          userMessage,
          email: signUpData.email 
        });
        
        return {
          success: false,
          error: userMessage,
          code: 'AUTH_ERROR',
        };
      }

      if (!supabaseUser) {
        logger.error('Supabase returned no user data during sign up', { email: signUpData.email });
        return {
          success: false,
          error: UserErrorMessages.SIGNUP_FAILED,
          code: 'USER_CREATION_FAILED',
        };
      }

      // 3. Create local user record for wallet management
      const localUser = User.create({
        email: signUpData.email,
        phone: signUpData.phone,
        passwordHash: 'supabase_auth_only', // Placeholder since we don't store passwords locally
        country: signUpData.country || 'Unknown',
        currency: signUpData.currency || 'USD',
        agreedToTerms: request.agreedToTerms,
        termsVersion: request.termsVersion,
      });
      
      // Override the ID and email verification status to match Supabase
      const userWithSupabaseId = new User({
        ...localUser.toJSON(),
        id: supabaseUser.id,
        isEmailVerified: !!supabaseUser.email_confirmed_at, // Sync with Supabase's status
      });
      
      try {
        await this.userRepository.save(userWithSupabaseId);
        console.log('Local user record created successfully:', userWithSupabaseId.id);
      } catch (error) {
        console.error('Failed to create local user record:', error);
        
        // Check if this is a phone number duplication error
        const errorMessage = error instanceof Error ? error.message : String(error);
        const lowerErrorMessage = errorMessage.toLowerCase();
        
        if (lowerErrorMessage.includes('users_phone_key') || 
            (lowerErrorMessage.includes('phone') && lowerErrorMessage.includes('unique constraint'))) {
          logger.warn('Sign up attempted with existing phone number', { 
            phone: signUpData.phone,
            email: signUpData.email 
          });
          return {
            success: false,
            error: UserErrorMessages.PHONE_ALREADY_EXISTS,
            code: 'USER_EXISTS',
          };
        }
        
        // Check if this is an email duplication error  
        if (lowerErrorMessage.includes('users_email_key') ||
            (lowerErrorMessage.includes('email') && lowerErrorMessage.includes('unique constraint'))) {
          logger.warn('Sign up attempted with existing email in local database', { 
            email: signUpData.email 
          });
          return {
            success: false,
            error: UserErrorMessages.EMAIL_ALREADY_EXISTS,
            code: 'USER_EXISTS',
          };
        }
        
        throw error;
      }

      // 4. Get supported tokens
      const supportedTokens = await this.tokenRepository.findActiveTokens();

      // 5. Create user addresses from pooled wallets
      const userAddresses = await this.createUserAddressesFromPooledWallets(supabaseUser.id, supportedTokens);

      // 6. Send welcome notifications
      await this.sendWelcomeNotifications(supabaseUser, signUpData);

      // 7. Send phone OTP for verification
      await this.sendPhoneOTP(supabaseUser.id);

      // 8. Prepare response
      const responseData: SignUpResponse = {
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          ...(signUpData.country && { country: signUpData.country }),
          ...(signUpData.currency && { currency: signUpData.currency }),
          phone: signUpData.phone,
          createdAt: supabaseUser.created_at,
        },
        addresses: userAddresses,
        requiresEmailConfirmation: !supabaseUser.email_confirmed_at, // Use Supabase's status
      };

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const userMessage = mapErrorToUserMessage(errorMessage);
      
      logger.error('Sign up use case error', { 
        error: errorMessage, 
        userMessage,
        email: request.email,
        fullError: error
      });
      
      // Log the full error details for debugging
      console.error('Full signup error:', error);
      
      return {
        success: false,
        error: userMessage,
        code: 'INTERNAL_ERROR',
      };
    }
  }

  private validateSignUpRequest(request: SignUpRequest): void {
    if (!request.email || !request.phone || !request.password) {
      throw new Error('Email, phone, and password are required');
    }

    if (request.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Phone validation
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(request.phone) || request.phone.length < 10) {
      throw new Error('Invalid phone number');
    }

    // Terms agreement validation
    if (!request.agreedToTerms) {
      throw new Error('User must agree to terms and conditions');
    }

    if (!request.termsVersion) {
      throw new Error('Terms version is required');
    }
  }

  private async createUserAddressesFromPooledWallets(userId: string, tokens: SupportedToken[]): Promise<{ tokenSymbol: string; address: string }[]> {
    const network = (process.env['WALLET_NETWORK'] === 'mainnet' ? 'mainnet' : 'testnet') as 'mainnet' | 'testnet';
    const userAddresses = [];

    for (const token of tokens) {
      // 1. Get or create the pooled wallet for this token
      let wallet = await this.walletRepository.findByTokenSymbol(token.symbol);
      
      if (!wallet) {
        // Create new pooled wallet for this token
        wallet = Wallet.create(token.symbol);
        wallet = await this.walletRepository.save(wallet);
        
        // Generate and store mnemonic for this wallet
        const mnemonic = generateMnemonic();
        const secret = process.env['WALLET_ENCRYPTION_SECRET'] || 'default_secret';
        const { encrypted, iv, tag } = encryptMnemonic(mnemonic, secret);
        const encryptedMnemonic = JSON.stringify({ encrypted, iv, tag });
        
        // Store in vault with token symbol as key
        await this.vaultService.storeWalletMnemonic(token.symbol, encryptedMnemonic);
      }

      // 2. Get the mnemonic for this wallet from vault
      const encryptedMnemonic = await this.vaultService.getWalletMnemonic(token.symbol);
      if (!encryptedMnemonic) {
        throw new Error(`No mnemonic found for token: ${token.symbol}`);
      }

      // 3. Decrypt the mnemonic
      const secret = process.env['WALLET_ENCRYPTION_SECRET'] || 'default_secret';
      const { encrypted, iv, tag } = JSON.parse(encryptedMnemonic);
      const mnemonic = decryptMnemonic(encrypted, iv, tag, secret);

      // 4. Get the next address index for this wallet
      const accountIndex = await this.walletRepository.getAndIncrementAddressIndex(wallet.walletId);
      
      // 5. Derive the address using the strategy
      const strategy = getDerivationStrategy(token.symbol);
      if (!strategy) {
        throw new Error(`No derivation strategy for token: ${token.symbol}`);
      }
      
      const address = await strategy.deriveAddress(mnemonic, token, network, accountIndex);
      
      // 6. Save the user address
      await this.walletRepository.addUserAddress(userId, wallet.walletId, address);
      
      userAddresses.push({
        tokenSymbol: token.symbol,
        address,
      });
    }

    return userAddresses;
  }

  private async sendWelcomeNotifications(supabaseUser: any, userData: SignUpData): Promise<void> {
    const displayName = supabaseUser.email || 'User';

    // Send welcome email
    await this.notificationService.sendEmailWelcome(supabaseUser.email, displayName);

    // Send welcome SMS
    await this.notificationService.sendSMSWelcome(userData.phone, displayName);
  }

  private async sendPhoneOTP(userId: string): Promise<void> {
    try {
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresIn = 300; // 5 minutes
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Store OTP in Vault
      await this.vaultService.storeVerificationToken(
        userId,
        'sms',
        JSON.stringify({
          otp,
          expiresAt: expiresAt.toISOString(),
          attempts: 0
        })
      );

      // Get user phone number
      const user = await this.userRepository.findById(userId);
      if (user) {
        // Send SMS OTP
        await this.notificationService.sendSMSOTP(user.phone, otp, expiresIn);
      }
    } catch (error) {
      logger.error('Failed to send phone OTP during sign-up', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Don't fail the sign-up process if OTP sending fails
    }
  }
} 