import { BlockchainListener, DepositEvent, BlockchainListenerConfig } from './blockchain-listener';
import logger from '../../../shared/logging';

export class CardanoListener implements BlockchainListener {
  private isListenerRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private config: BlockchainListenerConfig;
  private lastCheckedBlocks: Map<string, number> = new Map();

  constructor(
    config: BlockchainListenerConfig,
    private onDeposit: (event: DepositEvent) => Promise<void>,
    private getUserAddresses: (tokenSymbol: string) => Promise<string[]>
  ) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isListenerRunning) {
      logger.info('Cardano listener already running');
      return;
    }

    try {
      logger.info('Starting Cardano listener...');
      
      // Cardano uses polling approach with Blockfrost API
      this.pollingInterval = setInterval(async () => {
        try {
          await this.checkForNewDeposits();
        } catch (error) {
          logger.error('Error checking Cardano deposits:', error);
        }
      }, this.config.pollingInterval || 120000); // Default 2 minutes

      this.isListenerRunning = true;
      logger.info('Cardano listener started successfully');
    } catch (error) {
      logger.error('Failed to start Cardano listener:', error);
      throw error;
    }
  }

  private async checkForNewDeposits() {
    try {
      const userAddresses = await this.getUserAddresses('ADA');
      
      if (userAddresses.length === 0) {
        logger.debug('No ADA addresses found');
        return;
      }

      for (const address of userAddresses) {
        try {
          await this.checkAddressForDeposits(address);
        } catch (error) {
          logger.error(`Error checking deposits for ADA address ${address}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking for new Cardano deposits:', error);
    }
  }

  private async checkAddressForDeposits(address: string) {
    try {
      const apiKey = this.config.apiKey || process.env['BLOCKFROST_API_KEY'];
      const network = process.env['WALLET_NETWORK'] === 'mainnet' ? 'mainnet' : 'testnet';
      
      const baseUrl = `https://cardano-${network}.blockfrost.io/api/v0`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['project_id'] = apiKey;
      }

      // Get address transactions
      const txUrl = `${baseUrl}/addresses/${address}/transactions`;
      const response = await fetch(txUrl, { headers });
      
      if (!response.ok) {
        if (response.status === 404) {
          logger.debug(`No transactions found for ADA address ${address}`);
          return;
        }
        throw new Error(`Blockfrost API error: ${response.status} ${response.statusText}`);
      }

      const transactions = await response.json() as any;
      
      if (Array.isArray(transactions)) {
        for (const tx of transactions) {
          await this.processCardanoTransaction(address, tx, baseUrl, headers);
        }
      }
    } catch (error) {
      logger.error(`Error fetching transactions for ADA address ${address}:`, error);
    }
  }

  private async processCardanoTransaction(address: string, tx: any, baseUrl: string, headers: Record<string, string>) {
    try {
      // Get transaction details
      const txUrl = `${baseUrl}/txs/${tx.tx_hash}`;
      const txResponse = await fetch(txUrl, { headers });
      
      if (!txResponse.ok) {
        logger.error(`Failed to fetch transaction details for ${tx.tx_hash}`);
        return;
      }

      const txDetails = await txResponse.json() as any;
      
      // Check if this transaction sends ADA to our address
      const outputs = txDetails.outputs || [];
      let totalReceived = 0;
      let fromAddress = 'unknown';

      for (const output of outputs) {
        if (output.address === address) {
          // Find ADA amount in the output
          const adaAmount = output.amount?.find((amount: any) => amount.unit === 'lovelace');
          if (adaAmount) {
            totalReceived += parseInt(adaAmount.quantity);
          }
        }
      }

      // Get input addresses (senders)
      const inputs = txDetails.inputs || [];
      if (inputs.length > 0) {
        fromAddress = inputs[0].address;
      }

      if (totalReceived > 0) {
        // Convert lovelace to ADA
        const amount = totalReceived / 1000000;
        
        await this.onDeposit({
          txHash: tx.tx_hash,
          toAddress: address,
          fromAddress: fromAddress,
          amount: amount.toString(),
          tokenSymbol: 'ADA',
          blockNumber: tx.block_height,
          confirmations: tx.confirmations || 0,
          timestamp: new Date(tx.block_time * 1000) // Convert Unix timestamp to Date
        });

        logger.info(`Cardano deposit detected: ${amount} ADA to ${address}`);
      }
    } catch (error) {
      logger.error(`Error processing Cardano transaction ${tx.tx_hash}:`, error);
    }
  }

  async stop(): Promise<void> {
    if (!this.isListenerRunning) {
      logger.info('Cardano listener not running');
      return;
    }

    try {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      
      this.lastCheckedBlocks.clear();
      this.isListenerRunning = false;
      logger.info('Cardano listener stopped successfully');
    } catch (error) {
      logger.error('Error stopping Cardano listener:', error);
      throw error;
    }
  }

  isRunning(): boolean {
    return this.isListenerRunning;
  }

  getSupportedTokens(): string[] {
    return ['ADA'];
  }
}
