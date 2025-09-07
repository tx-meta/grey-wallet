/**
 * Treasury Service Interface
 * Manages exchange treasury balances and audit trail
 */

export interface TreasuryService {
  // Get treasury account balance
  getBalance(accountType: 'CRYPTO' | 'FIAT', assetSymbol: string): Promise<number>;
  
  // Process treasury transactions (async with retry)
  processTransaction(request: TreasuryTransactionRequest): Promise<void>;
  
  // Get treasury transaction history
  getTransactionHistory(accountType?: string, assetSymbol?: string, limit?: number): Promise<TreasuryTransactionRecord[]>;
  
  // Get all treasury balances
  getAllBalances(): Promise<TreasuryBalance[]>;
}

export interface TreasuryTransactionRequest {
  userTransactionId: string;
  transactionType: 'ON_RAMP' | 'OFF_RAMP' | 'PAYMENT';
  movements: TreasuryMovement[];
}

export interface TreasuryMovement {
  accountType: 'CRYPTO' | 'FIAT';
  assetSymbol: string;
  amount: number; // Positive = credit, Negative = debit
  description: string;
}

export interface TreasuryTransactionRecord {
  id: string;
  userTransactionId: string | null;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  createdAt: Date;
  treasuryAccount: {
    accountType: string;
    assetSymbol: string;
  };
}

export interface TreasuryBalance {
  accountType: 'CRYPTO' | 'FIAT';
  assetSymbol: string;
  balance: number;
  reservedBalance: number;
}
