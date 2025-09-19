import { ethers } from 'ethers';
import { BlockchainListener, DepositEvent, BlockchainListenerConfig } from './blockchain-listener';
import logger from '../../../shared/logging';

export class EVMListener implements BlockchainListener {
  private provider: ethers.WebSocketProvider | null = null;
  private contracts: Map<string, ethers.Contract> = new Map();
  private isListenerRunning = false;
  private config: BlockchainListenerConfig;

  constructor(
    config: BlockchainListenerConfig,
    private onDeposit: (event: DepositEvent) => Promise<void>,
    private getUserAddresses: (tokenSymbol: string) => Promise<string[]>
  ) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isListenerRunning) {
      logger.info('EVM listener already running');
      return;
    }

    try {
      logger.info('Starting EVM listener...');
      
      // Initialize WebSocket provider
      this.provider = new ethers.WebSocketProvider(this.config.rpcUrl);
      
      // Set up connection error handling
      this.provider.on('error', (error) => {
        logger.error('EVM WebSocket connection error:', error);
        this.handleConnectionError();
      });

      // Listen for native ETH transfers
      await this.startETHMonitoring();
      
      // Listen for ERC20 token transfers
      await this.startERC20Monitoring();

      this.isListenerRunning = true;
      logger.info('EVM listener started successfully');
    } catch (error) {
      logger.error('Failed to start EVM listener:', error);
      throw error;
    }
  }

  private async startETHMonitoring() {
    if (!this.provider) return;

    this.provider.on('block', async (blockNumber) => {
      try {
        const block = await this.provider!.getBlock(blockNumber, true);
        
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (typeof tx === 'object' && tx !== null && 'to' in tx && 'value' in tx && 'hash' in tx && 'from' in tx) {
              const txObj = tx as any;
              if (txObj.to && txObj.value.gt(0)) {
                // Check if this address belongs to any user
                const userAddresses = await this.getUserAddresses('ETH');
                if (userAddresses.includes(txObj.to.toLowerCase())) {
                  await this.onDeposit({
                    txHash: txObj.hash,
                    toAddress: txObj.to,
                    fromAddress: txObj.from,
                    amount: ethers.formatEther(txObj.value),
                    tokenSymbol: 'ETH',
                    blockNumber: blockNumber,
                    confirmations: 1,
                    timestamp: new Date()
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error processing ETH block:', error);
      }
    });
  }

  private async startERC20Monitoring() {
    if (!this.provider) return;

    const tokenConfigs = [
      { 
        symbol: 'USDT', 
        address: process.env['USDT_CONTRACT_ADDRESS'] || '0xdAC17F958D2ee523a2206206994597C13D831ec7', 
        decimals: 6 
      },
      { 
        symbol: 'USDC', 
        // Sepolia testnet USDC contract address as default
        address: process.env['USDC_CONTRACT_ADDRESS'] || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', 
        decimals: 6  // USDC uses 6 decimals, not 18
      }
    ];

    for (const config of tokenConfigs) {
      // Only skip if no address is provided, not if it's a valid contract address
      if (!config.address) {
        logger.warn(`Skipping ${config.symbol} - no contract address configured`);
        continue;
      }

      try {
        const contract = new ethers.Contract(
          config.address,
          ['event Transfer(address indexed from, address indexed to, uint256 value)'],
          this.provider
        );

        contract.on('Transfer', async (from: string, to: string, value: bigint, event: any) => {
          try {
            logger.debug('ERC20 Transfer event received', {
              from,
              to,
              value: value.toString(),
              symbol: config.symbol
            });

            // Extract transaction hash from the correct location
            const txHash = event.log?.transactionHash || event.transactionHash;
            const blockNumber = event.log?.blockNumber || event.blockNumber || 0;

            // Validate event data
            if (!txHash) {
              logger.error('Missing transaction hash in Transfer event', { 
                eventKeys: Object.keys(event),
                logKeys: event.log ? Object.keys(event.log) : 'no log object'
              });
              return;
            }

            // Check if this address belongs to any user
            const userAddresses = await this.getUserAddresses(config.symbol);
            if (userAddresses.includes(to.toLowerCase())) {
              const amount = ethers.formatUnits(value, config.decimals);
              
              logger.info('Processing USDT deposit', {
                txHash,
                from,
                to,
                amount,
                blockNumber
              });
              
              await this.onDeposit({
                txHash,
                toAddress: to,
                fromAddress: from,
                amount,
                tokenSymbol: config.symbol,
                blockNumber,
                confirmations: 1,
                timestamp: new Date()
              });
            }
          } catch (error) {
            logger.error(`Error processing ${config.symbol} transfer:`, error);
          }
        });

        this.contracts.set(config.symbol, contract);
        logger.info(`Started monitoring ${config.symbol} transfers`);
      } catch (error) {
        logger.error(`Failed to start ${config.symbol} monitoring:`, error);
      }
    }
  }

  private handleConnectionError() {
    logger.warn('EVM WebSocket connection lost, attempting to reconnect...');
    this.isListenerRunning = false;
    
    // Attempt to reconnect after 5 seconds
    setTimeout(async () => {
      try {
        await this.start();
      } catch (error) {
        logger.error('Failed to reconnect EVM listener:', error);
      }
    }, 5000);
  }

  async stop(): Promise<void> {
    if (!this.isListenerRunning) {
      logger.info('EVM listener not running');
      return;
    }

    try {
      if (this.provider) {
        this.provider.removeAllListeners();
        this.provider = null;
      }
      
      this.contracts.forEach((contract, symbol) => {
        contract.removeAllListeners();
        logger.info(`Stopped monitoring ${symbol} transfers`);
      });
      
      this.contracts.clear();
      this.isListenerRunning = false;
      logger.info('EVM listener stopped successfully');
    } catch (error) {
      logger.error('Error stopping EVM listener:', error);
      throw error;
    }
  }

  isRunning(): boolean {
    return this.isListenerRunning;
  }

  getSupportedTokens(): string[] {
    return ['ETH', 'USDT', 'USDC'];
  }
}
