/**
 * Base interface for blockchain listeners
 * Each blockchain type (EVM, Solana, Bitcoin, Cardano) implements this interface
 */

export interface BlockchainListener {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getSupportedTokens(): string[];
}

export interface DepositEvent {
  txHash: string;
  toAddress: string;
  fromAddress: string;
  amount: string;
  tokenSymbol: string;
  blockNumber?: number;
  confirmations: number;
  timestamp: Date;
}

export interface BlockchainListenerConfig {
  rpcUrl: string;
  apiKey?: string;
  requiredConfirmations?: number;
  pollingInterval?: number; // in milliseconds
}
