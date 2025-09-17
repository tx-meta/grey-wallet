import { BlockchainListener, DepositEvent, BlockchainListenerConfig } from './blockchain-listener';
import logger from '../../../shared/logging';

export class BitcoinListener implements BlockchainListener {
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
      logger.info('Bitcoin listener already running');
      return;
    }

    try {
      logger.info('Starting Bitcoin listener...');
      
      // Bitcoin doesn't have WebSocket support like Ethereum
      // So we use polling approach with BlockCypher API
      this.pollingInterval = setInterval(async () => {
        try {
          await this.checkForNewDeposits();
        } catch (error) {
          logger.error('Error checking Bitcoin deposits:', error);
        }
      }, this.config.pollingInterval || 60000); // Default 1 minute

      this.isListenerRunning = true;
      logger.info('Bitcoin listener started successfully');
    } catch (error) {
      logger.error('Failed to start Bitcoin listener:', error);
      throw error;
    }
  }

  private async checkForNewDeposits() {
    try {
      const userAddresses = await this.getUserAddresses('BTC');
      
      if (userAddresses.length === 0) {
        logger.debug('No BTC addresses found');
        return;
      }

      for (const address of userAddresses) {
        try {
          await this.checkAddressForDeposits(address);
        } catch (error) {
          logger.error(`Error checking deposits for BTC address ${address}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking for new Bitcoin deposits:', error);
    }
  }

  private async checkAddressForDeposits(address: string) {
    try {
      // Use BlockCypher API to get address transactions
      const apiKey = this.config.apiKey || process.env['BLOCKCYPHER_API_KEY'];
      const network = process.env['WALLET_NETWORK'] === 'mainnet' ? 'main' : 'test3';
      
      const url = `https://api.blockcypher.com/v1/btc/${network}/addrs/${address}/txs`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`BlockCypher API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (data.txs && Array.isArray(data.txs)) {
        for (const tx of data.txs) {
          await this.processBitcoinTransaction(address, tx);
        }
      }
    } catch (error) {
      logger.error(`Error fetching transactions for BTC address ${address}:`, error);
    }
  }

  private async processBitcoinTransaction(address: string, tx: any) {
    try {
      // Check if this transaction sends BTC to our address
      const outputs = tx.outputs || [];
      let totalReceived = 0;
      let fromAddress = 'unknown';

      for (const output of outputs) {
        if (output.addresses && output.addresses.includes(address)) {
          totalReceived += output.value;
        }
      }

      // Get input addresses (senders)
      const inputs = tx.inputs || [];
      if (inputs.length > 0 && inputs[0].addresses) {
        fromAddress = inputs[0].addresses[0];
      }

      if (totalReceived > 0) {
        // Convert satoshis to BTC
        const amount = totalReceived / 100000000;
        
        await this.onDeposit({
          txHash: tx.hash,
          toAddress: address,
          fromAddress: fromAddress,
          amount: amount.toString(),
          tokenSymbol: 'BTC',
          blockNumber: tx.block_height,
          confirmations: tx.confirmations || 0,
          timestamp: new Date(tx.received)
        });

        logger.info(`Bitcoin deposit detected: ${amount} BTC to ${address}`);
      }
    } catch (error) {
      logger.error(`Error processing Bitcoin transaction ${tx.hash}:`, error);
    }
  }

  async stop(): Promise<void> {
    if (!this.isListenerRunning) {
      logger.info('Bitcoin listener not running');
      return;
    }

    try {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      
      this.lastCheckedBlocks.clear();
      this.isListenerRunning = false;
      logger.info('Bitcoin listener stopped successfully');
    } catch (error) {
      logger.error('Error stopping Bitcoin listener:', error);
      throw error;
    }
  }

  isRunning(): boolean {
    return this.isListenerRunning;
  }

  getSupportedTokens(): string[] {
    return ['BTC'];
  }
}
