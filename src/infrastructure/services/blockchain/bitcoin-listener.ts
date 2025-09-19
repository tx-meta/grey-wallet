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
      // Validate Bitcoin address format first
      if (!this.isValidBitcoinAddress(address)) {
        logger.warn(`Invalid Bitcoin address format: ${address}`);
        return;
      }

      // Use BlockCypher API to get address information
      const apiKey = this.config.apiKey || process.env['BLOCKCYPHER_API_KEY'];
      const network = process.env['WALLET_NETWORK'] === 'mainnet' ? 'main' : 'test3';
      
      // Use the basic address endpoint which includes transaction references
      // This is more reliable than the /txs endpoint
      let url = `https://api.blockcypher.com/v1/btc/${network}/addrs/${address}`;
      const params = [];
      
      if (apiKey) {
        params.push(`token=${apiKey}`);
      }
      
      // Limit to recent transactions to avoid large responses
      params.push('limit=50');
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      logger.debug(`Fetching Bitcoin address info from: ${url.replace(/token=[^&]+/, 'token=***')}`);

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BlockCypher API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as any;
      
      // Process transaction references instead of full transactions
      if (data.txrefs && Array.isArray(data.txrefs)) {
        logger.debug(`Found ${data.txrefs.length} transaction references for address ${address}`);
        for (const txref of data.txrefs) {
          // Only process incoming transactions (where this address received funds)
          if (txref.tx_output_n >= 0) {
            await this.processBitcoinTransactionRef(address, txref);
          }
        }
      } else {
        logger.debug(`No transaction references found for address ${address}`);
      }
    } catch (error) {
      logger.error(`Error fetching transactions for BTC address ${address}:`, error);
    }
  }

  private isValidBitcoinAddress(address: string): boolean {
    // Check for minimum length and basic format
    if (!address || address.length < 26 || address.length > 62) {
      return false;
    }

    // Basic Bitcoin address validation
    // Mainnet addresses: Legacy (1...), SegWit (3...), Bech32 (bc1...)
    // Testnet addresses: Legacy (m..., n...), SegWit (2...), Bech32 (tb1...)
    const mainnetRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
    const testnetRegex = /^[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$|^tb1[a-z0-9]{39,59}$/;
    
    const isValid = mainnetRegex.test(address) || testnetRegex.test(address);
    
    if (!isValid) {
      logger.warn(`Bitcoin address validation failed for: ${address} (length: ${address.length})`);
    }
    
    return isValid;
  }

  private async processBitcoinTransactionRef(address: string, txref: any) {
    try {
      // txref contains: tx_hash, block_height, tx_input_n, tx_output_n, value, ref_balance, confirmations, confirmed
      
      // Skip if this is not an incoming transaction (tx_output_n should be >= 0 for received funds)
      if (txref.tx_output_n < 0) {
        return;
      }

      // Check if we've already processed this transaction
      const lastProcessedBlock = this.lastCheckedBlocks.get(address) || 0;
      if (txref.block_height && txref.block_height <= lastProcessedBlock) {
        return; // Already processed
      }

      // Convert satoshis to BTC
      const amount = txref.value / 100000000;
      
      if (amount > 0) {
        // For transaction references, we don't have sender address immediately
        // We could fetch full transaction details if needed, but for now use 'unknown'
        const fromAddress = 'unknown';
        
        await this.onDeposit({
          txHash: txref.tx_hash,
          toAddress: address,
          fromAddress: fromAddress,
          amount: amount.toString(),
          tokenSymbol: 'BTC',
          blockNumber: txref.block_height,
          confirmations: txref.confirmations || 0,
          timestamp: new Date(txref.confirmed || Date.now())
        });

        logger.info(`Bitcoin deposit detected: ${amount} BTC to ${address} (tx: ${txref.tx_hash})`);
        
        // Update last processed block
        if (txref.block_height) {
          this.lastCheckedBlocks.set(address, txref.block_height);
        }
      }
    } catch (error) {
      logger.error(`Error processing Bitcoin transaction reference ${txref.tx_hash}:`, error);
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
