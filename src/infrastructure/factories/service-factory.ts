/**
 * Service Factory
 * Creates real service implementations when available
 */

import { UserRepository } from '../../domain/repositories/user-repository';
import { WalletRepository } from '../../domain/repositories/wallet-repository';
import { TokenRepository } from '../../domain/repositories/token-repository';
import { TermsOfServiceRepository } from '../../domain/repositories/terms-of-service-repository';
import { VaultService } from '../../application/interfaces/vault-service';
import { NotificationService } from '../../application/interfaces/notification-service';
import { CryptoService } from '../../application/interfaces/crypto-service';

// Import Prisma implementations
import { PrismaUserRepository } from '../repositories/prisma-user-repository';
import { PrismaWalletRepository } from '../repositories/prisma-wallet-repository';
import { PrismaTokenRepository } from '../repositories/prisma-token-repository';
import { PrismaTermsOfServiceRepository } from '../repositories/prisma-terms-of-service-repository';
import { HashiCorpVaultService } from '../services/hashicorp-vault-service';
import { CelcomSMSService } from '../services/celcom-sms-service';

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
   * Creates a real TermsOfServiceRepository implementation
   */
  static createTermsOfServiceRepository(): TermsOfServiceRepository {
    return new PrismaTermsOfServiceRepository();
  }

  /**
   * Creates a real VaultService implementation
   */
  static createVaultService(): VaultService {
    const vaultUrl = process.env['VAULT_URL'];
    const vaultToken = process.env['VAULT_TOKEN'];

    if (!vaultUrl || !vaultToken) {
      throw new Error('VAULT_URL and VAULT_TOKEN environment variables are required for HashiCorp Vault service');
    }

    return new HashiCorpVaultService();
  }

  /**
   * Creates a real NotificationService implementation
   */
  static createNotificationService(): NotificationService {
    return new CelcomSMSService();
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