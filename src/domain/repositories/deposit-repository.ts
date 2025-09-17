/**
 * Repository interface for managing deposit transactions
 */

export interface DepositTransaction {
  id: string;
  userId: string;
  userAddress: string;
  tokenSymbol: string;
  amount: number;
  txHash: string;
  blockNumber?: number;
  fromAddress: string;
  confirmations: number;
  status: string;
  detectedAt: Date;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepositRequest {
  userId: string;
  userAddress: string;
  tokenSymbol: string;
  amount: number;
  txHash: string;
  blockNumber?: number | undefined;
  fromAddress: string;
  confirmations: number;
  status: string;
}

export interface DepositRepository {
  create(deposit: CreateDepositRequest): Promise<DepositTransaction>;
  findByTxHash(txHash: string): Promise<DepositTransaction | null>;
  findById(id: string): Promise<DepositTransaction | null>;
  findByUserId(userId: string, limit?: number): Promise<DepositTransaction[]>;
  updateStatus(id: string, status: string): Promise<void>;
  updateConfirmations(txHash: string, confirmations: number): Promise<void>;
  findPendingDeposits(): Promise<DepositTransaction[]>;
  findByUserAndToken(userId: string, tokenSymbol: string, limit?: number): Promise<DepositTransaction[]>;
}
