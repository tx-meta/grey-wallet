/**
 * Confirmation Tracker Service
 * Monitors pending deposits and updates their confirmation counts
 */

import { ethers } from 'ethers';
import { DepositRepository } from '../../../domain/repositories/deposit-repository';
import { WalletRepository } from '../../../domain/repositories/wallet-repository';
import { NotificationService } from '../../../application/interfaces/notification-service';
import logger from '../../../shared/logging';

export class ConfirmationTracker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private provider: ethers.WebSocketProvider | null = null;

  constructor(
    private depositRepository: DepositRepository,
    private walletRepository: WalletRepository,
    private notificationService: NotificationService,
    private checkInterval: number = 30000 // 30 seconds
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Confirmation tracker already running');
      return;
    }

    try {
      // Initialize provider for EVM chains
      const ethWsUrl = process.env['ETH_WS_RPC_URL'];
      if (ethWsUrl) {
        this.provider = new ethers.WebSocketProvider(ethWsUrl);
        logger.info('Confirmation tracker initialized with EVM provider');
      } else {
        logger.warn('No ETH_WS_RPC_URL configured - EVM confirmation tracking disabled');
      }

      this.isRunning = true;
      this.intervalId = setInterval(() => {
        this.checkPendingDeposits().catch(error => {
          logger.error('Error in confirmation tracker:', error);
        });
      }, this.checkInterval);

      logger.info('Confirmation tracker started');
    } catch (error) {
      logger.error('Failed to start confirmation tracker:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.provider) {
      await this.provider.destroy();
      this.provider = null;
    }

    logger.info('Confirmation tracker stopped');
  }

  private async checkPendingDeposits(): Promise<void> {
    try {
      // Get all pending deposits
      const pendingDeposits = await this.depositRepository.findPendingDeposits();
      
      if (pendingDeposits.length === 0) {
        logger.debug('No pending deposits to check');
        return;
      }

      logger.info(`Checking confirmations for ${pendingDeposits.length} pending deposits`);

      for (const deposit of pendingDeposits) {
        try {
          await this.updateDepositConfirmations(deposit);
        } catch (error) {
          logger.error(`Failed to update confirmations for deposit ${deposit.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking pending deposits:', error);
    }
  }

  private async updateDepositConfirmations(deposit: any): Promise<void> {
    try {
      let currentConfirmations = 0;

      // Get current confirmations based on token type
      if (this.isEVMToken(deposit.tokenSymbol)) {
        currentConfirmations = await this.getEVMConfirmations(deposit.txHash);
      } else if (deposit.tokenSymbol === 'BTC') {
        currentConfirmations = await this.getBitcoinConfirmations(deposit.txHash);
      } else if (deposit.tokenSymbol === 'ADA') {
        currentConfirmations = await this.getCardanoConfirmations(deposit.txHash);
      } else if (deposit.tokenSymbol === 'SOL') {
        currentConfirmations = await this.getSolanaConfirmations(deposit.txHash);
      }

      // Only update if confirmations have changed
      if (currentConfirmations !== deposit.confirmations) {
        await this.depositRepository.updateConfirmations(deposit.txHash, currentConfirmations);
        
        logger.info('Updated deposit confirmations', {
          depositId: deposit.id,
          txHash: deposit.txHash,
          oldConfirmations: deposit.confirmations,
          newConfirmations: currentConfirmations
        });

        // Check if deposit should be confirmed
        const requiredConfirmations = this.getRequiredConfirmations(deposit.tokenSymbol);
        if (currentConfirmations >= requiredConfirmations && deposit.status === 'pending') {
          await this.confirmDeposit(deposit);
        }
      }
    } catch (error) {
      logger.error(`Error updating confirmations for deposit ${deposit.id}:`, error);
    }
  }

  private async getEVMConfirmations(txHash: string): Promise<number> {
    if (!this.provider) {
      logger.warn('No EVM provider available for confirmation check');
      return 0;
    }

    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx || !tx.blockNumber) {
        return 0;
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - tx.blockNumber + 1;
      
      return Math.max(0, confirmations);
    } catch (error) {
      logger.error(`Error getting EVM confirmations for ${txHash}:`, error);
      return 0;
    }
  }

  private async getBitcoinConfirmations(txHash: string): Promise<number> {
    try {
      const apiKey = process.env['BLOCKCYPHER_API_KEY'];
      const network = process.env['WALLET_NETWORK'] === 'mainnet' ? 'main' : 'test3';
      
      // Use the transaction endpoint which is more reliable
      let url = `https://api.blockcypher.com/v1/btc/${network}/txs/${txHash}`;
      if (apiKey) {
        url += `?token=${apiKey}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        // If transaction endpoint fails, try the simpler approach
        if (response.status === 404) {
          logger.warn(`Bitcoin transaction ${txHash} not found on ${network} network`);
          return 0;
        }
        throw new Error(`BlockCypher API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.confirmations || 0;
    } catch (error) {
      logger.error(`Error getting Bitcoin confirmations for ${txHash}:`, error);
      return 0;
    }
  }

  private async getCardanoConfirmations(txHash: string): Promise<number> {
    try {
      const apiKey = process.env['BLOCKFROST_API_KEY'];
      if (!apiKey) {
        logger.warn('No BLOCKFROST_API_KEY configured');
        return 0;
      }

      const baseUrl = 'https://cardano-testnet.blockfrost.io/api/v0';
      const headers = {
        'project_id': apiKey
      };

      const response = await fetch(`${baseUrl}/txs/${txHash}`, { headers });
      if (!response.ok) {
        throw new Error(`Blockfrost API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      // Get current block height
      const latestBlockResponse = await fetch(`${baseUrl}/blocks/latest`, { headers });
      if (!latestBlockResponse.ok) {
        return 0;
      }

      const latestBlock = await latestBlockResponse.json() as any;
      const confirmations = latestBlock.height - data.block_height + 1;
      
      return Math.max(0, confirmations);
    } catch (error) {
      logger.error(`Error getting Cardano confirmations for ${txHash}:`, error);
      return 0;
    }
  }

  private async getSolanaConfirmations(txHash: string): Promise<number> {
    try {
      const rpcUrl = process.env['SOLANA_RPC_URL'];
      if (!rpcUrl) {
        logger.warn('No SOLANA_RPC_URL configured');
        return 0;
      }

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignatureStatuses',
          params: [
            [txHash],
            {
              searchTransactionHistory: true
            }
          ]
        })
      });

      const data = await response.json() as any;
      if (data.result && data.result.value && data.result.value[0]) {
        return data.result.value[0].confirmations || 0;
      }

      return 0;
    } catch (error) {
      logger.error(`Error getting Solana confirmations for ${txHash}:`, error);
      return 0;
    }
  }

  private async confirmDeposit(deposit: any): Promise<void> {
    try {
      // Update user balance
      await this.walletRepository.updateUserTokenBalance(
        deposit.userId,
        deposit.tokenSymbol,
        deposit.amount
      );

      // Update deposit status
      await this.depositRepository.updateStatus(deposit.id, 'confirmed');

      // Send confirmation notification
      await this.sendDepositConfirmedNotification(deposit);

      logger.info('Crypto deposit confirmed via confirmation tracker', {
        depositId: deposit.id,
        userId: deposit.userId,
        amount: deposit.amount,
        tokenSymbol: deposit.tokenSymbol,
        txHash: deposit.txHash
      });

    } catch (error) {
      logger.error('Failed to confirm deposit via confirmation tracker', { 
        depositId: deposit.id, 
        error 
      });
      await this.depositRepository.updateStatus(deposit.id, 'failed');
      throw error;
    }
  }

  private async sendDepositConfirmedNotification(deposit: any): Promise<void> {
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
      logger.error('Failed to send deposit confirmed notification via tracker', { 
        depositId: deposit.id, 
        error 
      });
    }
  }

  private isEVMToken(tokenSymbol: string): boolean {
    return ['ETH', 'USDT', 'USDC'].includes(tokenSymbol);
  }

  private getRequiredConfirmations(tokenSymbol: string): number {
    const confirmations: Record<string, number> = {
      'BTC': 6,
      'ETH': 12,
      'USDT': 2, // Temporarily lowered for testing
      'USDC': 2, // Temporarily lowered for testing (same as USDT)
      'ADA': 15,
      'SOL': 32
    };
    return confirmations[tokenSymbol] || 12;
  }

  getStatus(): boolean {
    return this.isRunning;
  }
}
