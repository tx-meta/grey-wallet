/**
 * Sign Up Use Case
 * Orchestrates the user registration process including wallet creation
 */

import { User } from '../entities/user';
import { Wallet } from '../entities/wallet';
import { SupportedToken } from '../entities/supported-token';
import { UserRepository } from '../repositories/user-repository';
import { WalletRepository } from '../repositories/wallet-repository';
import { TokenRepository } from '../repositories/token-repository';
import { VaultService } from '../../application/interfaces/vault-service';
import { NotificationService } from '../../application/interfaces/notification-service';
import { CryptoService } from '../../application/interfaces/crypto-service';

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
  user: User;
  wallet: Wallet;
  verificationTokens: {
    emailToken: string;
    smsToken: string;
  };
}

export interface SignUpResult {
  success: boolean;
  data?: SignUpResponse;
  error?: string;
}

export class SignUpUseCase {
  constructor(
    private userRepository: UserRepository,
    private walletRepository: WalletRepository,
    private tokenRepository: TokenRepository,
    private vaultService: VaultService,
    private notificationService: NotificationService,
    private cryptoService: CryptoService
  ) {}

  async execute(request: SignUpRequest): Promise<SignUpResult> {
    try {
      // 1. Validate input
      this.validateSignUpRequest(request);

      // 2. Check if user already exists
      const existingUser = await this.userRepository.findByEmail(request.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      const existingPhone = await this.userRepository.findByPhone(request.phone);
      if (existingPhone) {
        return {
          success: false,
          error: 'User with this phone number already exists',
        };
      }

      // 3. Hash password
      const passwordHash = await this.cryptoService.hashPassword(request.password);

      // 4. Create user
      const user = User.create({
        email: request.email.toLowerCase().trim(),
        phone: request.phone.trim(),
        passwordHash,
        firstName: request.firstName.trim(),
        lastName: request.lastName.trim(),
        country: request.country.trim(),
        currency: request.currency.toUpperCase().trim(),
      });

      // 5. Save user to database
      const savedUser = await this.userRepository.save(user);

      // 6. Get supported tokens
      const supportedTokens = await this.tokenRepository.findActiveTokens();

      // 7. Create wallet and addresses for each token
      const wallet = await this.createWalletWithAddresses(savedUser, supportedTokens);

      // 8. Generate verification tokens
      const verificationTokens = await this.generateVerificationTokens(savedUser);

      // 9. Send verification notifications
      await this.sendVerificationNotifications(savedUser, verificationTokens);

      return {
        success: true,
        data: {
          user: savedUser,
          wallet,
          verificationTokens,
        },
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
  }

  private async createWalletWithAddresses(user: User, tokens: SupportedToken[]): Promise<Wallet> {
    // Create wallet
    const wallet = Wallet.create(user.id, crypto.randomUUID());

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

  private async generateVerificationTokens(user: User): Promise<{ emailToken: string; smsToken: string }> {
    const emailToken = await this.cryptoService.generateToken();
    const smsToken = await this.cryptoService.generateNumericToken(6);

    // Store tokens temporarily (could use Redis or database)
    await this.vaultService.storeVerificationToken(user.id, 'email', emailToken);
    await this.vaultService.storeVerificationToken(user.id, 'sms', smsToken);

    return { emailToken, smsToken };
  }

  private async sendVerificationNotifications(user: User, tokens: { emailToken: string; smsToken: string }): Promise<void> {
    // Send email verification
    await this.notificationService.sendEmailVerification(user.email, tokens.emailToken, user.fullName);

    // Send SMS verification
    await this.notificationService.sendSMSVerification(user.phone, tokens.smsToken);
  }
} 