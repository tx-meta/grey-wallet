import { DepositRepository, DepositTransaction, CreateDepositRequest } from '../../domain/repositories/deposit-repository';

export class MockDepositRepository implements DepositRepository {
  private deposits: Map<string, DepositTransaction> = new Map();
  private nextId = 1;

  async create(deposit: CreateDepositRequest): Promise<DepositTransaction> {
    const id = `deposit_${this.nextId++}`;
    const now = new Date();
    
    const depositTransaction: DepositTransaction = {
      id,
      userId: deposit.userId,
      userAddress: deposit.userAddress,
      tokenSymbol: deposit.tokenSymbol,
      amount: deposit.amount,
      txHash: deposit.txHash,
      blockNumber: deposit.blockNumber ?? undefined,
      fromAddress: deposit.fromAddress,
      confirmations: deposit.confirmations,
      status: deposit.status,
      detectedAt: now,
      confirmedAt: deposit.status === 'confirmed' ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.deposits.set(id, depositTransaction);
    return depositTransaction;
  }

  async findByTxHash(txHash: string): Promise<DepositTransaction | null> {
    for (const deposit of this.deposits.values()) {
      if (deposit.txHash === txHash) {
        return deposit;
      }
    }
    return null;
  }

  async findById(id: string): Promise<DepositTransaction | null> {
    return this.deposits.get(id) || null;
  }

  async findByUserId(userId: string, limit: number = 50): Promise<DepositTransaction[]> {
    const userDeposits = Array.from(this.deposits.values())
      .filter(deposit => deposit.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    
    return userDeposits;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const deposit = this.deposits.get(id);
    if (deposit) {
      deposit.status = status;
      deposit.updatedAt = new Date();
      if (status === 'confirmed') {
        deposit.confirmedAt = new Date();
      }
    }
  }

  async updateConfirmations(txHash: string, confirmations: number): Promise<void> {
    for (const deposit of this.deposits.values()) {
      if (deposit.txHash === txHash) {
        deposit.confirmations = confirmations;
        deposit.updatedAt = new Date();
        break;
      }
    }
  }

  async findPendingDeposits(): Promise<DepositTransaction[]> {
    return Array.from(this.deposits.values())
      .filter(deposit => deposit.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findByUserAndToken(userId: string, tokenSymbol: string, limit: number = 50): Promise<DepositTransaction[]> {
    return Array.from(this.deposits.values())
      .filter(deposit => 
        deposit.userId === userId && 
        deposit.tokenSymbol.toUpperCase() === tokenSymbol.toUpperCase()
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}
