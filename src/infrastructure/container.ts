/**
 * Dependency Injection Container
 * Manages service instantiation and configuration
 */

import { UserRepository } from '../domain/repositories/user-repository';
import { WalletRepository } from '../domain/repositories/wallet-repository';
import { TokenRepository } from '../domain/repositories/token-repository';
import { VaultService } from '../application/interfaces/vault-service';
import { NotificationService } from '../application/interfaces/notification-service';
import { CryptoService } from '../application/interfaces/crypto-service';

// Import implementations
import { MockUserRepository } from './repositories/mock-user-repository';
import { MockWalletRepository } from './repositories/mock-wallet-repository';
import { MockTokenRepository } from './repositories/mock-token-repository';
import { MockVaultService } from './services/mock-vault-service';
import { MockNotificationService } from './services/mock-notification-service';
import { MockCryptoService } from './services/mock-crypto-service';

// Import service factory
import { ServiceFactory } from './factories/service-factory';

// Import use cases
import { SignUpUseCase } from '../domain/use_cases/sign-up';

// Import controllers
import { AuthController } from '../presentation/controllers/auth-controller';

// Import Supabase service
import { SupabaseAuthService } from './external_apis/supabase-auth';

export class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeServices();
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  private initializeServices(): void {
    const environment = process.env['NODE_ENV'] || 'development';
    const useMocks = process.env['USE_MOCKS'] === 'true' || environment === 'test';

    if (useMocks) {
      this.initializeMockServices();
    } else {
      this.initializeRealServices();
    }
  }

  private initializeMockServices(): void {
    // Initialize mock repositories
    this.services.set('UserRepository', new MockUserRepository());
    this.services.set('WalletRepository', new MockWalletRepository());
    this.services.set('TokenRepository', new MockTokenRepository());

    // Initialize mock services
    this.services.set('VaultService', new MockVaultService());
    this.services.set('NotificationService', new MockNotificationService());
    this.services.set('CryptoService', new MockCryptoService());
  }

  private initializeRealServices(): void {
    // Initialize real repositories (these are available)
    try {
      this.services.set('UserRepository', ServiceFactory.createUserRepository());
      console.log('✅ UserRepository initialized with real implementation');
    } catch (error) {
      console.warn('⚠️  Real UserRepository not available, using mock');
      this.services.set('UserRepository', new MockUserRepository());
    }

    try {
      this.services.set('WalletRepository', ServiceFactory.createWalletRepository());
      console.log('✅ WalletRepository initialized with real implementation');
    } catch (error) {
      console.warn('⚠️  Real WalletRepository not available, using mock');
      this.services.set('WalletRepository', new MockWalletRepository());
    }

    try {
      this.services.set('TokenRepository', ServiceFactory.createTokenRepository());
      console.log('✅ TokenRepository initialized with real implementation');
    } catch (error) {
      console.warn('⚠️  Real TokenRepository not available, using mock');
      this.services.set('TokenRepository', new MockTokenRepository());
    }

    // Initialize real services (these are not available yet)
    try {
      this.services.set('VaultService', ServiceFactory.createVaultService());
      console.log('✅ VaultService initialized with real implementation');
    } catch (error) {
      console.warn('⚠️  Real VaultService not available, using mock');
      this.services.set('VaultService', new MockVaultService());
    }

    try {
      this.services.set('NotificationService', ServiceFactory.createNotificationService());
      console.log('✅ NotificationService initialized with real implementation');
    } catch (error) {
      console.warn('⚠️  Real NotificationService not available, using mock');
      this.services.set('NotificationService', new MockNotificationService());
    }

    try {
      this.services.set('CryptoService', ServiceFactory.createCryptoService());
      console.log('✅ CryptoService initialized with real implementation');
    } catch (error) {
      console.warn('⚠️  Real CryptoService not available, using mock');
      this.services.set('CryptoService', new MockCryptoService());
    }
  }

  public get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found in container`);
    }
    return service as T;
  }



  public getAuthController(): AuthController {
    // Initialize Supabase services if not already done
    if (!this.services.has('SupabaseAuthService')) {
      this.services.set('SupabaseAuthService', new SupabaseAuthService());
    }

    if (!this.services.has('SignUpUseCase')) {
      this.services.set('SignUpUseCase', new SignUpUseCase(
        this.services.get('SupabaseAuthService'),
        this.services.get('UserRepository'),
        this.services.get('WalletRepository'),
        this.services.get('TokenRepository'),
        this.services.get('VaultService'),
        this.services.get('NotificationService')
      ));
    }

    if (!this.services.has('AuthController')) {
      this.services.set('AuthController', new AuthController(
        this.services.get('SignUpUseCase'),
        this.services.get('SupabaseAuthService')
      ));
    }

    return this.get<AuthController>('AuthController');
  }

  public getRepositories() {
    return {
      userRepository: this.get<UserRepository>('UserRepository'),
      walletRepository: this.get<WalletRepository>('WalletRepository'),
      tokenRepository: this.get<TokenRepository>('TokenRepository'),
    };
  }

  public getServices() {
    return {
      vaultService: this.get<VaultService>('VaultService'),
      notificationService: this.get<NotificationService>('NotificationService'),
      cryptoService: this.get<CryptoService>('CryptoService'),
    };
  }
}

// Export singleton instance
export const container = Container.getInstance(); 