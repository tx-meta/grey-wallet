/**
 * Get Transaction Status Use Case
 * Retrieves the status and details of a specific transaction
 */

import { WalletRepository } from '../repositories/wallet-repository';
import logger from '../../shared/logging';

export interface GetTransactionStatusRequest {
  transactionId: string;
  userId: string;
}

export interface GetTransactionStatusResponse {
  success: boolean;
  data?: {
    transactionId: string;
    userId: string;
    transactionType: string;
    tokenSymbol: string;
    fiatAmount: number;
    cryptoAmount: number;
    phoneNumber: string;
    status: string;
    checkoutRequestId: string | null;
    merchantRequestId: string | null;
    mpesaReceiptNumber: string | null;
    transactionDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

export class GetTransactionStatusUseCase {
  constructor(private walletRepository: WalletRepository) {}

  async execute(request: GetTransactionStatusRequest): Promise<GetTransactionStatusResponse> {
    try {
      const { transactionId, userId } = request;

      if (!transactionId) {
        return {
          success: false,
          error: 'Transaction ID is required',
        };
      }

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required',
        };
      }

      // Get transaction from repository
      const transaction = await this.walletRepository.getTransactionById(transactionId);

      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      // Verify that the transaction belongs to the requesting user
      if (transaction.userId !== userId) {
        logger.warn('User attempted to access transaction that does not belong to them', {
          userId,
          transactionId,
          transactionUserId: transaction.userId,
        });
        
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      logger.info('Transaction status retrieved successfully', {
        transactionId,
        userId,
        status: transaction.status,
      });

      return {
        success: true,
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
          transactionType: transaction.transactionType,
          tokenSymbol: transaction.tokenSymbol,
          fiatAmount: transaction.fiatAmount,
          cryptoAmount: transaction.cryptoAmount,
          phoneNumber: transaction.phoneNumber,
          status: transaction.status,
          checkoutRequestId: transaction.checkoutRequestId,
          merchantRequestId: transaction.merchantRequestId,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          transactionDate: transaction.transactionDate,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
        },
      };
    } catch (error) {
      logger.error('Get transaction status error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: request.transactionId,
        userId: request.userId,
      });

      return {
        success: false,
        error: 'Failed to retrieve transaction status',
      };
    }
  }
} 