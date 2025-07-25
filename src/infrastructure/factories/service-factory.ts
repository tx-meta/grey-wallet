/**
 * Service Factory
 * Creates real service implementations when available
 */

import { UserRepository } from '../../domain/repositories/user-repository';
import { WalletRepository } from '../../domain/repositories/wallet-repository';
import { TokenRepository } from '../../domain/repositories/token-repository';
import { VaultService } from '../../application/interfaces/vault-service';
import { NotificationService } from '../../application/interfaces/notification-service';
import { CryptoService } from '../../application/interfaces/crypto-service';

// Import Prisma implementations
import { PrismaUserRepository } from '../repositories/prisma-user-repository';
import { PrismaWalletRepository } from '../repositories/prisma-wallet-repository';
import { PrismaTokenRepository } from '../repositories/prisma-token-repository';

export class ServiceFactory {
  /**
   * Creates a real UserRepository implementation
   */
  static createUserRepository(): UserRepository {
    return new PrismaUserRepository();
  }

  /**
   * Creates a real WalletRepository implementation
   */
  static createWalletRepository(): WalletRepository {
    return new PrismaWalletRepository();
  }

  /**
   * Creates a real TokenRepository implementation
   */
  static createTokenRepository(): TokenRepository {
    return new PrismaTokenRepository();
  }

  /**
   * Creates a real VaultService implementation
   * TODO: Implement when HashiCorp Vault integration is ready
   */
  static createVaultService(): VaultService {
    // TODO: Return new HashiCorpVaultService() when implemented
    throw new Error('Real VaultService implementation not yet available');
  }

  /**
   * Creates a real NotificationService implementation
   * TODO: Implement when Twilio/SendGrid integration is ready
   */
  static createNotificationService(): NotificationService {
    // TODO: Return new TwilioSendGridNotificationService() when implemented
    throw new Error('Real NotificationService implementation not yet available');
  }

  /**
   * Creates a real CryptoService implementation
   * TODO: Implement when crypto libraries are integrated
   */
  static createCryptoService(): CryptoService {
    // TODO: Return new CryptoLibService() when implemented
    throw new Error('Real CryptoService implementation not yet available');
  }
} 