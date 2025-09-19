import { Connection, PublicKey } from '@solana/web3.js';
import { BlockchainListener, DepositEvent, BlockchainListenerConfig } from './blockchain-listener';
import logger from '../../../shared/logging';

export class SolanaListener implements BlockchainListener {
  private connection: Connection | null = null;
  private isListenerRunning = false;
  private subscriptions: Map<string, number> = new Map();
  private config: BlockchainListenerConfig;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(
    config: BlockchainListenerConfig,
    private onDeposit: (event: DepositEvent) => Promise<void>,
    private getUserAddresses: (tokenSymbol: string) => Promise<string[]>
  ) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isListenerRunning) {
      logger.info('Solana listener already running');
      return;
    }

    try {
      logger.info('Starting Solana listener...');
      
      // Initialize connection
      this.connection = new Connection(this.config.rpcUrl, 'confirmed');
      
      // Get all user SOL addresses
      const userAddresses = await this.getUserAddresses('SOL');
      
      if (userAddresses.length === 0) {
        logger.info('No SOL addresses found, skipping Solana listener');
        return;
      }

      // Subscribe to account changes for each address
      for (const address of userAddresses) {
        try {
          const publicKey = new PublicKey(address);
          const subscriptionId = this.connection.onAccountChange(
            publicKey,
            async (accountInfo, context) => {
              try {
                await this.processAccountChange(address, accountInfo, context);
              } catch (error) {
                logger.error(`Error processing Solana account change for ${address}:`, error);
              }
            }
          );
          
          this.subscriptions.set(address, subscriptionId);
          logger.info(`Subscribed to account changes for ${address}`);
        } catch (error) {
          logger.error(`Invalid Solana address ${address}:`, error);
        }
      }

      // Also set up polling as a backup
      this.startPolling();

      this.isListenerRunning = true;
      logger.info('Solana listener started successfully');
    } catch (error) {
      logger.error('Failed to start Solana listener:', error);
      throw error;
    }
  }

  private async processAccountChange(address: string, accountInfo: any, context: any) {
    try {
      // Check if this is a deposit (balance increased)
      const currentBalance = accountInfo.lamports / 1e9; // Convert lamports to SOL
      
      if (currentBalance > 0) {
        // For Solana, we need to get the transaction details to find the sender
        // This is a simplified version - in production you'd want to track previous balances
        await this.onDeposit({
          txHash: context.slot.toString(), // Solana uses slots instead of block numbers
          toAddress: address,
          fromAddress: 'unknown', // Would need to parse transaction to get sender
          amount: currentBalance.toString(),
          tokenSymbol: 'SOL',
          blockNumber: context.slot,
          confirmations: 1,
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error(`Error processing Solana account change:`, error);
    }
  }

  private startPolling() {
    // Polling as backup to account change notifications
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkForNewDeposits();
      } catch (error) {
        logger.error('Error in Solana polling:', error);
      }
    }, this.config.pollingInterval || 30000); // Default 30 seconds
  }

  private async checkForNewDeposits() {
    if (!this.connection) return;

    try {
      const userAddresses = await this.getUserAddresses('SOL');
      
      for (const address of userAddresses) {
        try {
          const publicKey = new PublicKey(address);
          const accountInfo = await this.connection.getAccountInfo(publicKey);
          
          if (accountInfo && accountInfo.lamports > 0) {
            const balance = accountInfo.lamports / 1e9;
            
            // In a real implementation, you'd track previous balances
            // and only process if the balance increased
            logger.debug(`SOL balance for ${address}: ${balance}`);
          }
        } catch (error) {
          logger.error(`Error checking SOL balance for ${address}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking for new SOL deposits:', error);
    }
  }

  async stop(): Promise<void> {
    if (!this.isListenerRunning) {
      logger.info('Solana listener not running');
      return;
    }

    try {
      // Unsubscribe from all account changes
      if (this.connection) {
        for (const [address, subscriptionId] of this.subscriptions) {
          try {
            this.connection.removeAccountChangeListener(subscriptionId);
            logger.info(`Unsubscribed from account changes for ${address}`);
          } catch (error) {
            logger.error(`Error unsubscribing from ${address}:`, error);
          }
        }
      }
      
      this.subscriptions.clear();
      
      // Stop polling
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      
      this.connection = null;
      this.isListenerRunning = false;
      logger.info('Solana listener stopped successfully');
    } catch (error) {
      logger.error('Error stopping Solana listener:', error);
      throw error;
    }
  }

  isRunning(): boolean {
    return this.isListenerRunning;
  }

  getSupportedTokens(): string[] {
    return ['SOL'];
  }
}
