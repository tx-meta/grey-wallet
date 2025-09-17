import { BlockchainListener, DepositEvent } from './blockchain-listener';
import { EVMListener } from './evm-listener';
import { SolanaListener } from './solana-listener';
import { BitcoinListener } from './bitcoin-listener';
import { CardanoListener } from './cardano-listener';
// import { DepositRepository } from '../../domain/repositories/deposit-repository';
// import { WalletRepository } from '../../domain/repositories/wallet-repository';
// import { UserRepository } from '../../domain/repositories/user-repository';
// import { NotificationService } from '../../application/interfaces/notification-service';
// import { ProcessCryptoDepositUseCase } from '../../domain/use_cases/process-crypto-deposit';
import logger from '../../../shared/logging';

export class BlockchainMonitorService {
  private listeners: Map<string, BlockchainListener> = new Map();
  private processDepositUseCase: any;

  constructor(
    private walletRepository: any
  ) {
    this.processDepositUseCase = null; // Will be initialized later
    
    this.initializeListeners();
  }

  private initializeListeners() {
    // Only initialize listeners if proper environment variables are set
    const ethWsUrl = process.env['ETH_WS_RPC_URL'];
    const solanaRpcUrl = process.env['SOLANA_RPC_URL'];
    const bitcoinRpcUrl = process.env['BITCOIN_RPC_URL'];
    const cardanoRpcUrl = process.env['CARDANO_RPC_URL'];
    const blockfrostApiKey = process.env['BLOCKFROST_API_KEY'];
    const blockcypherApiKey = process.env['BLOCKCYPHER_API_KEY'];

    const INFURA_PROJECT_ID = process.env['INFURA_PROJECT_ID'] as string;

    // EVM Listener (handles ETH, USDT, USDC) - only if WebSocket URL is properly configured
    if (ethWsUrl && !ethWsUrl.includes(INFURA_PROJECT_ID)) {
      const evmListener = new EVMListener(
        {
          rpcUrl: ethWsUrl,
          requiredConfirmations: 12,
          pollingInterval: 30000
        },
        this.handleDeposit.bind(this),
        this.getUserAddresses.bind(this)
      );
      this.listeners.set('EVM', evmListener);
      logger.info('EVM listener initialized with WebSocket URL');
    } else {
      logger.warn('EVM listener skipped - ETH_WS_RPC_URL not properly configured');
    }

    // Solana Listener - only if RPC URL is configured
    if (solanaRpcUrl) {
      const solanaListener = new SolanaListener(
        {
          rpcUrl: solanaRpcUrl,
          requiredConfirmations: 32,
          pollingInterval: 30000
        },
        this.handleDeposit.bind(this),
        this.getUserAddresses.bind(this)
      );
      this.listeners.set('SOLANA', solanaListener);
      logger.info('Solana listener initialized');
    } else {
      logger.warn('Solana listener skipped - SOLANA_RPC_URL not configured');
    }

    // Bitcoin Listener - only if RPC URL and API key are configured
    if (bitcoinRpcUrl && blockcypherApiKey) {
      const bitcoinListener = new BitcoinListener(
        {
          rpcUrl: bitcoinRpcUrl,
          apiKey: blockcypherApiKey,
          requiredConfirmations: 6,
          pollingInterval: 60000
        },
        this.handleDeposit.bind(this),
        this.getUserAddresses.bind(this)
      );
      this.listeners.set('BITCOIN', bitcoinListener);
      logger.info('Bitcoin listener initialized');
    } else {
      logger.warn('Bitcoin listener skipped - BITCOIN_RPC_URL or BLOCKCYPHER_API_KEY not configured');
    }

    // Cardano Listener - only if RPC URL and API key are configured
    if (cardanoRpcUrl && blockfrostApiKey) {
      const cardanoListener = new CardanoListener(
        {
          rpcUrl: cardanoRpcUrl,
          apiKey: blockfrostApiKey,
          requiredConfirmations: 15,
          pollingInterval: 120000
        },
        this.handleDeposit.bind(this),
        this.getUserAddresses.bind(this)
      );
      this.listeners.set('CARDANO', cardanoListener);
      logger.info('Cardano listener initialized');
    } else {
      logger.warn('Cardano listener skipped - CARDANO_RPC_URL or BLOCKFROST_API_KEY not configured');
    }
  }

  async startAll(): Promise<void> {
    logger.info('Starting all blockchain listeners...');
    
    if (this.listeners.size === 0) {
      logger.warn('No blockchain listeners configured - skipping blockchain monitoring');
      return;
    }
    
    for (const [name, listener] of this.listeners) {
      try {
        await listener.start();
        logger.info(`${name} listener started successfully`);
      } catch (error) {
        logger.error(`Failed to start ${name} listener:`, error);
      }
    }
  }

  async stopAll(): Promise<void> {
    logger.info('Stopping all blockchain listeners...');
    
    for (const [name, listener] of this.listeners) {
      try {
        await listener.stop();
        logger.info(`${name} listener stopped successfully`);
      } catch (error) {
        logger.error(`Failed to stop ${name} listener:`, error);
      }
    }
  }

  async startListener(blockchainType: string): Promise<void> {
    const listener = this.listeners.get(blockchainType);
    if (!listener) {
      throw new Error(`No listener found for ${blockchainType}`);
    }
    
    try {
      await listener.start();
      logger.info(`${blockchainType} listener started successfully`);
    } catch (error) {
      logger.error(`Failed to start ${blockchainType} listener:`, error);
      throw error;
    }
  }

  async stopListener(blockchainType: string): Promise<void> {
    const listener = this.listeners.get(blockchainType);
    if (!listener) {
      throw new Error(`No listener found for ${blockchainType}`);
    }
    
    try {
      await listener.stop();
      logger.info(`${blockchainType} listener stopped successfully`);
    } catch (error) {
      logger.error(`Failed to stop ${blockchainType} listener:`, error);
      throw error;
    }
  }

  private async handleDeposit(event: DepositEvent): Promise<void> {
    try {
      logger.info('Processing deposit event', {
        txHash: event.txHash,
        tokenSymbol: event.tokenSymbol,
        amount: event.amount,
        toAddress: event.toAddress
      });

      const result = await this.processDepositUseCase.execute({
        txHash: event.txHash,
        toAddress: event.toAddress,
        fromAddress: event.fromAddress,
        amount: event.amount,
        tokenSymbol: event.tokenSymbol,
        blockNumber: event.blockNumber,
        confirmations: event.confirmations
      });

      if (!result.success) {
        logger.error('Failed to process deposit', {
          txHash: event.txHash,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error handling deposit event:', error);
    }
  }

  private async getUserAddresses(tokenSymbol: string): Promise<string[]> {
    try {
      const addresses = await this.walletRepository.getAllUserAddresses(tokenSymbol);
      return addresses.map((addr: any) => addr.address.toLowerCase());
    } catch (error) {
      logger.error(`Failed to get user addresses for ${tokenSymbol}:`, error);
      return [];
    }
  }

  getListenerStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [name, listener] of this.listeners) {
      status[name] = listener.isRunning();
    }
    return status;
  }

  getSupportedTokens(): string[] {
    const tokens: string[] = [];
    for (const listener of this.listeners.values()) {
      tokens.push(...listener.getSupportedTokens());
    }
    return [...new Set(tokens)]; // Remove duplicates
  }
}
