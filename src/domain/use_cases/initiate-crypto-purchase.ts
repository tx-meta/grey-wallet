/**
 * Initiate Crypto Purchase Use Case
 * Handles the initial crypto purchase request and M-Pesa integration
 */

import { UserRepository } from '../repositories/user-repository';
import { WalletRepository } from '../repositories/wallet-repository';
import { TokenRepository } from '../repositories/token-repository';
import { PaymentService } from '../../application/interfaces/payment-service';
import { NotificationService } from '../../application/interfaces/notification-service';
import logger from '../../shared/logging';

export interface InitiateCryptoPurchaseRequest {
  userId: string;
  tokenSymbol: string;
  fiatAmount: number; // Amount in KES
  phoneNumber: string; // M-Pesa phone number
}

export interface InitiateCryptoPurchaseResponse {
  transactionId: string;
  checkoutRequestId: string;
  merchantRequestId: string;
  amount: number;
  tokenSymbol: string;
  cryptoAmount: number;
  exchangeRate: number;
  expiresAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface InitiateCryptoPurchaseResult {
  success: boolean;
  data?: InitiateCryptoPurchaseResponse;
  error?: string;
}

export class InitiateCryptoPurchaseUseCase {
  constructor(
    private userRepository: UserRepository,
    private walletRepository: WalletRepository,
    private tokenRepository: TokenRepository,
    private paymentService: PaymentService,
    private notificationService: NotificationService
  ) {}

  async execute(request: InitiateCryptoPurchaseRequest): Promise<InitiateCryptoPurchaseResult> {
    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Verify user exists and is verified
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!user.isPhoneVerified) {
        return {
          success: false,
          error: 'Phone number must be verified before making purchases',
        };
      }

      // 3. Verify token is supported
      const token = await this.tokenRepository.findBySymbol(request.tokenSymbol);
      if (!token || !token.isActive) {
        return {
          success: false,
          error: 'Unsupported token',
        };
      }

      // 4. Validate amount limits
      const minAmount = 1; // 10 KES minimum
      const maxAmount = 70000; // 70,000 KES maximum (M-Pesa limit)
      
      if (request.fiatAmount < minAmount || request.fiatAmount > maxAmount) {
        return {
          success: false,
          error: `Amount must be between ${minAmount} and ${maxAmount} KES`,
        };
      }

      // 5. Get current exchange rate
      const exchangeRate = await this.paymentService.getExchangeRate('KES', request.tokenSymbol);
      const cryptoAmount = request.fiatAmount / exchangeRate;

      // 6. Calculate fees
      const platformFee = this.calculatePlatformFee(request.fiatAmount);
      const totalAmount = request.fiatAmount + platformFee;

      // 7. Create transaction record
      const transactionId = await this.walletRepository.createTransaction({
        userId: request.userId,
        transactionType: 'ON_RAMP',
        tokenSymbol: request.tokenSymbol,
        fiatAmount: request.fiatAmount,
        cryptoAmount,
        exchangeRate,
        platformFee,
        totalAmount,
        phoneNumber: request.phoneNumber,
        status: 'pending'
      });

      // 8. Initiate M-Pesa payment
      const paymentResult = await this.paymentService.initiateMpesaPayment({
        amount: totalAmount,
        phoneNumber: request.phoneNumber,
        accountReference: transactionId,
        transactionDesc: `Crypto purchase - ${request.tokenSymbol}`,
        callbackUrl: `${process.env['DARAJA_STK_PUSH_RESULT_URL']}/api/payments/mpesa/callback`
      });

      if (!paymentResult.success) {
        await this.walletRepository.updateTransactionStatus(transactionId, 'failed');
        return {
          success: false,
          error: 'Failed to initiate payment',
        };
      }

      // 9. Update transaction with payment details
      const paymentDetails: any = { status: 'processing' };
      if (paymentResult.checkoutRequestId) {
        paymentDetails.checkoutRequestId = paymentResult.checkoutRequestId;
      }
      if (paymentResult.merchantRequestId) {
        paymentDetails.merchantRequestId = paymentResult.merchantRequestId;
      }
      await this.walletRepository.updateTransactionPaymentDetails(transactionId, paymentDetails);

      // 10. Send confirmation SMS
      await this.notificationService.sendSMSOTP(
        request.phoneNumber,
        `Enter your M-Pesa PIN to complete your ${request.tokenSymbol} purchase of ${cryptoAmount.toFixed(6)} for ${request.fiatAmount} KES`,
        300
      );

      logger.info('Crypto purchase initiated successfully', { 
        userId: request.userId,
        transactionId,
        tokenSymbol: request.tokenSymbol,
        fiatAmount: request.fiatAmount,
        cryptoAmount
      });

      return {
        success: true,
        data: {
          transactionId,
          checkoutRequestId: paymentResult.checkoutRequestId || '',
          merchantRequestId: paymentResult.merchantRequestId || '',
          amount: totalAmount,
          tokenSymbol: request.tokenSymbol,
          cryptoAmount,
          exchangeRate,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
          status: 'processing'
        },
      };
    } catch (error) {
      logger.error('Initiate crypto purchase use case error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId 
      });
      
      return {
        success: false,
        error: 'Failed to initiate purchase',
      };
    }
  }

  private validateRequest(request: InitiateCryptoPurchaseRequest): void {
    if (!request.userId || request.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
    if (!request.tokenSymbol || request.tokenSymbol.trim().length === 0) {
      throw new Error('Token symbol is required');
    }
    if (!request.phoneNumber || request.phoneNumber.trim().length === 0) {
      throw new Error('Phone number is required');
    }
    if (request.fiatAmount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
  }

  private calculatePlatformFee(amount: number): number {
    // 2.5% platform fee
    return amount * 0.025;
  }
} 