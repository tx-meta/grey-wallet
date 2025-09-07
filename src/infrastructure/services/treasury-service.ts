/**
 * Treasury Service Implementation
 * Async processing with retry mechanism for minimal user impact
 */

import { TreasuryService, TreasuryTransactionRequest, TreasuryMovement, TreasuryTransactionRecord, TreasuryBalance } from '../../application/interfaces/treasury-service';
import { PrismaClient } from '@prisma/client';
import logger from '../../shared/logging';

export class TreasuryServiceImpl implements TreasuryService {
  private retryQueue: Map<string, { request: TreasuryTransactionRequest; attempts: number }> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor(private prisma: PrismaClient) {}

  async getBalance(accountType: 'CRYPTO' | 'FIAT', assetSymbol: string): Promise<number> {
    try {
      const account = await this.prisma.treasuryAccount.findUnique({
        where: { accountType_assetSymbol: { accountType, assetSymbol } }
      });
      return account ? Number(account.balance) : 0;
    } catch (error) {
      logger.error('Failed to get treasury balance', { accountType, assetSymbol, error });
      return 0;
    }
  }

  async processTransaction(request: TreasuryTransactionRequest): Promise<void> {
    // Process asynchronously to minimize user transaction impact
    setImmediate(async () => {
      await this.executeTransaction(request);
    });
  }

  private async executeTransaction(request: TreasuryTransactionRequest, retryAttempt: number = 0): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const movement of request.movements) {
          await this.processMovement(tx, request, movement);
        }
      });

      // Remove from retry queue if successful
      this.retryQueue.delete(request.userTransactionId);
      
      logger.info('Treasury transaction processed successfully', {
        userTransactionId: request.userTransactionId,
        transactionType: request.transactionType,
        movements: request.movements.length
      });

    } catch (error) {
      logger.error('Treasury transaction failed', { 
        request, 
        error: error instanceof Error ? error.message : 'Unknown error',
        retryAttempt 
      });

      // Retry mechanism
      if (retryAttempt < this.MAX_RETRIES) {
        this.scheduleRetry(request, retryAttempt + 1);
      } else {
        // Max retries exceeded - could implement alerting here
        logger.error('Treasury transaction failed after max retries', { 
          userTransactionId: request.userTransactionId,
          maxRetries: this.MAX_RETRIES 
        });
      }
    }
  }

  private scheduleRetry(request: TreasuryTransactionRequest, attempt: number): void {
    this.retryQueue.set(request.userTransactionId, { request, attempts: attempt });
    
    setTimeout(async () => {
      const queuedItem = this.retryQueue.get(request.userTransactionId);
      if (queuedItem && queuedItem.attempts === attempt) {
        await this.executeTransaction(request, attempt);
      }
    }, this.RETRY_DELAY * attempt); // Exponential backoff
  }

  private async processMovement(tx: any, request: TreasuryTransactionRequest, movement: TreasuryMovement): Promise<void> {
    // Get or create treasury account
    const account = await tx.treasuryAccount.upsert({
      where: { 
        accountType_assetSymbol: { 
          accountType: movement.accountType, 
          assetSymbol: movement.assetSymbol 
        } 
      },
      create: { 
        accountType: movement.accountType, 
        assetSymbol: movement.assetSymbol, 
        balance: 0 
      },
      update: {}
    });

    const balanceBefore = Number(account.balance);
    const balanceAfter = balanceBefore + movement.amount;

    // Prevent negative balances (safety check)
    if (balanceAfter < 0) {
      throw new Error(`Insufficient treasury balance for ${movement.assetSymbol}. Required: ${Math.abs(movement.amount)}, Available: ${balanceBefore}`);
    }

    // Update account balance
    await tx.treasuryAccount.update({
      where: { id: account.id },
      data: { balance: balanceAfter }
    });

    // Create transaction record
    await tx.treasuryTransaction.create({
      data: {
        userTransactionId: request.userTransactionId,
        treasuryAccountId: account.id,
        transactionType: request.transactionType,
        amount: movement.amount,
        balanceBefore,
        balanceAfter,
        description: movement.description
      }
    });
  }

  async getTransactionHistory(accountType?: string, assetSymbol?: string, limit: number = 100): Promise<TreasuryTransactionRecord[]> {
    try {
      const where: any = {};
      if (accountType || assetSymbol) {
        where.treasuryAccount = {};
        if (accountType) where.treasuryAccount.accountType = accountType;
        if (assetSymbol) where.treasuryAccount.assetSymbol = assetSymbol;
      }

      const transactions = await this.prisma.treasuryTransaction.findMany({
        where,
        include: {
          treasuryAccount: {
            select: {
              accountType: true,
              assetSymbol: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return transactions.map(tx => ({
        id: tx.id,
        userTransactionId: tx.userTransactionId,
        transactionType: tx.transactionType,
        amount: Number(tx.amount),
        balanceBefore: Number(tx.balanceBefore),
        balanceAfter: Number(tx.balanceAfter),
        description: tx.description,
        createdAt: tx.createdAt,
        treasuryAccount: tx.treasuryAccount
      }));
    } catch (error) {
      logger.error('Failed to get treasury transaction history', { error });
      return [];
    }
  }

  async getAllBalances(): Promise<TreasuryBalance[]> {
    try {
      const accounts = await this.prisma.treasuryAccount.findMany({
        orderBy: [
          { accountType: 'asc' },
          { assetSymbol: 'asc' }
        ]
      });

      return accounts.map(account => ({
        accountType: account.accountType as 'CRYPTO' | 'FIAT',
        assetSymbol: account.assetSymbol,
        balance: Number(account.balance),
        reservedBalance: Number(account.reservedBalance)
      }));
    } catch (error) {
      logger.error('Failed to get all treasury balances', { error });
      return [];
    }
  }
}
