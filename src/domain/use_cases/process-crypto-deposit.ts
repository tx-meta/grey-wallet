import { DepositRepository } from '../repositories/deposit-repository';
import { WalletRepository } from '../repositories/wallet-repository';
import { NotificationService } from '../../application/interfaces/notification-service';
import logger from '../../shared/logging';

export interface ProcessCryptoDepositRequest {
  txHash: string;
  toAddress: string;
  fromAddress: string;
  amount: string;
  tokenSymbol: string;
  blockNumber?: number;
  confirmations: number;
}

export interface ProcessCryptoDepositResult {
  success: boolean;
  depositId?: string;
  error?: string;
}

export class ProcessCryptoDepositUseCase {
  constructor(
    private depositRepository: DepositRepository,
    private walletRepository: WalletRepository,
    private notificationService: NotificationService
  ) {}

  async execute(request: ProcessCryptoDepositRequest): Promise<ProcessCryptoDepositResult> {
    try {
      logger.info('Processing crypto deposit', {
        txHash: request.txHash,
        tokenSymbol: request.tokenSymbol,
        amount: request.amount,
        toAddress: request.toAddress
      });

      // Find user by address
      const userAddresses = await this.walletRepository.getAllUserAddresses(request.tokenSymbol);
      const userAddress = userAddresses.find((addr: any) => addr.address.toLowerCase() === request.toAddress.toLowerCase());
      
      if (!userAddress) {
        logger.warn('Address not found or not associated with any user', {
          toAddress: request.toAddress,
          tokenSymbol: request.tokenSymbol
        });
        return {
          success: false,
          error: 'Address not found or not associated with any user'
        };
      }

      // Check for duplicate
      const existingDeposit = await this.depositRepository.findByTxHash(request.txHash);
      if (existingDeposit) {
        logger.info('Deposit already exists', { txHash: request.txHash });
        return {
          success: true,
          depositId: existingDeposit.id
        };
      }

      // Create deposit record
      const deposit = await this.depositRepository.create({
        userId: userAddress.userId,
        userAddress: request.toAddress,
        tokenSymbol: request.tokenSymbol,
        amount: parseFloat(request.amount),
        txHash: request.txHash,
        blockNumber: request.blockNumber || 0,
        fromAddress: request.fromAddress,
        confirmations: request.confirmations,
        status: 'pending'
      });

      // Send initial notification
      await this.sendDepositDetectedNotification(deposit);

      // Check confirmations and process if ready
      const requiredConfirmations = this.getRequiredConfirmations(request.tokenSymbol);
      if (request.confirmations >= requiredConfirmations) {
        await this.confirmDeposit(deposit.id);
      }

      logger.info('Crypto deposit processed successfully', {
        depositId: deposit.id,
        userId: userAddress.userId,
        amount: request.amount,
        tokenSymbol: request.tokenSymbol
      });

      return {
        success: true,
        depositId: deposit.id
      };

    } catch (error) {
      logger.error('Failed to process crypto deposit', {
        error: error instanceof Error ? error.message : 'Unknown error',
        txHash: request.txHash
      });

      return {
        success: false,
        error: 'Failed to process deposit'
      };
    }
  }

  private async confirmDeposit(depositId: string) {
    const deposit = await this.depositRepository.findById(depositId);
    if (!deposit || deposit.status !== 'pending') {
      return;
    }

    try {
      // Update user balance
      await this.walletRepository.updateUserTokenBalance(
        deposit.userId,
        deposit.tokenSymbol,
        deposit.amount
      );

      // Update deposit status
      await this.depositRepository.updateStatus(depositId, 'confirmed');

      // Send confirmation notification
      await this.sendDepositConfirmedNotification(deposit);

      logger.info('Crypto deposit confirmed', {
        depositId,
        userId: deposit.userId,
        amount: deposit.amount,
        tokenSymbol: deposit.tokenSymbol
      });

    } catch (error) {
      logger.error('Failed to confirm deposit', { depositId, error });
      await this.depositRepository.updateStatus(depositId, 'failed');
      await this.sendDepositFailedNotification(deposit);
      throw error;
    }
  }

  private async sendDepositDetectedNotification(deposit: any) {
    try {
      await this.notificationService.sendNotification({
        userId: deposit.userId,
        type: 'crypto_deposit_detected',
        title: 'Deposit Detected',
        message: `We've detected your ${deposit.tokenSymbol} deposit of ${deposit.amount}. Waiting for blockchain confirmations...`,
        data: {
          depositId: deposit.id,
          txHash: deposit.txHash,
          amount: deposit.amount,
          tokenSymbol: deposit.tokenSymbol,
          status: 'pending'
        }
      });
    } catch (error) {
      logger.error('Failed to send deposit detected notification', { 
        depositId: deposit.id, 
        error 
      });
    }
  }

  private async sendDepositConfirmedNotification(deposit: any) {
    try {
      await this.notificationService.sendNotification({
        userId: deposit.userId,
        type: 'crypto_deposit_confirmed',
        title: 'Deposit Confirmed',
        message: `Your ${deposit.tokenSymbol} deposit of ${deposit.amount} has been confirmed and added to your balance!`,
        data: {
          depositId: deposit.id,
          txHash: deposit.txHash,
          amount: deposit.amount,
          tokenSymbol: deposit.tokenSymbol,
          status: 'confirmed'
        }
      });
    } catch (error) {
      logger.error('Failed to send deposit confirmed notification', { 
        depositId: deposit.id, 
        error 
      });
    }
  }

  private async sendDepositFailedNotification(deposit: any) {
    try {
      await this.notificationService.sendNotification({
        userId: deposit.userId,
        type: 'crypto_deposit_failed',
        title: 'Deposit Failed',
        message: `Your ${deposit.tokenSymbol} deposit of ${deposit.amount} could not be processed. Please contact support.`,
        data: {
          depositId: deposit.id,
          txHash: deposit.txHash,
          amount: deposit.amount,
          tokenSymbol: deposit.tokenSymbol,
          status: 'failed'
        }
      });
    } catch (error) {
      logger.error('Failed to send deposit failed notification', { 
        depositId: deposit.id, 
        error 
      });
    }
  }

  private getRequiredConfirmations(tokenSymbol: string): number {
    const confirmations: Record<string, number> = {
      'BTC': 6,
      'ETH': 12,
      'USDT': 12,
      'USDC': 12,
      'ADA': 15,
      'SOL': 32
    };
    return confirmations[tokenSymbol] || 12;
  }
}
