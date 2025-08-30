/**
 * Dependency Injection Container
 * Manages service instantiation and configuration
 */

import { UserRepository } from '../domain/repositories/user-repository';
import { WalletRepository } from '../domain/repositories/wallet-repository';
import { TokenRepository } from '../domain/repositories/token-repository';
import { TermsOfServiceRepository } from '../domain/repositories/terms-of-service-repository';
import { VaultService } from '../application/interfaces/vault-service';
import { NotificationService } from '../application/interfaces/notification-service';
import { CryptoService } from '../application/interfaces/crypto-service';

// Import implementations
import { MockUserRepository } from './repositories/mock-user-repository';
import { MockWalletRepository } from './repositories/mock-wallet-repository';
import { MockTokenRepository } from './repositories/mock-token-repository';
import { MockTermsOfServiceRepository } from './repositories/mock-terms-of-service-repository';

import { HashiCorpVaultService } from './services/hashicorp-vault-service';
import { MockNotificationService } from './services/mock-notification-service';
import { MockCryptoService } from './services/mock-crypto-service';
import { MpesaPaymentService } from './services/mpesa-payment-service';

// Import service factory
import { ServiceFactory } from './factories/service-factory';

// Import use cases
import { SignUpUseCase } from '../domain/use_cases/sign-up';
import { SignInUseCase } from '../domain/use_cases/sign-in';
import { GetWalletInfoUseCase } from '../domain/use_cases/get-wallet-info';
import { GetTokenBalanceUseCase } from '../domain/use_cases/get-token-balance';
import { GetSupportedTokensUseCase } from '../domain/use_cases/get-supported-tokens';
import { InitiateCryptoPurchaseUseCase } from '../domain/use_cases/initiate-crypto-purchase';
import { ProcessPaymentCallbackUseCase } from '../domain/use_cases/process-payment-callback';
import { GetTransactionStatusUseCase } from '../domain/use_cases/get-transaction-status';
import { SendPhoneOTPUseCase } from '../domain/use_cases/send-phone-otp';
import { VerifyPhoneOTPUseCase } from '../domain/use_cases/verify-phone-otp';
import { GetTermsOfServiceUseCase } from '../domain/use_cases/get-terms-of-service';

// Import controllers
import { AuthController } from '../presentation/controllers/auth-controller';
import { WalletController } from '../presentation/controllers/wallet-controller';
import { PhoneVerificationController } from '../presentation/controllers/phone-verification-controller';
import { PaymentController } from '../presentation/controllers/payment-controller';
import { TermsController } from '../presentation/controllers/terms-controller';

// Import Supabase service
import { SupabaseAuthService } from './external_apis/supabase-auth';

// Import middleware
import { AuthMiddleware } from '../presentation/middleware/auth';

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
    this.services.set('TermsOfServiceRepository', new MockTermsOfServiceRepository());

    // Initialize mock services (except VaultService - always use real HashiCorp Vault)
    this.services.set('NotificationService', new MockNotificationService());
    this.services.set('CryptoService', new MockCryptoService());
    
    // Always use real HashiCorp Vault service
    try {
      this.services.set('VaultService', ServiceFactory.createVaultService());
      console.log('✅ VaultService initialized with HashiCorp Vault');
    } catch (error) {
      console.error('❌ Failed to initialize HashiCorp Vault service:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('HashiCorp Vault service is required. Please ensure VAULT_URL and VAULT_TOKEN are set.');
    }
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

    try {
      this.services.set('TermsOfServiceRepository', ServiceFactory.createTermsOfServiceRepository());
      console.log('✅ TermsOfServiceRepository initialized with real implementation');
    } catch (error) {
      console.warn('⚠️  Real TermsOfServiceRepository not available, using mock');
      this.services.set('TermsOfServiceRepository', new MockTermsOfServiceRepository());
    }

    // Initialize real services
    this.services.set('VaultService', new HashiCorpVaultService());
    
    try {
      this.services.set('NotificationService', ServiceFactory.createNotificationService());
      console.log('✅ NotificationService initialized with Celcom SMS service');
    } catch (error) {
      console.warn('⚠️  Real NotificationService not available, using mock');
      this.services.set('NotificationService', new MockNotificationService());
    }
    
    this.services.set('CryptoService', new MockCryptoService());
    this.services.set('PaymentService', new MpesaPaymentService());
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

    if (!this.services.has('SignInUseCase')) {
      this.services.set('SignInUseCase', new SignInUseCase(
        this.services.get('SupabaseAuthService'),
        this.services.get('UserRepository')
      ));
    }

    if (!this.services.has('AuthController')) {
      this.services.set('AuthController', new AuthController(
        this.services.get('SignUpUseCase'),
        this.services.get('SignInUseCase'),
        this.services.get('SupabaseAuthService')
      ));
    }

    return this.get<AuthController>('AuthController');
  }

  public getWalletController(): WalletController {
    // Initialize wallet use cases if not already done
    if (!this.services.has('GetWalletInfoUseCase')) {
      this.services.set('GetWalletInfoUseCase', new GetWalletInfoUseCase(
        this.services.get('WalletRepository'),
        this.services.get('TokenRepository'),
        this.services.get('UserRepository')
      ));
    }

    if (!this.services.has('GetTokenBalanceUseCase')) {
      this.services.set('GetTokenBalanceUseCase', new GetTokenBalanceUseCase(
        this.services.get('WalletRepository'),
        this.services.get('TokenRepository'),
        this.services.get('UserRepository')
      ));
    }

    if (!this.services.has('GetSupportedTokensUseCase')) {
      this.services.set('GetSupportedTokensUseCase', new GetSupportedTokensUseCase(
        this.services.get('TokenRepository')
      ));
    }

    if (!this.services.has('WalletController')) {
      this.services.set('WalletController', new WalletController(
        this.services.get('GetWalletInfoUseCase'),
        this.services.get('GetTokenBalanceUseCase'),
        this.services.get('GetSupportedTokensUseCase')
      ));
    }

    return this.get<WalletController>('WalletController');
  }

  public getPhoneVerificationController(): PhoneVerificationController {
    // Initialize phone verification use cases if not already done
    if (!this.services.has('SendPhoneOTPUseCase')) {
      this.services.set('SendPhoneOTPUseCase', new SendPhoneOTPUseCase(
        this.services.get('UserRepository'),
        this.services.get('VaultService'),
        this.services.get('NotificationService')
      ));
    }

    if (!this.services.has('VerifyPhoneOTPUseCase')) {
      this.services.set('VerifyPhoneOTPUseCase', new VerifyPhoneOTPUseCase(
        this.services.get('UserRepository'),
        this.services.get('VaultService')
      ));
    }

    if (!this.services.has('PhoneVerificationController')) {
      this.services.set('PhoneVerificationController', new PhoneVerificationController(
        this.services.get('SendPhoneOTPUseCase'),
        this.services.get('VerifyPhoneOTPUseCase')
      ));
    }

    return this.get<PhoneVerificationController>('PhoneVerificationController');
  }

  public getAuthMiddleware(): AuthMiddleware {
    if (!this.services.has('AuthMiddleware')) {
      this.services.set('AuthMiddleware', new AuthMiddleware(
        this.services.get('SupabaseAuthService')
      ));
    }

    return this.get<AuthMiddleware>('AuthMiddleware');
  }

  public getTermsController(): TermsController {
    // Initialize terms use cases if not already done
    if (!this.services.has('GetTermsOfServiceUseCase')) {
      this.services.set('GetTermsOfServiceUseCase', new GetTermsOfServiceUseCase(
        this.services.get('TermsOfServiceRepository')
      ));
    }

    if (!this.services.has('TermsController')) {
      this.services.set('TermsController', new TermsController(
        this.services.get('GetTermsOfServiceUseCase')
      ));
    }

    return this.get<TermsController>('TermsController');
  }

  public getPaymentController(): PaymentController {
    // Initialize payment use cases if not already done
    if (!this.services.has('InitiateCryptoPurchaseUseCase')) {
      this.services.set('InitiateCryptoPurchaseUseCase', new InitiateCryptoPurchaseUseCase(
        this.services.get('UserRepository'),
        this.services.get('WalletRepository'),
        this.services.get('TokenRepository'),
        this.services.get('PaymentService'),
        this.services.get('NotificationService')
      ));
    }

    if (!this.services.has('ProcessPaymentCallbackUseCase')) {
      this.services.set('ProcessPaymentCallbackUseCase', new ProcessPaymentCallbackUseCase(
        this.services.get('WalletRepository'),
        this.services.get('PaymentService'),
        this.services.get('NotificationService')
      ));
    }

    if (!this.services.has('GetTransactionStatusUseCase')) {
      this.services.set('GetTransactionStatusUseCase', new GetTransactionStatusUseCase(
        this.services.get('WalletRepository')
      ));
    }

    if (!this.services.has('PaymentController')) {
      this.services.set('PaymentController', new PaymentController(
        this.services.get('InitiateCryptoPurchaseUseCase'),
        this.services.get('ProcessPaymentCallbackUseCase'),
        this.services.get('GetTransactionStatusUseCase')
      ));
    }

    return this.get<PaymentController>('PaymentController');
  }

  public getRepositories() {
    return {
      userRepository: this.get<UserRepository>('UserRepository'),
      walletRepository: this.get<WalletRepository>('WalletRepository'),
      tokenRepository: this.get<TokenRepository>('TokenRepository'),
      termsOfServiceRepository: this.get<TermsOfServiceRepository>('TermsOfServiceRepository'),
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