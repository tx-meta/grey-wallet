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

export interface SignUpRequest {
  email: string;
  phone: string;
  password: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  currency?: string;
}

export interface SignUpResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
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
        ...(request.firstName && { firstName: request.firstName.trim() }),
        ...(request.lastName && { lastName: request.lastName.trim() }),
        ...(request.country && { country: request.country.trim() }),
        ...(request.currency && { currency: request.currency.toUpperCase().trim() }),
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

      // 3. Create local user record for wallet management
      const localUser = User.create({
        email: signUpData.email,
        phone: signUpData.phone,
        passwordHash: 'supabase_auth_only', // Placeholder since we don't store passwords locally
        country: signUpData.country || 'Unknown',
        currency: signUpData.currency || 'USD',
        firstName: signUpData.firstName || 'Unknown',
        lastName: signUpData.lastName || 'User',
      });
      
      // Override the ID and email verification status to match Supabase
      const userWithSupabaseId = new User({
        ...localUser.toJSON(),
        id: supabaseUser.id,
        isEmailVerified: !!supabaseUser.email_confirmed_at, // Sync with Supabase's status
      });
      
      try {
        await this.userRepository.save(userWithSupabaseId);
        console.log('✅ Local user record created successfully:', userWithSupabaseId.id);
      } catch (error) {
        console.error('❌ Failed to create local user record:', error);
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
          ...(signUpData.firstName && { firstName: signUpData.firstName }),
          ...(signUpData.lastName && { lastName: signUpData.lastName }),
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
    const fullName = `${userData.firstName} ${userData.lastName}`;

    // Send welcome email
    await this.notificationService.sendEmailWelcome(supabaseUser.email, fullName);

    // Send welcome SMS
    await this.notificationService.sendSMSWelcome(userData.phone, fullName);
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