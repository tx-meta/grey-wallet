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
import { TreasuryService } from '../application/interfaces/treasury-service';
import { B2BPaymentService } from '../application/interfaces/b2b-payment-service';
import { DepositRepository } from '../domain/repositories/deposit-repository';

// Import implementations
import { MockUserRepository } from './repositories/mock-user-repository';
import { MockWalletRepository } from './repositories/mock-wallet-repository';
import { MockTokenRepository } from './repositories/mock-token-repository';
import { MockTermsOfServiceRepository } from './repositories/mock-terms-of-service-repository';
import { MockDepositRepository } from './repositories/mock-deposit-repository';
import { PrismaDepositRepository } from './repositories/prisma-deposit-repository';

import { HashiCorpVaultService } from './services/hashicorp-vault-service';
import { MockNotificationService } from './services/mock-notification-service';
import { MockCryptoService } from './services/mock-crypto-service';
import { MpesaPaymentService } from './services/mpesa-payment-service';
import { CryptoQuoteServiceImpl } from './services/crypto-quote-service';
import { TreasuryServiceImpl } from './services/treasury-service';
import { B2BPaymentServiceImpl } from './services/b2b-payment-service';
import { BlockchainMonitorService } from './services/blockchain/blockchain-monitor-service';
import prisma from './database/prisma-client';

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
import { GetCryptoQuoteUseCase } from '../domain/use_cases/get-crypto-quote';
import { GetSellCryptoQuoteUseCase } from '../domain/use_cases/get-sell-crypto-quote';
import { FinalizeCryptoSaleUseCase } from '../domain/use_cases/finalize-crypto-sale';
import { GetBuyCryptoQuoteUseCase } from '../domain/use_cases/get-buy-crypto-quote';
import { FinalizeCryptoPurchaseUseCase } from '../domain/use_cases/finalize-crypto-purchase';
import { DeleteUserAccountUseCase } from '../domain/use_cases/delete-user-account';
import { CreateB2BPaymentQuoteUseCase } from '../domain/use_cases/create-b2b-payment-quote';
import { FinalizeB2BPaymentUseCase } from '../domain/use_cases/finalize-b2b-payment';
import { ProcessCryptoDepositUseCase } from '../domain/use_cases/process-crypto-deposit';
import { GetDepositHistoryUseCase } from '../domain/use_cases/get-deposit-history';
import { GetUserAddressesUseCase } from '../domain/use_cases/get-user-addresses';

// Import controllers
import { AuthController } from '../presentation/controllers/auth-controller';
import { WalletController } from '../presentation/controllers/wallet-controller';
import { PhoneVerificationController } from '../presentation/controllers/phone-verification-controller';
import { PaymentController } from '../presentation/controllers/payment-controller';
import { TermsController } from '../presentation/controllers/terms-controller';
import { CryptoQuoteController } from '../presentation/controllers/crypto-quote-controller';
import { SellCryptoController } from '../presentation/controllers/sell-crypto-controller';
import { BuyCryptoController } from '../presentation/controllers/buy-crypto-controller';
import { B2BPaymentController } from '../presentation/controllers/b2b-payment-controller';
import { DepositController } from '../presentation/controllers/deposit-controller';
import { BlockchainWebhookController } from '../presentation/controllers/blockchain-webhook-controller';

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
    this.services.set('DepositRepository', new MockDepositRepository());

    // Initialize mock services (except VaultService - always use real HashiCorp Vault)
    this.services.set('NotificationService', new MockNotificationService());
    this.services.set('CryptoService', new MockCryptoService());
    this.services.set('CryptoQuoteService', new CryptoQuoteServiceImpl());
    this.services.set('TreasuryService', new TreasuryServiceImpl(prisma));
    this.services.set('B2BPaymentService', new B2BPaymentServiceImpl(this.services.get('CryptoQuoteService')));
    
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

    try {
      this.services.set('DepositRepository', new PrismaDepositRepository(prisma));
      console.log('✅ DepositRepository initialized with real implementation');
    } catch (error) {
      console.warn('⚠️  Real DepositRepository not available, using mock');
      this.services.set('DepositRepository', new MockDepositRepository());
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
    this.services.set('CryptoQuoteService', new CryptoQuoteServiceImpl());
    this.services.set('TreasuryService', new TreasuryServiceImpl(prisma));
    this.services.set('B2BPaymentService', new B2BPaymentServiceImpl(this.services.get('CryptoQuoteService')));
    
    // Initialize Blockchain Monitor Service
    this.services.set('BlockchainMonitorService', new BlockchainMonitorService(
      this.services.get('WalletRepository')
    ));
    console.log('✅ BlockchainMonitorService initialized');
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

    if (!this.services.has('DeleteUserAccountUseCase')) {
      this.services.set('DeleteUserAccountUseCase', new DeleteUserAccountUseCase(
        this.services.get('UserRepository')
      ));
    }

    if (!this.services.has('AuthController')) {
      this.services.set('AuthController', new AuthController(
        this.services.get('SignUpUseCase'),
        this.services.get('SignInUseCase'),
        this.services.get('DeleteUserAccountUseCase'),
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
        this.services.get('ProcessPaymentCallbackUseCase'),
        this.services.get('GetTransactionStatusUseCase')
      ));
    }

    return this.get<PaymentController>('PaymentController');
  }

  public getCryptoQuoteController(): CryptoQuoteController {
    // Initialize crypto quote use case if not already done
    if (!this.services.has('GetCryptoQuoteUseCase')) {
      this.services.set('GetCryptoQuoteUseCase', new GetCryptoQuoteUseCase(
        this.services.get('CryptoQuoteService'),
        this.services.get('TokenRepository')
      ));
    }

    if (!this.services.has('CryptoQuoteController')) {
      this.services.set('CryptoQuoteController', new CryptoQuoteController(
        this.services.get('GetCryptoQuoteUseCase')
      ));
    }

    return this.get<CryptoQuoteController>('CryptoQuoteController');
  }

  public getSellCryptoController(): SellCryptoController {
    // Initialize sell crypto use cases if not already done
    if (!this.services.has('GetSellCryptoQuoteUseCase')) {
      this.services.set('GetSellCryptoQuoteUseCase', new GetSellCryptoQuoteUseCase(
        this.services.get('CryptoQuoteService'),
        this.services.get('TokenRepository'),
        this.services.get('WalletRepository')
      ));
    }

    if (!this.services.has('FinalizeCryptoSaleUseCase')) {
      this.services.set('FinalizeCryptoSaleUseCase', new FinalizeCryptoSaleUseCase(
        this.services.get('CryptoQuoteService'),
        this.services.get('WalletRepository'),
        this.services.get('UserRepository'),
        this.services.get('TokenRepository'),
        this.services.get('NotificationService'),
        this.services.get('TreasuryService')
      ));
    }

    if (!this.services.has('SellCryptoController')) {
      this.services.set('SellCryptoController', new SellCryptoController(
        this.services.get('GetSellCryptoQuoteUseCase'),
        this.services.get('FinalizeCryptoSaleUseCase')
      ));
    }

    return this.get<SellCryptoController>('SellCryptoController');
  }

  public getBuyCryptoController(): BuyCryptoController {
    // Initialize buy crypto use cases if not already done
    if (!this.services.has('GetBuyCryptoQuoteUseCase')) {
      this.services.set('GetBuyCryptoQuoteUseCase', new GetBuyCryptoQuoteUseCase(
        this.services.get('CryptoQuoteService'),
        this.services.get('TokenRepository')
      ));
    }

    if (!this.services.has('FinalizeCryptoPurchaseUseCase')) {
      this.services.set('FinalizeCryptoPurchaseUseCase', new FinalizeCryptoPurchaseUseCase(
        this.services.get('CryptoQuoteService'),
        this.services.get('WalletRepository'),
        this.services.get('UserRepository'),
        this.services.get('TokenRepository'),
        this.services.get('NotificationService'),
        this.services.get('TreasuryService')
      ));
    }

    if (!this.services.has('BuyCryptoController')) {
      this.services.set('BuyCryptoController', new BuyCryptoController(
        this.services.get('GetBuyCryptoQuoteUseCase'),
        this.services.get('FinalizeCryptoPurchaseUseCase')
      ));
    }

    return this.get<BuyCryptoController>('BuyCryptoController');
  }

  public getB2BPaymentController(): B2BPaymentController {
    // Initialize B2B payment use cases if not already done
    if (!this.services.has('CreateB2BPaymentQuoteUseCase')) {
      this.services.set('CreateB2BPaymentQuoteUseCase', new CreateB2BPaymentQuoteUseCase(
        this.services.get('B2BPaymentService'),
        this.services.get('TokenRepository'),
        this.services.get('WalletRepository')
      ));
    }

    if (!this.services.has('FinalizeB2BPaymentUseCase')) {
      this.services.set('FinalizeB2BPaymentUseCase', new FinalizeB2BPaymentUseCase(
        this.services.get('B2BPaymentService'),
        this.services.get('WalletRepository'),
        this.services.get('UserRepository'),
        this.services.get('TokenRepository'),
        this.services.get('NotificationService'),
        this.services.get('TreasuryService')
      ));
    }

    if (!this.services.has('B2BPaymentController')) {
      this.services.set('B2BPaymentController', new B2BPaymentController(
        this.services.get('CreateB2BPaymentQuoteUseCase'),
        this.services.get('FinalizeB2BPaymentUseCase')
      ));
    }

    return this.get<B2BPaymentController>('B2BPaymentController');
  }

  public getDepositController(): DepositController {
    // Initialize deposit use cases if not already done
    if (!this.services.has('GetDepositHistoryUseCase')) {
      this.services.set('GetDepositHistoryUseCase', new GetDepositHistoryUseCase(
        this.services.get('DepositRepository'),
        this.services.get('UserRepository')
      ));
    }

    if (!this.services.has('GetUserAddressesUseCase')) {
      this.services.set('GetUserAddressesUseCase', new GetUserAddressesUseCase(
        this.services.get('WalletRepository'),
        this.services.get('UserRepository')
      ));
    }

    if (!this.services.has('DepositController')) {
      this.services.set('DepositController', new DepositController(
        this.services.get('GetDepositHistoryUseCase'),
        this.services.get('GetUserAddressesUseCase')
      ));
    }

    return this.get<DepositController>('DepositController');
  }

  public getBlockchainWebhookController(): BlockchainWebhookController {
    // Initialize process crypto deposit use case if not already done
    if (!this.services.has('ProcessCryptoDepositUseCase')) {
      this.services.set('ProcessCryptoDepositUseCase', new ProcessCryptoDepositUseCase(
        this.services.get('DepositRepository'),
        this.services.get('WalletRepository'),
        this.services.get('NotificationService')
      ));
    }

    if (!this.services.has('BlockchainWebhookController')) {
      this.services.set('BlockchainWebhookController', new BlockchainWebhookController(
        this.services.get('ProcessCryptoDepositUseCase')
      ));
    }

    return this.get<BlockchainWebhookController>('BlockchainWebhookController');
  }

  public getRepositories() {
    return {
      userRepository: this.get<UserRepository>('UserRepository'),
      walletRepository: this.get<WalletRepository>('WalletRepository'),
      tokenRepository: this.get<TokenRepository>('TokenRepository'),
      termsOfServiceRepository: this.get<TermsOfServiceRepository>('TermsOfServiceRepository'),
      depositRepository: this.get<DepositRepository>('DepositRepository'),
    };
  }

  public getServices() {
    return {
      vaultService: this.get<VaultService>('VaultService'),
      notificationService: this.get<NotificationService>('NotificationService'),
      cryptoService: this.get<CryptoService>('CryptoService'),
      paymentService: this.get<MpesaPaymentService>('PaymentService'),
      treasuryService: this.get<TreasuryService>('TreasuryService'),
      b2bPaymentService: this.get<B2BPaymentService>('B2BPaymentService'),
      blockchainMonitorService: this.get<BlockchainMonitorService>('BlockchainMonitorService'),
    };
  }
}

// Export singleton instance
const containerInstance = Container.getInstance();

// Export the container with getters for easy access
export default {
  // Repositories
  get userRepository() { return containerInstance.get('UserRepository'); },
  get walletRepository() { return containerInstance.get('WalletRepository'); },
  get tokenRepository() { return containerInstance.get('TokenRepository'); },
  get termsOfServiceRepository() { return containerInstance.get('TermsOfServiceRepository'); },
  
  // Services
  get vaultService() { return containerInstance.get('VaultService'); },
  get notificationService() { return containerInstance.get('NotificationService'); },
  get cryptoService() { return containerInstance.get('CryptoService'); },
  get paymentService() { return containerInstance.get('PaymentService'); },
  get cryptoQuoteService() { return containerInstance.get('CryptoQuoteService'); },
  get supabaseAuthService() { return containerInstance.get('SupabaseAuthService'); },
  get treasuryService() { return containerInstance.get('TreasuryService'); },
  
  // Controllers
  get authController() { return containerInstance.getAuthController(); },
  get walletController() { return containerInstance.getWalletController(); },
  get phoneVerificationController() { return containerInstance.getPhoneVerificationController(); },
  get paymentController() { return containerInstance.getPaymentController(); },
  get termsController() { return containerInstance.getTermsController(); },
  get cryptoQuoteController() { return containerInstance.getCryptoQuoteController(); },
  get sellCryptoController() { return containerInstance.getSellCryptoController(); },
  get buyCryptoController() { return containerInstance.getBuyCryptoController(); },
  get b2bPaymentController() { return containerInstance.getB2BPaymentController(); },
  get depositController() { return containerInstance.getDepositController(); },
  get blockchainWebhookController() { return containerInstance.getBlockchainWebhookController(); },
  
  // Middleware
  get authMiddleware() { return containerInstance.getAuthMiddleware(); }
};

export const container = containerInstance;
